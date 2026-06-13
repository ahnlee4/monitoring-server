# Industrial Monitoring Server MVP

Ubuntu/WSL2 기준으로 동작하는 산업용 현장 모니터링 서버 MVP입니다. 현재 단계에서는 mock collector 중심으로 전체 흐름을 먼저 완성하고, 이후 RS485 프로토콜과 상세 화면 디자인을 교체할 수 있게 구조를 분리했습니다.

## 1. 디렉터리 트리

```text
.
├── backend
├── collector
├── db
│   └── init
├── frontend
├── nginx
├── .env.example
└── docker-compose.yml
```

## 2. 서비스 흐름

1. `collector`는 공통 수집 런타임이며, 환경변수에 따라 `mock` 또는 `rs485` 드라이버를 선택합니다.
2. 선택된 드라이버가 장비 데이터를 읽거나 생성한 뒤 공통 telemetry payload로 정규화합니다.
3. `backend` FastAPI가 수집 데이터를 받아 PostgreSQL에 현재값/이력값/알람과 `YujinCombine` 주소맵 값을 저장합니다.
4. 저장 후 `backend`가 WebSocket으로 연결된 대시보드에 실시간 갱신 이벤트를 브로드캐스트합니다.
5. `frontend` React 대시보드는 REST로 초기 화면을 로딩하고, 이후 WebSocket으로 실시간 변경을 반영합니다.
6. `nginx`가 `/api`, `/ws`는 backend로 프록시하고 `/`는 frontend로 전달합니다.

## 3. MVP 범위

- 장비 목록
- 현재 상태 요약
- 최근 알람 목록
- 현재값/이력값 저장 구조
- `YujinCombine` 주소 기반 데이터맵 저장 구조
- WebSocket 실시간 갱신
- PC/모바일 반응형 테스트 화면
- 환경변수 기반 실행
- 향후 RS485 collector 교체를 위한 드라이버 인터페이스 분리

## 4. 환경변수

주요 값은 [.env.example](/home/lee/projects/monitoring-server/.env.example)에 정리되어 있습니다.

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
- `BACKEND_HOST`, `BACKEND_PORT`, `BACKEND_CORS_ORIGINS`
- `COLLECTOR_DRIVER`, `COLLECTOR_TOKEN`, `COLLECTOR_INTERVAL_SECONDS`, `COLLECTOR_DEVICE_CODES`, `COLLECTOR_API_URL`
- `VITE_API_BASE`, `VITE_WS_PATH`, `FRONTEND_PORT`
- `NGINX_PORT`
- `RS485_SERIAL_PORT`, `RS485_BAUDRATE`

## 5-1. YujinCombine 주소 API

원본 Android 앱 포팅용으로 아래 API가 추가되어 있습니다.

- `/api/yujin/map-schema`
- `/api/yujin/map-definitions`
- `/api/yujin/map-values`
- `/api/yujin/map-values/{key}`
- `/api/yujin/map-values/{key}/history`
- `/api/yujin/ingest-map`

이 구조는 Android의 `DatabaseHelper.setInsertData()`와 `DataValue`를 backend로 옮기기 위한 1차 기반입니다.

## 6. 실행 방법

가장 간단한 실행:

```bash
./scripts/start.sh
```

수동 실행:

```bash
cp .env.example .env
docker compose up --build
```

기존 DB를 이미 사용 중인데 최신 주소맵 모델을 반영하려면 한 번 초기화해야 합니다.

```bash
docker compose down -v
docker compose up --build
```

브라우저 접속:

- `http://localhost`

기본값은 `COLLECTOR_DRIVER=mock` 이므로 별도 설정 없이 mock 데이터로 전체 시스템이 동작합니다.

일부 ARM 보드 커널은 Docker 기본 브리지/NAT 기능을 제대로 제공하지 않아 `docker.service`가 시작되지 않을 수 있습니다. 이런 경우에는 host-network 우회 구성을 사용합니다.

1. Docker 데몬에 아래 설정을 추가합니다.

```json
{
  "bridge": "none",
  "iptables": false,
  "ip6tables": false
}
```

2. 설정 파일 저장:

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "bridge": "none",
  "iptables": false,
  "ip6tables": false
}
EOF
sudo systemctl restart docker
```

3. host-network 모드로 실행:

```bash
./scripts/start-hostnet.sh
```

이 모드에서는 `docker-compose.hostnet.yml`과 `nginx/nginx.host.conf`를 사용하며, 내부 서비스 통신을 `127.0.0.1` 기준으로 우회합니다.

중지:

```bash
./scripts/stop.sh
```

로그 확인:

```bash
./scripts/logs.sh
```

## 7. 원격 Ubuntu PC 배포 절차

현재 배포 대상 서버는 SSH만 열려 있는 Ubuntu 장비를 기준으로 합니다.

- SSH 접속: `ssh ubuntu@221.155.36.63`
- 초기 상태: Docker 미설치

### 7-1. SSH 접속

```bash
ssh ubuntu@221.155.36.63
```

### 7-2. 사전 준비

원격 서버에서 아래를 실행합니다.

```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

`docker` 그룹 반영을 위해 한 번 SSH를 끊었다가 다시 접속한 뒤 진행하는 편이 안전합니다.

### 7-3. 소스 배치

```bash
git clone <your-repo-url> monitoring-server
cd monitoring-server
cp .env.example .env
```

### 7-4. 배포 전 설정

`.env`에서 최소한 아래 항목은 검토합니다.

