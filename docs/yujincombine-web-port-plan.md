# YujinCombine Web Port Plan

## 목적

이 프로젝트의 목표는 신규 모니터링 MVP를 만드는 것이 아니라, 기존 Android 앱 `YujinCombine`의 통신, 데이터 구조, 제어 로직, 운영 화면을 PC 웹 시스템으로 포팅하는 것이다.

즉, 웹은 Android 앱을 참고하는 수준이 아니라 아래를 최대한 그대로 계승해야 한다.

- RS485/USB 수집 흐름
- TCP 클라이언트/서버 프로토콜
- 중앙 상태 저장 구조
- 장비 상태 해석 규칙
- 제어 명령 체계
- 메인/상세/설정/로그 화면 구조

## 원본 앱 구성

### 주요 화면

- `MainActivity`
  메인 운영 화면. 장비 상태 그리드, 통합 제어, 옵션, 로그/CCTV/설정 버튼 포함.
- `SecMainActivity`
  상세 운영 화면. 공장 버전별 레이아웃 파생이 존재.
- `MonitoringActivity`
  그룹운전 설정, 정렬/인버터/운전 모드 설정 화면.
- `LogActivity`
  로그 조회.
- `LoginActivity`
  로그인/쓰기 권한 확보.
- `SettingActivity`, `SettingClientActivity`
  장비 설정/클라이언트 설정.
- `EquipActivity`, `DioOperateActivity`, `ValveOperateActivity`, `MinMaxActivity`
  장비별 상세 조작 및 범위 설정 팝업.
- `CctvWebActivity`
  CCTV 웹뷰.

### 주요 서비스

- `DataRequestService`
  USB/RS485 기반 수집 서비스.
- `TcpService`
  원격 서버와 통신하는 TCP 클라이언트 서비스.
- `SoundService`
  알람 사운드 처리.
- `WriteData`
  쓰기 명령 검증 및 재시도 확인 구조.

### 주요 런타임/스레드

- `ServerThread`
  TCP 서버 리스너.
- `EchoThread`
  서버 측 요청/응답 프로토콜 처리.
- `OperatingRunnable`
  통합운전 시작/정지/교환운전 제어.
- `CheckOperatingRunnable`
  운전 상태 점검.
- `RoomRunnable`
  파일/이력 저장.

### 주요 싱글톤/상태 저장소

- `DataValue`
  앱 전체의 중앙 상태 저장소.
  데이터맵, 장비 수, 장비 배열, 옵션 비트, 통신 에러 상태, 제어용 상태, TCP 연결 상태 등을 모두 관리.
- `EquipState`
  화면 표시용 장비 상태 래퍼.
- `EquipImageState`
  장비 이미지 상태.

## 원본 데이터 구조

### 핵심 저장 방식

Android 앱은 SQLite `yujin_table`에 모든 장비/시스템 데이터를 저장하고, 이를 `DataValue.useMapData`로 메모리에 로드해서 사용한다.

각 데이터는 `MapData` 구조를 가진다.

- `key`: 4자리 주소 문자열
- `dataType`: char/short/long/hex/mac/ip/string
- `length`: 바이트 길이
- `signed`: 부호 여부
- `value`: 현재 값
- `name`: 의미 이름

### 주소 체계

주소는 `equipNum + lowId` 조합으로 구성된다.

- 시스템 영역: `00xx`
- 네트워크/설정 영역: `01xx`
- 장비 영역: `11xx` 부터
- 보조 장비/변환 장비 영역: `E0`, `F0`, `31` 계열

`DataValue.getMapDataValue(int equipNum, int lowId)` 가 핵심 조회 함수이며, 실제 화면과 제어 로직은 이 구조에 직접 의존한다.

### 장비 상태 핵심 필드

`Utils` 기준으로 메인 화면이 직접 쓰는 값은 사실상 아래다.

- `pressure`
  `Utils.getPressure(add)`
- `temperature`
  `Utils.getTemperature(add)`
- `alarm`
  `Utils.alarmState(add, visible)`
- `error`
  `Utils.isError(add)`
- `operate_state`
  `Utils.operateState(add)`
- `mode_state`
  `Utils.modeState(add)`
- `model_name`
  `Utils.modelName(add)`
- `unload`
  `Utils.getUnLoad(add)`
- `load`
  `Utils.getLoad(add)`
- `control_pressure`
  `Utils.getControlPressure(add)`
- `rpm`
  `Utils.getRpm(add)`
- `op_time`
  `Utils.getOpTime(add)`
- `comm_state`
  `DataValue.getRequestEquipComm()`

장비에 따라 두 계열이 존재한다.

- injection 계열
- oilfree/inverter 계열

따라서 웹도 장비 타입에 따라 필드 의미가 달라지는 구조를 보존해야 한다.

## 원본 통신 구조

### RS485 / USB 수집

