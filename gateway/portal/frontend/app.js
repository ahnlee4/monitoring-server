const app = document.querySelector("#app");

const state = {
  user: null,
  csrfToken: "",
  servers: [],
  adminUsers: [],
  adminServers: [],
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.method && options.method !== "GET" && state.csrfToken) {
    headers["X-CSRF-Token"] = state.csrfToken;
  }
  const response = await fetch(path, { credentials: "same-origin", ...options, headers });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail || "요청을 처리하지 못했습니다.");
    error.status = response.status;
    throw error;
  }
  return body;
}

function message(text, type = "error") {
  const element = document.querySelector("#form-message");
  if (!element) return;
  element.textContent = text;
  element.className = `message ${type}`;
}

function loginView() {
  app.innerHTML = `
    <section class="login-layout">
      <div class="brand-panel">
        <p class="eyebrow">INDUSTRIAL MONITORING</p>
        <h1>설비 상태를<br />한 곳에서 확인하세요.</h1>
        <p class="brand-copy">승인된 사용자만 담당 현장의 실시간 모니터링 서버에 접속할 수 있습니다.</p>
        <div class="status-line"><span></span> 보안 연결 준비됨</div>
      </div>
      <form id="login-form" class="card login-card">
        <div>
          <p class="eyebrow">ACCOUNT ACCESS</p>
          <h2>로그인</h2>
          <p class="muted">발급받은 계정으로 접속하세요.</p>
        </div>
        <label>아이디<input name="username" autocomplete="username" minlength="3" maxlength="64" required autofocus /></label>
        <label>비밀번호<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required /></label>
        <p id="form-message" class="message" role="alert"></p>
        <button class="primary" type="submit">모니터링 접속</button>
      </form>
    </section>`;

  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    const form = new FormData(event.currentTarget);
    button.disabled = true;
    message("");
    try {
      const result = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      state.user = result.user;
      state.csrfToken = result.csrfToken;
      state.servers = await api("/api/servers");
      const next = new URLSearchParams(location.search).get("next");
      const allowedNext = state.servers.find((server) => server.url === next);
      if (allowedNext) {
        location.assign(allowedNext.url);
        return;
      }
      if (state.servers.length === 1 && !state.user.isAdmin) {
        location.assign(state.servers[0].url);
        return;
      }
      history.replaceState({}, "", "/");
      dashboardView();
    } catch (error) {
      message(error.message);
    } finally {
      button.disabled = false;
    }
  });
}

function header(title) {
  return `
    <header class="topbar">
      <div><p class="eyebrow">TMS CONTROL CENTER</p><h1>${escapeHtml(title)}</h1></div>
      <div class="user-actions">
        <span><strong>${escapeHtml(state.user.displayName)}</strong><small>${escapeHtml(state.user.username)}</small></span>
        ${state.user.isAdmin ? '<a class="secondary" href="/admin">관리</a>' : ""}
        <button id="password-button" class="ghost" type="button">비밀번호</button>
        <button id="logout-button" class="ghost" type="button">로그아웃</button>
      </div>
    </header>
    <dialog id="password-dialog" class="password-dialog">
      <form id="password-form" class="form-card" method="dialog">
        <div><p class="eyebrow">SECURITY</p><h2>비밀번호 변경</h2></div>
        <label>현재 비밀번호<input name="currentPassword" type="password" autocomplete="current-password" required /></label>
        <label>새 비밀번호<input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required /></label>
        <p class="form-help">12자 이상으로 설정하세요. 다른 기기의 로그인은 해제됩니다.</p>
        <p class="message dialog-message" role="alert"></p>
        <div class="dialog-actions"><button class="ghost cancel-password" type="button">취소</button><button class="primary" type="submit">변경</button></div>
      </form>
    </dialog>`;
}

