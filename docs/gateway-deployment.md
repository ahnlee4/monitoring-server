# 중앙 로그인 게이트웨이 구축 및 운영 절차

## 1. 적용 구조

중앙 게이트웨이만 인터넷에 공개하고 모니터링 보드는 회사 내부망에 둔다.

```text
Internet
  └─ tms.theintech.co.kr:443
      └─ 중앙 Nginx
          ├─ 중앙 로그인 포털
          └─ 사용자 권한에 맞는 내부 보드
              ├─ plant-a.tms.theintech.co.kr → 192.168.0.101:80
              └─ plant-b.tms.theintech.co.kr → 192.168.0.102:80
```

중앙 포털은 사용자, 내부 서버, 사용자별 서버 권한과 로그인 세션을 별도 PostgreSQL에 저장한다. 세션 원문은 브라우저의 `HttpOnly` 쿠키에만 저장하고 DB에는 SHA-256 해시를 저장한다. 사용자 비밀번호는 Argon2로 해시한다.

## 2. 구축 전 필수 확인

- 회사 회선에 포트포워딩 가능한 공인 IP가 있어야 한다.
- 통신사 CGNAT 환경이면 공인 IP를 신청하거나 별도 터널 구성을 사용해야 한다.
- 중앙 게이트웨이 Ubuntu 서버의 내부 IP를 고정한다.
- 각 모니터링 보드도 고정 IP 또는 공유기 DHCP 예약을 적용한다.
- 중앙 서버의 80/443 이외 보드, DB, backend 포트는 외부에 공개하지 않는다.

## 3. DNS 구성

DNS 관리 화면에 아래 레코드를 추가한다.

```text
A  tms.theintech.co.kr    → 회사 공인 IP
A  *.tms.theintech.co.kr  → 회사 공인 IP
```

현재 Nginx 구성은 `tms.theintech.co.kr`을 기준으로 작성되어 있다. 도메인을 변경하려면 포털 환경변수뿐 아니라 `gateway/nginx/nginx.conf`의 서버 이름과 인증서 경로도 함께 변경한다.

## 4. TLS 인증서

동적으로 현장 서브도메인을 추가하려면 아래 이름을 포함한 인증서가 필요하다.

```text
tms.theintech.co.kr
*.tms.theintech.co.kr
```

와일드카드 인증서는 HTTP-01 방식으로 발급할 수 없으므로 DNS-01 인증을 사용해야 한다. DNS 사업자에 맞는 Certbot DNS 플러그인 또는 동일한 기능의 인증서 자동화 도구를 사용한다.

게이트웨이 설정은 다음 파일을 읽는다.

```text
/etc/letsencrypt/live/tms.theintech.co.kr/fullchain.pem
/etc/letsencrypt/live/tms.theintech.co.kr/privkey.pem
```

개별 현장 수가 적고 고정되어 있다면 와일드카드 대신 모든 현장 호스트 이름을 SAN에 명시한 인증서도 사용할 수 있다.

## 5. 중앙 게이트웨이 환경 설정

```bash
cp .env.gateway.example .env.gateway
chmod 600 .env.gateway
```

`.env.gateway`에서 최소한 아래 값을 실제 무작위 값으로 변경한다.

```env
GATEWAY_POSTGRES_PASSWORD=<긴 무작위 DB 비밀번호>
GATEWAY_DATABASE_URL=postgresql+psycopg2://gateway:<동일한 URL 인코딩 비밀번호>@gateway-db:5432/monitoring_gateway
GATEWAY_ADMIN_PASSWORD=<12자 이상의 긴 관리자 비밀번호>
```

DB 비밀번호에 `@`, `:`, `/` 같은 문자가 포함되면 `GATEWAY_DATABASE_URL` 안에서는 URL 인코딩해야 한다.

최초 실행 시 관리자 계정이 없을 때만 환경변수의 관리자 계정을 생성한다. 이후 `.env.gateway`의 관리자 비밀번호를 변경해도 이미 생성된 계정 비밀번호는 바뀌지 않는다. 포털의 비밀번호 변경 기능을 사용한다.

## 6. 중앙 게이트웨이 실행

```bash
./scripts/start-gateway.sh
```

상태와 로그 확인:

```bash
docker compose --env-file .env.gateway -f docker-compose.gateway.yml ps
./scripts/logs-gateway.sh
curl -fsS https://tms.theintech.co.kr/api/health
```

중지할 때는 DB 볼륨을 삭제하지 않는다.

```bash
./scripts/stop-gateway.sh
```

## 7. 모니터링 보드 전환

