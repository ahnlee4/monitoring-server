# 중앙 서버 / 보드 엣지 구성

## 역할

- 개발 PC(`192.168.7.140`): PostgreSQL, FastAPI, React 모니터링 화면, 명령 큐를 실행합니다.
- 보드 PC: RS485 통신과 중앙 서버 업로드만 수행합니다. DB, backend, frontend, nginx는 실행하지 않습니다.
- 로그인 게이트웨이: `tms.theintech.co.kr` 로그인과 사용자별 지점 접근을 담당합니다.

데이터 흐름은 다음과 같습니다.

```text
장비 ─RS485─> 보드 edge-agent ─HTTP─> 개발 PC 중앙 서버 ─REST/WebSocket─> 브라우저
                                      ^
                                      └─ 지점별 명령 큐 ─> 보드 ─RS485─> 장비
```

보드가 중앙 서버와 잠시 끊겨도 수집 배치는 로컬 SQLite outbox에 남습니다. 연결이 복구되면 sequence 순서대로 재전송하며, 중앙 서버는 이미 처리한 sequence를 중복 반영하지 않습니다.

## 1. 개발 PC 중앙 서버 실행

```bash
cd /home/lee/projects/monitoring-server
cp .env.server.example .env.server
```

`.env.server`에서 반드시 아래 토큰과 비밀번호를 변경합니다.

```env
POSTGRES_PASSWORD=...
CENTRAL_ADMIN_TOKEN=...
DEFAULT_EDGE_TOKEN=...
```

기존 PostgreSQL 볼륨을 이어서 쓰는 PC는 현재 `.env`의 `POSTGRES_*` 값을 그대로 복사합니다. 운영 중인 DB의 비밀번호와 다른 값을 넣으면 backend가 접속하지 못합니다.

중앙 서버를 빌드하고 실행합니다.

```bash
docker compose \
  --env-file .env.server \
  -f docker-compose.server.yml \
  up -d --build
```

WSL 내부 확인 주소는 `http://127.0.0.1:8080`, 보드가 사용하는 개발 PC LAN 주소는 `http://192.168.7.140:18080`입니다. Windows 관리자 PowerShell에서 기존 게이트웨이 전달 규칙과 중앙 서버 전달 규칙을 함께 갱신합니다.

```powershell
wsl hostname -I
cd \\wsl.localhost\Ubuntu\home\lee\projects\monitoring-server
.\scripts\setup-windows-gateway.ps1 -WslAddress <위 명령의 첫 번째 IP>
```

이 스크립트는 기존 `8080 → WSL:80`, `8443 → WSL:443` 게이트웨이 규칙을 유지하면서 `18080 → WSL:8080` 중앙 서버 규칙을 추가합니다.

```bash
docker compose --env-file .env.server -f docker-compose.server.yml ps
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/sites
```

## 2. 지점과 보드 등록

`.env.server`의 `DEFAULT_SITE_*`, `DEFAULT_EDGE_*`에 지정한 첫 지점과 보드는 서버 시작 시 자동 생성됩니다. 추가 지점은 중앙 서버에서 아래와 같이 등록합니다.

```bash
curl -fsS -X POST http://127.0.0.1:8080/api/admin/sites \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: 중앙관리토큰' \
  -d '{"code":"plant-a","name":"A 지점","location":"서울"}'

curl -fsS -X POST http://127.0.0.1:8080/api/admin/sites/plant-a/edges \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: 중앙관리토큰' \
  -d '{"code":"plant-a-board-01","name":"A 지점 보드","token":"보드별로-다르게-만든-긴-토큰"}'
```

사이트 코드, 보드 코드, 토큰은 각 보드의 `.env.edge` 값과 정확히 맞아야 합니다.

## 3. 보드 PC 실행

보드마다 다음 파일을 준비합니다.

```bash
cd /home/linaro/monitoring-server
cp .env.edge.example .env.edge
```

예:

```env
EDGE_NODE_ID=plant-a-board-01
EDGE_NODE_TOKEN=보드별로-다르게-만든-긴-토큰
EDGE_SERVER_URL=http://192.168.7.140:18080
RS485_SERIAL_PORT=/dev/ttyUSB0
RS485_COMP_QTY=3
```

보드에서는 edge-agent 하나만 실행합니다.

```bash
sudo docker compose \
  --env-file .env.edge \
  -f docker-compose.board.yml \
  pull edge-agent

sudo docker compose \
  --env-file .env.edge \
  -f docker-compose.board.yml \
  up -d edge-agent
```

확인:

```bash
sudo docker compose --env-file .env.edge -f docker-compose.board.yml ps
sudo docker compose --env-file .env.edge -f docker-compose.board.yml logs -f --tail=100 edge-agent
curl -fsS http://192.168.7.140:18080/api/sites
```

## 4. 보드 키오스크

보드 화면도 로컬 서버가 아니라 중앙 서버의 자기 지점 화면을 엽니다.

```bash
sudo ./scripts/setup-board-kiosk.sh \
  linaro \
  'http://192.168.7.140:18080/?site=plant-a&edge=plant-a-board-01'

sudo reboot
```

## 5. 외부 로그인 게이트웨이 연결

중앙 서버 nginx는 게이트웨이와 포트가 겹치지 않도록 `8080`을 사용하고, 로그인 게이트웨이는 `80/443`을 사용합니다.

게이트웨이 관리 화면에는 각 지점을 별도 서버 항목으로 등록합니다.

- slug: 중앙 서버의 사이트 코드와 동일하게 설정 (`plant-a`)
- target host: `192.168.7.140`
- target port: `18080`

여러 서버 항목이 같은 중앙 서버를 가리켜도 됩니다. 게이트웨이는 로그인 사용자가 허용된 slug로 접속했을 때 `X-Monitoring-Server` 헤더를 전달하고, 중앙 backend는 해당 사이트 데이터만 반환합니다. 따라서 사용자가 URL의 `site` 값을 바꿔도 다른 지점으로 전환되지 않습니다.

외부 주소 예:

```text
https://tms.theintech.co.kr
https://plant-a.tms.theintech.co.kr
```

## 6. 업데이트

중앙 서버:

```bash
git pull --ff-only origin main
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build
```

보드:

```bash
git pull --ff-only origin main
sudo docker compose --env-file .env.edge -f docker-compose.board.yml pull edge-agent
sudo docker compose --env-file .env.edge -f docker-compose.board.yml up -d edge-agent
```

보드는 `backend`, `frontend`, `db`, `nginx` 이미지를 더 이상 실행하지 않습니다.