- `POSTGRES_PASSWORD`
- `COLLECTOR_TOKEN`
- `COLLECTOR_DRIVER`
- `NGINX_PORT`
- `COLLECTOR_DEVICE_CODES`
- `RS485_SERIAL_PORT`, `RS485_BAUDRATE`

기본 mock 배포만 할 때는 아래 값을 유지합니다.

```env
COLLECTOR_DRIVER=mock
COLLECTOR_API_URL=http://backend:8000/api/ingest/telemetry
```

실제 설비로 전환할 때는 `mock`를 지우는 것이 아니라 드라이버만 바꿉니다.

```env
COLLECTOR_DRIVER=rs485
RS485_SERIAL_PORT=/dev/ttyUSB0
RS485_BAUDRATE=9600
```

### 7-5. 서비스 기동

```bash
docker compose up -d --build
```

보드 배포에서는 보드에서 이미지를 빌드하지 않고 GitHub Container Registry 이미지를 내려받아 실행합니다.

```bash
git pull
./scripts/start-board.sh
```

`docker-compose.board.yml`은 `ghcr.io/ahnlee4/monitoring-*` 이미지를 사용합니다. private package로 생성된 경우 보드에서 한 번 GHCR 로그인이 필요합니다.

```bash
echo '<github-token>' | docker login ghcr.io -u ahnlee4 --password-stdin
```

### 7-6. 외부에서 접속
기본값으로 `NGINX_PORT=80`을 사용하면 브라우저에서 아래 주소로 접속합니다.

```text
http://221.155.36.63
```

포트를 바꿨다면 그 포트 번호를 포함해 접속합니다.

```text
http://221.155.36.63:<변경한포트>
```

### 7-7. 방화벽 허용

UFW를 사용하는 경우 포트를 열어야 합니다.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw status
```

`.env`에서 포트를 바꿨다면 그 포트 번호로 허용합니다.

### 7-8. 운영 확인

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f collector
curl http://localhost/api/health
```

### 7-9. 우분투 PC 화면에 자동 로그인 + 키오스크 실행

현장 모니터가 연결된 Ubuntu PC에서 부팅 후 자동으로 대시보드를 띄우려면 최소 GUI를 추가합니다.

```bash
sudo apt-get update
sudo apt-get install -y xorg openbox lightdm snapd curl
sudo snap install chromium
sudo systemctl enable lightdm
sudo systemctl set-default graphical.target
```

자동 로그인 대상 사용자는 현재 접속 계정인 `ubuntu`를 기준으로 설명합니다.

LightDM 자동 로그인 설정 파일 생성:

```bash
sudo mkdir -p /etc/lightdm/lightdm.conf.d
sudo tee /etc/lightdm/lightdm.conf.d/50-kiosk.conf >/dev/null <<'EOF'
[Seat:*]
autologin-user=ubuntu
autologin-user-timeout=0
user-session=openbox
EOF
```

Openbox 자동 실행 스크립트 생성:

```bash
mkdir -p ~/.config/openbox
cat > ~/.config/openbox/autostart <<'EOF'
xset s off
xset -dpms
xset s noblank

bash -lc 'until curl -fsS http://127.0.0.1/api/health >/dev/null; do sleep 2; done; chromium --kiosk --incognito --disable-infobars --noerrdialogs --disable-session-crashed-bubble http://127.0.0.1' &
EOF
chmod +x ~/.config/openbox/autostart
```

설정 후 재부팅:

```bash
sudo reboot
```

재부팅 뒤 동작 흐름은 아래와 같습니다.

1. Ubuntu가 그래픽 모드로 부팅됩니다.
2. `ubuntu` 사용자가 자동 로그인됩니다.
3. Openbox가 실행됩니다.
4. 로컬 API `http://127.0.0.1/api/health`가 응답할 때까지 대기합니다.
5. Chromium이 `http://127.0.0.1`을 전체화면 키오스크 모드로 엽니다.

키오스크를 잠시 종료하려면 `Alt+F4`로 Chromium을 닫고, 텍스트 콘솔로 이동하려면 `Ctrl+Alt+F3`을 사용합니다.

### 7-10. 재배포

```bash
git pull
docker compose up -d --build
```

### 7-11. 중지 및 정리

```bash
docker compose down
```

DB 데이터까지 삭제할 때:

```bash
docker compose down -v
```

## 8. 검증 절차

1. 대시보드 접속 후 장비 카드가 보이는지 확인합니다.
2. 현재 상태 수치가 3초 주기로 갱신되는지 확인합니다.
3. 최근 알람 목록이 누적되는지 확인합니다.
4. 브라우저 개발자 도구에서 WebSocket 연결이 유지되는지 확인합니다.
5. API 직접 확인:

```bash
curl http://localhost/api/health
curl http://localhost/api/devices
curl http://localhost/api/alarms/recent
curl http://localhost/api/yujin/map-values?key_prefix=11
```

## 9. 변경 파일 요약

- Compose 및 환경변수: `docker-compose.yml`, `.env.example`
- Backend: FastAPI, PostgreSQL 모델, REST API, WebSocket, ingest API, YujinCombine 주소맵 API
- Frontend: React + Vite + Tailwind 대시보드
- Collector: 공통 수집 런타임, mock/RS485 드라이버 구조
- Infra: Nginx 프록시, DB init 디렉터리, Dockerfiles

## 10. 비고

- 현재 RS485는 실제 프로토콜 구현 대신 교체 가능한 드라이버 골격만 제공합니다.
- `YujinCombine` 웹 포팅을 위해 주소맵 저장 구조를 backend에 추가했습니다.
- 상세 디자인보다 동작 가능한 운영 흐름과 확장 가능한 서비스 분리를 우선했습니다.