`DataRequestService`는 FTDI 기반 USB 시리얼을 열고 주기적으로 장비에 요청을 보낸다.

핵심 요청 타입:

- `13`
  전체 데이터 읽기
- `15`
  조정 데이터 읽기
- `20`
  쓰기

요청 포맷은 `C9 + type + equipAddress + lowAddress + len + data` 형태이며 CRC16 Modbus가 붙는다.

### TCP 클라이언트

`TcpService`는 원격 서버와 연결해 같은 프로토콜 기반으로 읽기/쓰기 요청을 전송한다.

### TCP 서버

`ServerThread` + `EchoThread`는 외부 클라이언트가 Android 장치로 요청을 보낼 수 있게 하는 서버 역할을 한다.

주요 명령:

- `0x13`
  읽기
- `0x20`
  쓰기
- `0x60`
  통합운전 제어
- `0x80`, `0x81`, `0x82`, `0x83`
  앱 설정/배열/운영 관련 저장

즉 웹 포팅에서도 아래 둘 중 하나를 결정해야 한다.

1. 웹 서버가 RS485를 직접 읽고 제어한다.
2. 웹 서버가 Android와 동일한 TCP 서버/클라이언트 프로토콜을 유지한다.

현재 목표상 1번이 더 자연스럽다.

## 메인 화면 포팅 기준

기준 화면은 `activity_main.xml` 이다.

구조:

1. 상단 상태 바
- 통합운전 정지
- 압력
- 온도
- 전력
- 시간
- 로그인 버튼
- 로고

2. 본문 좌측
- 장비 상태 카드 그리드 `equipRv`

3. 본문 우측 하단 스트립
- `모드`
- `통합 제어`
- `옵션`

4. 우측 플로팅 버튼 열
- 상세 화면
- LOG
- 그룹운전 설정
- 설정
- 파일
- CCTV
- 추가 메뉴

웹 프론트엔드는 이 구조를 액티비티 기준으로 그대로 나누어야 한다.

## 현재 웹 포팅 방향

### Backend

FastAPI backend는 단순 요약 API가 아니라 Android `DataValue` 역할을 일부 흉내내는 방향으로 가야 한다.

필요 기능:

- 장비/시스템 데이터맵 저장
- 주소 기반 값 저장
- 장비별 파생 상태 계산
- 읽기 API
- 제어/쓰기 API
- WebSocket 실시간 push

### Collector

Collector는 단순 mock 숫자 발생기가 아니라 Android `DataRequestService`의 Python 포트가 되어야 한다.

필요 기능:

- FTDI/RS485 포트 오픈
- 원본 요청 포맷 생성
- CRC16 Modbus
- 응답 파싱
- 주소별 값 저장
- 쓰기 명령 전송
- 통신 오류/재시도 관리

### Frontend

React frontend는 Android 액티비티 포팅 구조로 간다.

권장 페이지:

- `/`
  `MainActivity`
- `/sec`
  `SecMainActivity`
- `/monitoring`
  `MonitoringActivity`
- `/log`
  `LogActivity`
- `/settings`
  `SettingActivity`
- `/login`
  `LoginActivity`

## 구현 우선순위

### 1단계

원본 데이터맵 호환 레이어 확보

- `DatabaseHelper.setInsertData()` 기반 주소 정의 추출
- `MapData`를 Python 모델로 이식
- 주소 기반 값 저장 구조 도입

### 2단계

RS485 통신 포팅

- `DataRequestService` 요청 흐름 포팅
- `EchoThread` 프로토콜 정리
- `WriteData` 쓰기 검증 구조 포팅

### 3단계

메인 화면 1:1 포팅

- `activity_main.xml`
- `item_equip_state.xml`
- `item_side_info.xml`
- 플로팅 버튼 행동

### 4단계

제어/설정/로그 화면 포팅

- 그룹운전 설정
- 장비 상세
- 범위 설정
- 로그 및 파일 복사

## 현재 코드와의 관계

현재 `monitoring-server` 저장소는 FastAPI/PostgreSQL/React 기반 골격을 이미 갖고 있다.

이 골격은 유지할 수 있지만, 내부 데이터 모델과 collector 구조는 Android 원본 기준으로 재정렬되어야 한다.

즉 현재 저장소는 폐기 대상이 아니라 "웹 런타임 껍데기"로 보고, 그 안에 `YujinCombine`의 의미 체계를 주입해야 한다.

## 다음 작업 권장

가장 먼저 해야 할 실제 구현 단위는 아래다.

1. `DatabaseHelper.setInsertData()` 전체 주소맵을 Python/JSON으로 추출
2. `DataValue`의 장비 배열/통신 상태/옵션 비트 구조를 backend 모델로 옮김
3. `DataRequestService`의 요청 포맷/응답 파서를 Python collector에 이식
4. `activity_main`을 원본 데이터 기준으로 다시 연결
