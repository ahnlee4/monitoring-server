# Industrial Monitoring Server MVP

Ubuntu/WSL2 기준으로 동작하는 산업용 현장 모니터링 서버 MVP입니다. 현재 단계에서는 mock collector 중심으로 전체 흐름을 먼저 완성하고, 이후 RS485 프로토콜과 상세 화면 디자인을 교체할 수 있게 구조를 분리했습니다.

## 1. 디렉터리 트리

```text
.
├── backend
├── collector-mock
├── collector-rs485
├── db
│   └── init
├── frontend
├── nginx
├── .env.example
└── docker-compose.yml
```

## 2. 서비스 흐름

1. `collector-mock`가 설비별 mock 현재값과 알람을 주기적으로 생성합니다.
2. `backend` FastAPI가 수집 데이터를 받아 PostgreSQL에 현재값/이력값/알람을 저장합니다.
3. 저장 후 `backend`가 WebSocket으로 연결된 대시보드에 실시간 갱신 이벤트를 브로드캐스트합니다.
4. `frontend` React 대시보드는 REST로 초기 화면을 로딩하고, 이후 WebSocket으로 실시간 변경을 반영합니다.
5. `nginx`가 `/api`, `/ws`는 backend로 프록시하고 `/`는 frontend로 전달합니다.

## 3. MVP 범위

- 장비 목록
- 현재 상태 요약
- 최근 알람 목록
- 현재값/이력값 저장 구조
- WebSocket 실시간 갱신
- PC/모바일 반응형 테스트 화면
- 환경변수 기반 실행
- 향후 RS485 collector 교체를 위한 인터페이스 분리

## 4. 환경변수

주요 값은 [.env.example](/home/lee/projects/monitoring-server/.env.example)에 정리되어 있습니다.

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
- `BACKEND_HOST`, `BACKEND_PORT`, `BACKEND_CORS_ORIGINS`
- `COLLECTOR_TOKEN`, `COLLECTOR_INTERVAL_SECONDS`, `COLLECTOR_DEVICE_CODES`, `COLLECTOR_API_URL`
- `VITE_API_BASE`, `VITE_WS_PATH`, `FRONTEND_PORT`
- `NGINX_PORT`
- `RS485_SERIAL_PORT`, `RS485_BAUDRATE`

## 5. 실행 방법

```bash
cp .env.example .env
docker compose up --build
```

브라우저 접속:

- `http://localhost:8080`

기본 실행은 `collector-mock` 기준입니다. RS485 collector 골격을 같이 포함했지만 기본 프로필에서는 실행하지 않습니다.

RS485 프로필까지 올릴 때:

```bash
docker compose --profile rs485 up --build
```

## 6. 다른 Ubuntu PC 배포 절차

대상 장비는 같은 로컬망에 있는 Ubuntu PC를 기준으로 합니다.

### 6-1. 사전 준비

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

### 6-2. 소스 배치

```bash
git clone <your-repo-url> monitoring-server
cd monitoring-server
cp .env.example .env
```

### 6-3. 배포 전 설정

`.env`에서 최소한 아래 항목은 검토합니다.

- `POSTGRES_PASSWORD`
- `COLLECTOR_TOKEN`
- `NGINX_PORT`
- `COLLECTOR_DEVICE_CODES`
- `RS485_SERIAL_PORT`, `RS485_BAUDRATE`

기본 mock 배포만 할 때는 `COLLECTOR_API_URL=http://backend:8000/api/ingest/telemetry`를 그대로 사용합니다.

### 6-4. 서비스 기동

```bash
docker compose up -d --build
```

RS485 collector까지 함께 배포할 때:

```bash
docker compose --profile rs485 up -d --build
```

### 6-5. 같은 네트워크 다른 PC/모바일에서 접속

배포 대상 Ubuntu PC의 IP를 확인합니다.

```bash
hostname -I
```

예를 들어 IP가 `192.168.0.50`이고 `.env`의 `NGINX_PORT=8080`이면 다른 PC/모바일에서는 아래로 접속합니다.

```text
http://192.168.0.50:8080
```

### 6-6. 방화벽 허용

UFW를 사용하는 경우 포트를 열어야 합니다.

```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

`.env`에서 포트를 바꿨다면 그 포트 번호로 허용합니다.

### 6-7. 운영 확인

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f collector-mock
curl http://localhost:8080/api/health
```

### 6-8. 재배포

```bash
git pull
docker compose up -d --build
```

### 6-9. 중지 및 정리

```bash
docker compose down
```

DB 데이터까지 삭제할 때:

```bash
docker compose down -v
```

## 7. 검증 절차

1. 대시보드 접속 후 장비 카드가 보이는지 확인합니다.
2. 현재 상태 수치가 3초 주기로 갱신되는지 확인합니다.
3. 최근 알람 목록이 누적되는지 확인합니다.
4. 브라우저 개발자 도구에서 WebSocket 연결이 유지되는지 확인합니다.
5. API 직접 확인:

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/devices
curl http://localhost:8080/api/alarms/recent
```

## 8. 변경 파일 요약

- Compose 및 환경변수: `docker-compose.yml`, `.env.example`
- Backend: FastAPI, PostgreSQL 모델, REST API, WebSocket, ingest API
- Frontend: React + Vite + Tailwind 대시보드
- Collectors: mock collector, RS485 교체용 인터페이스 골격
- Infra: Nginx 프록시, DB init 디렉터리, Dockerfiles

## 9. 비고

- 현재 RS485는 실제 프로토콜 구현 대신 교체 가능한 추상 인터페이스 구조만 제공합니다.
- 상세 디자인보다 동작 가능한 운영 흐름과 확장 가능한 서비스 분리를 우선했습니다.