function wireAccountActions() {
  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      state.user = null;
      state.csrfToken = "";
      history.replaceState({}, "", "/login");
      loginView();
    }
  });
  const dialog = document.querySelector("#password-dialog");
  document.querySelector("#password-button")?.addEventListener("click", () => dialog?.showModal());
  document.querySelector(".cancel-password")?.addEventListener("click", () => dialog?.close());
  document.querySelector("#password-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dialogMessage = event.currentTarget.querySelector(".dialog-message");
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: form.get("currentPassword"),
          new_password: form.get("newPassword"),
        }),
      });
      event.currentTarget.reset();
      dialog?.close();
    } catch (error) {
      dialogMessage.textContent = error.message;
    }
  });
}

function serverCards(servers) {
  if (!servers.length) {
    return '<div class="empty-state"><strong>접속 가능한 서버가 없습니다.</strong><p>관리자에게 현장 서버 권한을 요청하세요.</p></div>';
  }
  return `<div class="server-grid">${servers
    .map(
      (server) => `
        <a class="server-card" href="${escapeHtml(server.url)}">
          <div class="server-icon"><span></span><span></span><span></span></div>
          <div><h3>${escapeHtml(server.name)}</h3><p>${escapeHtml(server.slug)}.${escapeHtml(location.hostname)}</p></div>
          <span class="open-arrow">→</span>
        </a>`,
    )
    .join("")}</div>`;
}

function dashboardView() {
  app.innerHTML = `
    ${header("모니터링 서버")}
    <section class="content">
      <div class="section-heading"><div><h2>접속할 현장을 선택하세요</h2><p>계정에 허용된 서버만 표시됩니다.</p></div><span class="count">${state.servers.length}개 서버</span></div>
      ${serverCards(state.servers)}
    </section>`;
  wireAccountActions();
}

async function refreshAdminData() {
  [state.adminUsers, state.adminServers] = await Promise.all([
    api("/api/admin/users"),
    api("/api/admin/servers"),
  ]);
}

function accessRows() {
  return state.adminUsers
    .map(
      (user) => `
      <div class="access-row">
        <div><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.username)}${user.isAdmin ? " · 관리자" : ""}</small></div>
        <div class="checks">
          ${state.adminServers
            .map(
              (server) => `<label><input type="checkbox" data-user="${user.id}" value="${server.id}" ${user.serverIds.includes(server.id) ? "checked" : ""} ${user.isAdmin ? "disabled" : ""} />${escapeHtml(server.name)}</label>`,
            )
            .join("") || '<span class="muted">등록된 서버 없음</span>'}
        </div>
        <button class="secondary save-access" data-user="${user.id}" ${user.isAdmin ? "disabled" : ""}>권한 저장</button>
      </div>`,
    )
    .join("");
}