중앙 게이트웨이 뒤에서 사용할 보드는 HTTPS 인증서가 없는 내부망 Nginx 구성을 덧붙여 실행한다.

```bash
docker compose \
  --env-file .env \
  -f docker-compose.board.yml \
  -f docker-compose.board.gateway.yml \
  up -d
```

보드에서 확인:

```bash
docker compose \
  --env-file .env \
  -f docker-compose.board.yml \
  -f docker-compose.board.gateway.yml \
  ps
curl -fsS http://127.0.0.1/api/health
```

각 보드의 80 포트는 중앙 게이트웨이 내부 IP에서만 접근할 수 있도록 공유기 ACL 또는 보드 방화벽을 적용한다. 아래에서 주소는 실제 값으로 바꾼다.

```bash
sudo ufw allow from <관리자-PC-또는-관리망> to any port 22 proto tcp
sudo ufw allow from <중앙-게이트웨이-내부-IP> to any port 80 proto tcp
sudo ufw default deny incoming
sudo ufw enable
sudo ufw status numbered
```

방화벽을 켜기 전에 현재 SSH 접속 경로가 허용됐는지 반드시 확인한다. 로컬 키오스크는 `127.0.0.1`로 계속 접속한다.

## 8. 사용자와 서버 등록

1. `https://tms.theintech.co.kr`에 최초 관리자 계정으로 로그인한다.
2. 관리 화면에서 현장 이름, 서브도메인용 주소 이름, 보드 내부 IP와 포트를 등록한다.
3. 사용자를 등록한다. 임시 비밀번호는 12자 이상이어야 한다.
4. 사용자별로 접근 가능한 서버를 선택하고 권한을 저장한다.
5. 사용자에게 최초 로그인 후 비밀번호를 변경하도록 안내한다.

서버 주소 이름이 `plant-a`이면 외부 접속 주소는 다음과 같다.

```text
https://plant-a.tms.theintech.co.kr
```

등록 대상은 사설 IP만 허용하며 기본 허용 포트는 80이다. 추가 포트가 필요하면 `.env.gateway`의 `GATEWAY_ALLOWED_TARGET_PORTS`를 검토한 뒤 명시적으로 추가한다.

## 9. 공유기와 방화벽

공유기 포트포워딩:

```text
외부 TCP 443 → 중앙 게이트웨이 내부 IP TCP 443
외부 TCP 80  → 중앙 게이트웨이 내부 IP TCP 80
```

80 포트는 HTTPS 이동과 일반 인증서 HTTP 검증에 사용한다. 와일드카드 인증서를 DNS 방식으로만 운영하고 HTTP 연결이 필요 없다면 운영 정책에 따라 80 포트를 닫을 수 있다.

공개하지 않는 포트:

- 중앙 PostgreSQL 5432
- 포털 FastAPI 8000
- 보드 PostgreSQL 5432
- 보드 backend 8000
- 보드 frontend 4173
- 보드의 SSH 및 공유기 관리 화면

## 10. 적용 후 확인

```bash
dig +short tms.theintech.co.kr
dig +short plant-a.tms.theintech.co.kr
curl -I http://tms.theintech.co.kr
curl -I https://tms.theintech.co.kr
curl -I https://plant-a.tms.theintech.co.kr
```

확인 항목:

- HTTP 접속이 HTTPS로 이동하는가
- 미로그인 현장 접속이 중앙 로그인 화면으로 이동하는가
- 로그인 후 허용된 현장만 표시되는가
- 다른 현장 주소를 직접 입력하면 접근이 거부되는가
- REST API와 WebSocket이 모두 유지되는가
- 보드 전원이 꺼졌을 때 다른 보드와 로그인 포털은 정상인가
- 모바일망 등 회사 외부 네트워크에서 접속되는가

## 11. 백업과 복구

중앙 DB에는 계정과 권한 정보가 있으므로 정기 백업이 필요하다.

```bash
docker exec monitoring-gateway-db pg_dump -U gateway monitoring_gateway > monitoring_gateway.sql
```

백업 파일에는 사용자와 세션 관련 정보가 포함되므로 접근 권한과 보관 기간을 제한한다. 복구 절차는 운영 서버와 별도의 테스트 환경에서 먼저 검증한다.

## 12. 전환 실패 시 복귀

중앙 게이트웨이만 중지하고 보드의 로컬 키오스크 접속은 유지한다.

```bash
./scripts/stop-gateway.sh
```

외부 공개를 기존 보드로 되돌려야 한다면 공유기 포트포워딩과 기존 보드 HTTPS 구성을 함께 되돌려야 한다. 실제 변경 전 공유기 설정과 기존 인증서 상태를 기록해 둔다.
