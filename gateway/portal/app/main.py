from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.config import Settings, get_settings
from app.database import Base, Database, get_db
from app.models import AuditLog, MonitoringServer, PortalSession, User, UserServerAccess
from app.schemas import (
    LoginIn,
    PasswordChangeIn,
    ServerCreateIn,
    ServerUpdateIn,
    UserAccessIn,
    UserCreateIn,
    UserUpdateIn,
)
from app.security import (
    SLUG_PATTERN,
    USERNAME_PATTERN,
    hash_password,
    new_csrf_token,
    new_session_token,
    normalize_db_datetime,
    token_digest,
    utcnow,
    validate_target,
    verify_password,
)


FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"


@dataclass(frozen=True)
class AuthContext:
    user: User
    session: PortalSession


def remote_address(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:64]
    return request.client.host[:64] if request.client else ""


def audit(db: Session, request: Request, action: str, user_id: int | None, detail: str = "") -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            remote_addr=remote_address(request),
            detail=detail[:1000],
        )
    )


def lookup_auth(request: Request, db: Session) -> AuthContext | None:
    settings: Settings = request.app.state.settings
    raw_token = request.cookies.get(settings.session_cookie_name)
    if not raw_token:
        return None

    portal_session = db.scalar(
        select(PortalSession)
        .options(selectinload(PortalSession.user))
        .where(PortalSession.token_hash == token_digest(raw_token))
    )
    if not portal_session:
        return None
    if normalize_db_datetime(portal_session.expires_at) <= utcnow() or not portal_session.user.is_active:
        db.delete(portal_session)
        db.commit()
        return None
    return AuthContext(user=portal_session.user, session=portal_session)


def require_auth(request: Request, db: Session = Depends(get_db)) -> AuthContext:
    context = lookup_auth(request, db)
    if not context:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")
    return context


def require_admin(context: AuthContext = Depends(require_auth)) -> AuthContext:
    if not context.user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return context


def require_csrf(
    x_csrf_token: str = Header(default="", alias="X-CSRF-Token"),
    context: AuthContext = Depends(require_auth),
) -> AuthContext:
    if not x_csrf_token or x_csrf_token != context.session.csrf_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="요청 검증에 실패했습니다.")
    return context


def require_admin_csrf(context: AuthContext = Depends(require_csrf)) -> AuthContext:
    if not context.user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return context


def serialize_user(user: User, server_ids: list[int] | None = None) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "displayName": user.display_name,
        "isAdmin": user.is_admin,
        "isActive": user.is_active,
        **({"serverIds": server_ids} if server_ids is not None else {}),
    }


def serialize_server(server: MonitoringServer, base_domain: str) -> dict:
    return {
        "id": server.id,
        "slug": server.slug,
        "name": server.name,
        "targetHost": server.target_host,
        "targetPort": server.target_port,
        "isActive": server.is_active,
        "url": f"https://{server.slug}.{base_domain}",
    }


