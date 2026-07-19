import sqlite3

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


class FakeEmailSender:
    configured = True

    def __init__(self) -> None:
        self.messages: list[dict] = []

    def send_verification_code(
        self,
        recipient: str,
        code: str,
        expires_minutes: int,
    ) -> None:
        self.messages.append(
            {
                "recipient": recipient,
                "code": code,
                "expires_minutes": expires_minutes,
            }
        )


def build_client(tmp_path, email_sender=None) -> TestClient:
    settings = Settings(
        portal_database_url=f"sqlite:///{tmp_path / 'portal.db'}",
        base_domain="tms.test",
        session_cookie_domain="",
        session_secure=False,
        bootstrap_admin_username="admin",
        bootstrap_admin_password="initial-admin-password",
        trusted_origins="http://tms.test",
        allowed_target_ports="80",
    )
    return TestClient(
        create_app(settings, email_sender_override=email_sender),
        base_url="http://tms.test",
    )


def login(client: TestClient, username: str, password: str) -> dict:
    response = client.post(
        "/api/auth/login",
        headers={"Origin": "http://tms.test"},
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()


def test_login_server_assignment_and_proxy_authorization(tmp_path) -> None:
    with build_client(tmp_path) as client:
        admin_login = login(client, "admin", "initial-admin-password")
        csrf = admin_login["csrfToken"]
        headers = {"Origin": "http://tms.test", "X-CSRF-Token": csrf}

        server_response = client.post(
            "/api/admin/servers",
            headers=headers,
            json={
                "slug": "plant-a",
                "name": "공장 A",
                "target_host": "192.168.10.21",
                "target_port": 80,
            },
        )
        assert server_response.status_code == 201
        server_id = server_response.json()["id"]

        user_response = client.post(
            "/api/admin/users",
            headers=headers,
            json={
                "username": "operator-a",
                "password": "operator-password-123",
                "display_name": "운영자 A",
                "is_admin": False,
                "server_ids": [server_id],
            },
        )
        assert user_response.status_code == 201
        user_id = user_response.json()["id"]
        assert user_response.json()["serverIds"] == [server_id]

        client.cookies.clear()
        login(client, "operator-a", "operator-password-123")
        assigned = client.get("/api/servers")
        assert assigned.status_code == 200
        assert [item["slug"] for item in assigned.json()] == ["plant-a"]

        authorized = client.get(
            "/internal/authorize",
            headers={"X-Original-Host": "plant-a.tms.test"},
        )
        assert authorized.status_code == 204
        assert authorized.headers["X-Target-Upstream"] == "192.168.10.21:80"
        assert authorized.headers["X-Authenticated-User"] == "operator-a"

        forbidden = client.get(
            "/internal/authorize",
            headers={"X-Original-Host": "plant-b.tms.test"},
        )
        assert forbidden.status_code == 403


def test_user_creation_rejects_unknown_server_without_creating_account(tmp_path) -> None:
    with build_client(tmp_path) as client:
        admin_login = login(client, "admin", "initial-admin-password")
        headers = {
            "Origin": "http://tms.test",
            "X-CSRF-Token": admin_login["csrfToken"],
        }

        response = client.post(
            "/api/admin/users",
            headers=headers,
            json={
                "username": "invalid-access-user",
                "password": "operator-password-123",
                "display_name": "잘못된 권한 사용자",
                "is_admin": False,
                "server_ids": [99999],
            },
        )

        assert response.status_code == 422
        users = client.get("/api/admin/users").json()
        assert [user["username"] for user in users] == ["admin"]


def test_admin_mutation_requires_csrf_and_private_target(tmp_path) -> None:
    with build_client(tmp_path) as client:
        login(client, "admin", "initial-admin-password")

        missing_csrf = client.post(
            "/api/admin/servers",
            headers={"Origin": "http://tms.test"},
            json={
                "slug": "plant-a",
                "name": "공장 A",
                "target_host": "192.168.10.21",
                "target_port": 80,
            },
        )
        assert missing_csrf.status_code == 403

        me = client.get("/api/auth/me").json()
        public_target = client.post(
            "/api/admin/servers",
            headers={"Origin": "http://tms.test", "X-CSRF-Token": me["csrfToken"]},
            json={
                "slug": "unsafe",
                "name": "외부 주소",
                "target_host": "8.8.8.8",
                "target_port": 80,
            },
        )
        assert public_target.status_code == 422


def test_wrong_origin_and_unauthenticated_proxy_are_rejected(tmp_path) -> None:
    with build_client(tmp_path) as client:
        wrong_origin = client.post(
            "/api/auth/login",
            headers={"Origin": "https://attacker.example"},
            json={"username": "admin", "password": "initial-admin-password"},
        )
        assert wrong_origin.status_code == 403

        unauthenticated = client.get(
            "/internal/authorize",
            headers={"X-Original-Host": "plant-a.tms.test"},
        )
        assert unauthenticated.status_code == 401


def test_user_can_change_password_and_old_password_stops_working(tmp_path) -> None:
    with build_client(tmp_path) as client:
        login_result = login(client, "admin", "initial-admin-password")
        changed = client.post(
            "/api/auth/password",
            headers={"Origin": "http://tms.test", "X-CSRF-Token": login_result["csrfToken"]},
            json={
                "current_password": "initial-admin-password",
                "new_password": "replacement-admin-password",
            },
        )
        assert changed.status_code == 200

        client.cookies.clear()
        old_login = client.post(
            "/api/auth/login",
            headers={"Origin": "http://tms.test"},
            json={"username": "admin", "password": "initial-admin-password"},
        )
        assert old_login.status_code == 401
        login(client, "admin", "replacement-admin-password")


def test_admin_can_update_and_delete_another_administrator(tmp_path) -> None:
    with build_client(tmp_path) as client:
        admin_login = login(client, "admin", "initial-admin-password")
        headers = {
            "Origin": "http://tms.test",
            "X-CSRF-Token": admin_login["csrfToken"],
        }

        created = client.post(
            "/api/admin/users",
            headers=headers,
            json={
                "username": "site-admin",
                "password": "site-admin-password",
                "display_name": "현장 관리자",
                "is_admin": True,
            },
        )
        assert created.status_code == 201
        user_id = created.json()["id"]

        updated = client.patch(
            f"/api/admin/users/{user_id}",
            headers=headers,
            json={
                "username": "plant-admin",
                "password": "replacement-site-password",
                "display_name": "공장 관리자",
                "is_admin": True,
                "is_active": True,
            },
        )
        assert updated.status_code == 200
        assert updated.json()["username"] == "plant-admin"
        assert updated.json()["displayName"] == "공장 관리자"
        assert updated.json()["isAdmin"] is True

        client.cookies.clear()
        old_login = client.post(
            "/api/auth/login",
            headers={"Origin": "http://tms.test"},
            json={"username": "site-admin", "password": "site-admin-password"},
        )
        assert old_login.status_code == 401
        login(client, "plant-admin", "replacement-site-password")
        site_admin_session = client.cookies.get("monitor_session")

        client.cookies.clear()
        admin_login = login(client, "admin", "initial-admin-password")
        headers["X-CSRF-Token"] = admin_login["csrfToken"]
        deactivated = client.patch(
            f"/api/admin/users/{user_id}",
            headers=headers,
            json={"is_admin": False, "is_active": False},
        )
        assert deactivated.status_code == 200
        assert deactivated.json()["isAdmin"] is False
        assert deactivated.json()["isActive"] is False

        client.cookies.clear()
        client.cookies.set("monitor_session", site_admin_session)
        assert client.get("/api/auth/me").status_code == 401

        client.cookies.clear()
        admin_login = login(client, "admin", "initial-admin-password")
        headers["X-CSRF-Token"] = admin_login["csrfToken"]
        deleted = client.delete(f"/api/admin/users/{user_id}", headers=headers)
        assert deleted.status_code == 204

        client.cookies.clear()
        deleted_login = client.post(
            "/api/auth/login",
            headers={"Origin": "http://tms.test"},
            json={"username": "plant-admin", "password": "replacement-site-password"},
        )
        assert deleted_login.status_code == 401


def test_current_administrator_cannot_remove_own_access(tmp_path) -> None:
    with build_client(tmp_path) as client:
        admin_login = login(client, "admin", "initial-admin-password")
        user_id = admin_login["user"]["id"]
        headers = {
            "Origin": "http://tms.test",
            "X-CSRF-Token": admin_login["csrfToken"],
        }

        demote = client.patch(
            f"/api/admin/users/{user_id}",
            headers=headers,
            json={"is_admin": False},
        )
        assert demote.status_code == 409
        assert demote.json()["detail"] == "현재 로그인한 계정의 관리자 권한은 변경할 수 없습니다."

        deactivate = client.patch(
            f"/api/admin/users/{user_id}",
            headers=headers,
            json={"is_active": False},
        )
        assert deactivate.status_code == 409

        deleted = client.delete(f"/api/admin/users/{user_id}", headers=headers)
        assert deleted.status_code == 409
        assert client.get("/api/admin/users").status_code == 200


def test_phone_signup_requires_server_assignment_and_admin_approval(tmp_path) -> None:
    with build_client(tmp_path) as client:
        signup = client.post(
            "/api/signup/register",
            headers={"Origin": "http://tms.test"},
            json={
                "username": "phone-user",
                "password": "phone-user-password",
                "display_name": "휴대전화 가입자",
                "contact_type": "phone",
                "contact_value": "010-1234-5678",
                "privacy_agreed": True,
            },
        )
        assert signup.status_code == 201
        assert signup.json()["status"] == "pending"

        pending_login = client.post(
            "/api/auth/login",
            headers={"Origin": "http://tms.test"},
            json={"username": "phone-user", "password": "phone-user-password"},
        )
        assert pending_login.status_code == 403
        assert "승인 대기" in pending_login.json()["detail"]

        admin_login = login(client, "admin", "initial-admin-password")
        headers = {
            "Origin": "http://tms.test",
            "X-CSRF-Token": admin_login["csrfToken"],
        }
        users = client.get("/api/admin/users").json()
        phone_user = next(user for user in users if user["username"] == "phone-user")
        assert phone_user["approvalStatus"] == "pending"
        assert phone_user["isActive"] is False
        assert phone_user["contactType"] == "phone"
        assert phone_user["contactValue"] == "01012345678"
        assert phone_user["contactVerified"] is False

        approval_without_server = client.post(
            f"/api/admin/users/{phone_user['id']}/approve",
            headers=headers,
        )
        assert approval_without_server.status_code == 409

        server = client.post(
            "/api/admin/servers",
            headers=headers,
            json={
                "slug": "phone-plant",
                "name": "휴대전화 가입자 현장",
                "target_host": "192.168.10.31",
                "target_port": 80,
            },
        )
        assert server.status_code == 201
        server_id = server.json()["id"]
        assigned = client.put(
            f"/api/admin/users/{phone_user['id']}/servers",
            headers=headers,
            json={"server_ids": [server_id]},
        )
        assert assigned.status_code == 200

        approved = client.post(
            f"/api/admin/users/{phone_user['id']}/approve",
            headers=headers,
        )
        assert approved.status_code == 200
        assert approved.json()["approvalStatus"] == "approved"
        assert approved.json()["isActive"] is True

        client.cookies.clear()
        login(client, "phone-user", "phone-user-password")
        servers = client.get("/api/servers")
        assert servers.status_code == 200
        assert [server["slug"] for server in servers.json()] == ["phone-plant"]


def test_email_signup_requires_verification_code(tmp_path) -> None:
    sender = FakeEmailSender()
    with build_client(tmp_path, email_sender=sender) as client:
        options = client.get("/api/signup/options")
        assert options.status_code == 200
        assert options.json()["emailVerificationAvailable"] is True

        sent = client.post(
            "/api/signup/email/send",
            headers={"Origin": "http://tms.test"},
            json={"email": "New.User@Example.com"},
        )
        assert sent.status_code == 200
        assert sender.messages[-1]["recipient"] == "new.user@example.com"

        missing_verification = client.post(
            "/api/signup/register",
            headers={"Origin": "http://tms.test"},
            json={
                "username": "email-user",
                "password": "email-user-password",
                "display_name": "이메일 가입자",
                "contact_type": "email",
                "contact_value": "new.user@example.com",
                "privacy_agreed": True,
            },
        )
        assert missing_verification.status_code == 422

        wrong_value = (
            "000000" if sender.messages[-1]["code"] != "000000" else "000001"
        )
        wrong_code = client.post(
            "/api/signup/email/verify",
            headers={"Origin": "http://tms.test"},
            json={"email": "new.user@example.com", "code": wrong_value},
        )
        assert wrong_code.status_code == 400

        verified = client.post(
            "/api/signup/email/verify",
            headers={"Origin": "http://tms.test"},
            json={
                "email": "new.user@example.com",
                "code": sender.messages[-1]["code"],
            },
        )
        assert verified.status_code == 200

        signup = client.post(
            "/api/signup/register",
            headers={"Origin": "http://tms.test"},
            json={
                "username": "email-user",
                "password": "email-user-password",
                "display_name": "이메일 가입자",
                "contact_type": "email",
                "contact_value": "new.user@example.com",
                "email_verification_token": verified.json()["verificationToken"],
                "privacy_agreed": True,
            },
        )
        assert signup.status_code == 201

        admin_login = login(client, "admin", "initial-admin-password")
        users = client.get("/api/admin/users").json()
        email_user = next(user for user in users if user["username"] == "email-user")
        assert email_user["contactValue"] == "new.user@example.com"
        assert email_user["contactVerified"] is True
        assert email_user["approvalStatus"] == "pending"
        assert admin_login["user"]["isAdmin"] is True


def test_signup_and_privacy_pages_are_public(tmp_path) -> None:
    with build_client(tmp_path) as client:
        assert client.get("/signup").status_code == 200
        assert client.get("/privacy").status_code == 200


def test_existing_database_receives_signup_columns(tmp_path) -> None:
    database_path = tmp_path / "portal.db"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE portal_users (
                id INTEGER PRIMARY KEY,
                username VARCHAR(64) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(128) NOT NULL,
                is_admin BOOLEAN NOT NULL,
                is_active BOOLEAN NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

    with build_client(tmp_path) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        users = client.post(
            "/api/auth/login",
            headers={"Origin": "http://tms.test"},
            json={"username": "admin", "password": "initial-admin-password"},
        )
        assert users.status_code == 200

    with sqlite3.connect(database_path) as connection:
        columns = {
            row[1] for row in connection.execute("PRAGMA table_info(portal_users)")
        }
    assert {
        "contact_type",
        "contact_value",
        "contact_verified_at",
        "approval_status",
        "signup_requested_at",
        "privacy_agreed_at",
        "privacy_version",
        "approved_at",
    }.issubset(columns)
