from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def build_client(tmp_path) -> TestClient:
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
    return TestClient(create_app(settings), base_url="http://tms.test")


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
            },
        )
        assert user_response.status_code == 201
        user_id = user_response.json()["id"]

        access_response = client.put(
            f"/api/admin/users/{user_id}/servers",
            headers=headers,
            json={"server_ids": [server_id]},
        )
        assert access_response.status_code == 200

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