def create_app(settings_override: Settings | None = None) -> FastAPI:
    configuration = settings_override or get_settings()
    database = Database(configuration.portal_database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        Base.metadata.create_all(bind=database.engine)
        with database.session_factory() as db:
            db.execute(delete(PortalSession).where(PortalSession.expires_at <= utcnow()))
            if not db.scalar(select(User.id).limit(1)):
                if not configuration.bootstrap_admin_password:
                    raise RuntimeError("최초 관리자 비밀번호가 설정되지 않았습니다.")
                if len(configuration.bootstrap_admin_password) < 12:
                    raise RuntimeError("최초 관리자 비밀번호는 12자 이상이어야 합니다.")
                db.add(
                    User(
                        username=configuration.bootstrap_admin_username.lower(),
                        password_hash=hash_password(configuration.bootstrap_admin_password),
                        display_name="관리자",
                        is_admin=True,
                    )
                )
            db.commit()
        yield
        database.engine.dispose()

    portal = FastAPI(title="Monitoring Gateway Portal", lifespan=lifespan)
    portal.state.settings = configuration
    portal.state.database = database

    @portal.middleware("http")
    async def validate_origin(request: Request, call_next):
        if request.method in {"POST", "PUT", "PATCH", "DELETE"} and not request.url.path.startswith("/internal/"):
            origin = request.headers.get("origin")
            if origin and origin.rstrip("/") not in configuration.trusted_origins_set:
                return Response(status_code=status.HTTP_403_FORBIDDEN, content="허용되지 않은 요청 출처입니다.")
        return await call_next(request)

    @portal.get("/api/health")
    def health() -> dict:
        return {"status": "ok"}

    @portal.post("/api/auth/login")
    def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)) -> dict:
        db.execute(delete(PortalSession).where(PortalSession.expires_at <= utcnow()))
        username = payload.username.strip().lower()
        user = db.scalar(select(User).where(User.username == username))
        if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
            audit(db, request, "login_failed", user.id if user else None, f"username={username}")
            db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

        raw_token = new_session_token()
        csrf_token = new_csrf_token()
        expires_at = utcnow() + timedelta(hours=configuration.session_ttl_hours)
        portal_session = PortalSession(
            token_hash=token_digest(raw_token),
            csrf_token=csrf_token,
            user_id=user.id,
            expires_at=expires_at,
        )
        db.add(portal_session)
        audit(db, request, "login_succeeded", user.id)
        db.commit()
        response.set_cookie(
            key=configuration.session_cookie_name,
            value=raw_token,
            max_age=configuration.session_ttl_hours * 3600,
            expires=expires_at,
            path="/",
            domain=configuration.session_cookie_domain or None,
            secure=configuration.session_secure,
            httponly=True,
            samesite="lax",
        )
        return {"user": serialize_user(user), "csrfToken": csrf_token}

    @portal.get("/api/auth/me")
    def me(context: AuthContext = Depends(require_auth)) -> dict:
        return {"user": serialize_user(context.user), "csrfToken": context.session.csrf_token}

    @portal.post("/api/auth/logout")
    def logout(
        request: Request,
        response: Response,
        context: AuthContext = Depends(require_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        audit(db, request, "logout", context.user.id)
        db.delete(context.session)
        db.commit()
        response.delete_cookie(
            key=configuration.session_cookie_name,
            path="/",
            domain=configuration.session_cookie_domain or None,
            secure=configuration.session_secure,
            httponly=True,
            samesite="lax",
        )
        return {"ok": True}

    @portal.post("/api/auth/password")
    def change_password(
        payload: PasswordChangeIn,
        request: Request,
        context: AuthContext = Depends(require_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        if not verify_password(payload.current_password, context.user.password_hash):
            raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
        if payload.current_password == payload.new_password:
            raise HTTPException(status_code=422, detail="새 비밀번호는 현재 비밀번호와 달라야 합니다.")
        context.user.password_hash = hash_password(payload.new_password)
        db.execute(
            delete(PortalSession).where(
                PortalSession.user_id == context.user.id,
                PortalSession.id != context.session.id,
            )
        )
        audit(db, request, "password_changed", context.user.id)
        db.commit()
        return {"ok": True}

    @portal.get("/api/servers")
    def list_assigned_servers(
        context: AuthContext = Depends(require_auth), db: Session = Depends(get_db)
    ) -> list[dict]:
        query = select(MonitoringServer).where(MonitoringServer.is_active.is_(True))
        if not context.user.is_admin:
            query = query.join(UserServerAccess).where(UserServerAccess.user_id == context.user.id)
        servers = db.scalars(query.order_by(MonitoringServer.name)).all()
        return [serialize_server(server, configuration.base_domain) for server in servers]

    @portal.get("/api/admin/users")
    def admin_users(
        _: AuthContext = Depends(require_admin), db: Session = Depends(get_db)
    ) -> list[dict]:
        users = db.scalars(select(User).order_by(User.username)).all()
        rows = db.execute(select(UserServerAccess.user_id, UserServerAccess.server_id)).all()
        access_map: dict[int, list[int]] = {}
        for user_id, server_id in rows:
            access_map.setdefault(user_id, []).append(server_id)
        return [serialize_user(user, sorted(access_map.get(user.id, []))) for user in users]

    @portal.post("/api/admin/users", status_code=status.HTTP_201_CREATED)
    def create_user(
        payload: UserCreateIn,
        request: Request,
        context: AuthContext = Depends(require_admin_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        username = payload.username.strip().lower()
        if not USERNAME_PATTERN.fullmatch(username):
            raise HTTPException(status_code=422, detail="아이디 형식이 올바르지 않습니다.")
        user = User(
            username=username,
            password_hash=hash_password(payload.password),
            display_name=payload.display_name.strip(),
            is_admin=payload.is_admin,
        )
        db.add(user)
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.") from exc
        audit(db, request, "user_created", context.user.id, f"user_id={user.id}")
        db.commit()
        return serialize_user(user, [])

    @portal.patch("/api/admin/users/{user_id}")
    def update_user(
        user_id: int,
        payload: UserUpdateIn,
        request: Request,
        context: AuthContext = Depends(require_admin_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        if not payload.model_fields_set:
            raise HTTPException(status_code=422, detail="변경할 사용자 정보를 입력하세요.")

        username = user.username
        if payload.username is not None:
            username = payload.username.strip().lower()
            if not USERNAME_PATTERN.fullmatch(username):
                raise HTTPException(status_code=422, detail="아이디 형식이 올바르지 않습니다.")

        display_name = user.display_name
        if payload.display_name is not None:
            display_name = payload.display_name.strip()
            if not display_name:
                raise HTTPException(status_code=422, detail="표시 이름을 입력하세요.")

        next_is_admin = payload.is_admin if payload.is_admin is not None else user.is_admin
        next_is_active = payload.is_active if payload.is_active is not None else user.is_active
        if user.id == context.user.id:
            if next_is_admin != user.is_admin:
                raise HTTPException(status_code=409, detail="현재 로그인한 계정의 관리자 권한은 변경할 수 없습니다.")
            if next_is_active != user.is_active:
                raise HTTPException(status_code=409, detail="현재 로그인한 계정의 활성 상태는 변경할 수 없습니다.")

        removes_active_admin = user.is_admin and user.is_active and not (next_is_admin and next_is_active)
        if removes_active_admin:
            other_active_admin = db.scalar(
                select(User.id)
                .where(
                    User.id != user.id,
                    User.is_admin.is_(True),
                    User.is_active.is_(True),
                )
                .limit(1)
            )
            if not other_active_admin:
                raise HTTPException(status_code=409, detail="활성 관리자 계정은 최소 1개 이상 유지해야 합니다.")

        user.username = username
        user.display_name = display_name
        user.is_admin = next_is_admin
        user.is_active = next_is_active
        password_changed = payload.password is not None
        if password_changed:
            user.password_hash = hash_password(payload.password)

        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.") from exc

        if password_changed or not next_is_active:
            session_query = delete(PortalSession).where(PortalSession.user_id == user.id)
            if user.id == context.user.id:
                session_query = session_query.where(PortalSession.id != context.session.id)
            db.execute(session_query)

        changed_fields = sorted(payload.model_fields_set)
        audit(
            db,
            request,
            "user_updated",
            context.user.id,
            f"user_id={user.id};fields={changed_fields}",
        )
        server_ids = sorted(
            db.scalars(
                select(UserServerAccess.server_id).where(UserServerAccess.user_id == user.id)
            ).all()
        )
        db.commit()
        return serialize_user(user, server_ids)

    @portal.delete("/api/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_user(
        user_id: int,
        request: Request,
        context: AuthContext = Depends(require_admin_csrf),
        db: Session = Depends(get_db),
    ) -> Response:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        if user.id == context.user.id:
            raise HTTPException(status_code=409, detail="현재 로그인한 계정은 삭제할 수 없습니다.")
        if user.is_admin and user.is_active:
            other_active_admin = db.scalar(
                select(User.id)
                .where(
                    User.id != user.id,
                    User.is_admin.is_(True),
                    User.is_active.is_(True),
                )
                .limit(1)
            )
            if not other_active_admin:
                raise HTTPException(status_code=409, detail="활성 관리자 계정은 최소 1개 이상 유지해야 합니다.")

        audit(db, request, "user_deleted", context.user.id, f"user_id={user.id};username={user.username}")
        db.delete(user)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @portal.put("/api/admin/users/{user_id}/servers")
    def update_user_servers(
        user_id: int,
        payload: UserAccessIn,
        request: Request,
        context: AuthContext = Depends(require_admin_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        server_ids = sorted(set(payload.server_ids))
        existing_ids = set(db.scalars(select(MonitoringServer.id).where(MonitoringServer.id.in_(server_ids))).all())
        if existing_ids != set(server_ids):
            raise HTTPException(status_code=422, detail="존재하지 않는 서버가 포함되어 있습니다.")
        db.execute(delete(UserServerAccess).where(UserServerAccess.user_id == user_id))
        db.add_all(UserServerAccess(user_id=user_id, server_id=server_id) for server_id in server_ids)
        audit(db, request, "user_access_updated", context.user.id, f"user_id={user_id};servers={server_ids}")
        db.commit()
        return serialize_user(user, server_ids)

    @portal.get("/api/admin/servers")
    def admin_servers(
        _: AuthContext = Depends(require_admin), db: Session = Depends(get_db)
    ) -> list[dict]:
        servers = db.scalars(select(MonitoringServer).order_by(MonitoringServer.name)).all()
        return [serialize_server(server, configuration.base_domain) for server in servers]

    @portal.post("/api/admin/servers", status_code=status.HTTP_201_CREATED)
    def create_server(
        payload: ServerCreateIn,
        request: Request,
        context: AuthContext = Depends(require_admin_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        slug = payload.slug.strip().lower()
        if not SLUG_PATTERN.fullmatch(slug):
            raise HTTPException(status_code=422, detail="서버 주소 이름 형식이 올바르지 않습니다.")
        try:
            validate_target(payload.target_host, payload.target_port, configuration.allowed_target_ports_set)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        server = MonitoringServer(
            slug=slug,
            name=payload.name.strip(),
            target_host=payload.target_host,
            target_port=payload.target_port,
        )
        db.add(server)
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status_code=409, detail="이미 사용 중인 서버 주소 이름입니다.") from exc
        audit(db, request, "server_created", context.user.id, f"server_id={server.id};target={server.target_host}:{server.target_port}")
        db.commit()
        return serialize_server(server, configuration.base_domain)

    @portal.patch("/api/admin/servers/{server_id}")
    def update_server(
        server_id: int,
        payload: ServerUpdateIn,
        request: Request,
        context: AuthContext = Depends(require_admin_csrf),
        db: Session = Depends(get_db),
    ) -> dict:
        server = db.get(MonitoringServer, server_id)
        if not server:
            raise HTTPException(status_code=404, detail="서버를 찾을 수 없습니다.")
        host = payload.target_host if payload.target_host is not None else server.target_host
        port = payload.target_port if payload.target_port is not None else server.target_port
        try:
            validate_target(host, port, configuration.allowed_target_ports_set)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if payload.name is not None:
            server.name = payload.name.strip()
        server.target_host = host
        server.target_port = port
        if payload.is_active is not None:
            server.is_active = payload.is_active
        audit(db, request, "server_updated", context.user.id, f"server_id={server.id};target={host}:{port}")
        db.commit()
        return serialize_server(server, configuration.base_domain)

    @portal.get("/internal/authorize", status_code=status.HTTP_204_NO_CONTENT)
    def authorize_proxy(request: Request, db: Session = Depends(get_db)) -> Response:
        context = lookup_auth(request, db)
        if not context:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        original_host = request.headers.get("x-original-host", "").split(":", 1)[0].lower()
        suffix = f".{configuration.base_domain.lower()}"
        if not original_host.endswith(suffix):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
        slug = original_host[: -len(suffix)]
        if not SLUG_PATTERN.fullmatch(slug):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

        server = db.scalar(
            select(MonitoringServer).where(
                MonitoringServer.slug == slug,
                MonitoringServer.is_active.is_(True),
            )
        )
        if not server:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
        if not context.user.is_admin:
            allowed = db.scalar(
                select(UserServerAccess.id).where(
                    UserServerAccess.user_id == context.user.id,
                    UserServerAccess.server_id == server.id,
                )
            )
            if not allowed:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

        return Response(
            status_code=status.HTTP_204_NO_CONTENT,
            headers={
                "X-Target-Upstream": f"{server.target_host}:{server.target_port}",
                "X-Authenticated-User": context.user.username,
                "X-Monitoring-Server": server.slug,
                "Cache-Control": "no-store",
            },
        )

    portal.mount("/assets", StaticFiles(directory=FRONTEND_DIR), name="assets")

    @portal.get("/")
    @portal.get("/login")
    @portal.get("/admin")
    def portal_index() -> FileResponse:
        return FileResponse(FRONTEND_DIR / "index.html")

    return portal


app = create_app()