function adminView() {
  app.innerHTML = `
    ${header("포털 관리")}
    <section class="content admin-content">
      <a class="back-link" href="/">← 서버 선택으로 돌아가기</a>
      <div class="admin-grid">
        <form id="server-form" class="card form-card">
          <div><p class="eyebrow">SERVER</p><h2>모니터링 서버 등록</h2></div>
          <label>현장 이름<input name="name" maxlength="128" placeholder="본사 압축기실" required /></label>
          <label>주소 이름<input name="slug" pattern="[a-z0-9][a-z0-9-]*[a-z0-9]|[a-z0-9]" placeholder="head-office" required /></label>
          <div class="inline-fields"><label>내부 IP<input name="targetHost" placeholder="192.168.0.101" required /></label><label>포트<input name="targetPort" type="number" value="80" min="1" max="65535" required /></label></div>
          <p class="form-help">외부 주소는 주소 이름을 기준으로 자동 생성됩니다.</p>
          <button class="primary" type="submit">서버 등록</button>
        </form>
        <form id="user-form" class="card form-card">
          <div><p class="eyebrow">USER</p><h2>사용자 등록</h2></div>
          <label>표시 이름<input name="displayName" maxlength="128" required /></label>
          <label>아이디<input name="username" minlength="3" maxlength="64" pattern="[A-Za-z0-9_.-]+" required /></label>
          <label>임시 비밀번호<input name="password" type="password" minlength="12" maxlength="128" required /></label>
          <label class="check-line"><input name="isAdmin" type="checkbox" /> 관리자 권한 부여</label>
          <button class="primary" type="submit">사용자 등록</button>
        </form>
      </div>
      <p id="form-message" class="message" role="alert"></p>
      <section class="card table-card">
        <div class="section-heading"><div><p class="eyebrow">ACCESS CONTROL</p><h2>사용자별 서버 권한</h2></div></div>
        <div class="access-list">${accessRows()}</div>
      </section>
      <section class="card table-card">
        <div class="section-heading"><div><p class="eyebrow">REGISTERED SERVERS</p><h2>등록 서버</h2></div></div>
        <div class="registered-list">${state.adminServers
          .map(
            (server) => `<div><span class="server-state ${server.isActive ? "online" : "off"}"></span><strong>${escapeHtml(server.name)}</strong><code>${escapeHtml(server.targetHost)}:${server.targetPort}</code><a href="${escapeHtml(server.url)}">${escapeHtml(server.slug)}</a><button class="ghost toggle-server" data-id="${server.id}" data-active="${server.isActive}">${server.isActive ? "비활성화" : "활성화"}</button></div>`,
          )
          .join("") || '<p class="muted">등록된 서버가 없습니다.</p>'}</div>
      </section>
    </section>`;

  wireAccountActions();
  document.querySelector("#server-form").addEventListener("submit", submitServer);
  document.querySelector("#user-form").addEventListener("submit", submitUser);
  document.querySelectorAll(".save-access").forEach((button) => button.addEventListener("click", saveAccess));
  document.querySelectorAll(".toggle-server").forEach((button) => button.addEventListener("click", toggleServer));
}

async function redrawAdmin(successText) {
  await refreshAdminData();
  adminView();
  if (successText) message(successText, "success");
}

async function submitServer(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/admin/servers", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        target_host: form.get("targetHost"),
        target_port: Number(form.get("targetPort")),
      }),
    });
    await redrawAdmin("서버를 등록했습니다.");
  } catch (error) {
    message(error.message);
  }
}

async function submitUser(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        display_name: form.get("displayName"),
        username: form.get("username"),
        password: form.get("password"),
        is_admin: form.get("isAdmin") === "on",
      }),
    });
    await redrawAdmin("사용자를 등록했습니다.");
  } catch (error) {
    message(error.message);
  }
}

async function saveAccess(event) {
  event.preventDefault();
  const userId = Number(event.currentTarget.dataset.user);
  const serverIds = [...document.querySelectorAll(`input[data-user="${userId}"]:checked`)].map((input) => Number(input.value));
  try {
    await api(`/api/admin/users/${userId}/servers`, {
      method: "PUT",
      body: JSON.stringify({ server_ids: serverIds }),
    });
    message("서버 접근 권한을 저장했습니다.", "success");
  } catch (error) {
    message(error.message);
  }
}

async function toggleServer(event) {
  const button = event.currentTarget;
  try {
    await api(`/api/admin/servers/${button.dataset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: button.dataset.active !== "true" }),
    });
    await redrawAdmin("서버 상태를 변경했습니다.");
  } catch (error) {
    message(error.message);
  }
}

async function boot() {
  try {
    const result = await api("/api/auth/me");
    state.user = result.user;
    state.csrfToken = result.csrfToken;
    state.servers = await api("/api/servers");
    if (location.pathname === "/admin") {
      if (!state.user.isAdmin) {
        history.replaceState({}, "", "/");
        dashboardView();
        return;
      }
      await refreshAdminData();
      adminView();
      return;
    }
    dashboardView();
  } catch (error) {
    if (error.status !== 401) console.error(error);
    loginView();
  }
}

boot();
