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
  if (element.dataset.toast === "true") element.classList.add("admin-toast");
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

function permissionOptions({ user = null, name = "", disabled = false } = {}) {
  if (!state.adminServers.length) {
    return `
      <div class="permission-empty">
        <strong>선택할 서버가 없습니다.</strong>
        <span>먼저 모니터링 서버를 등록하세요.</span>
      </div>`;
  }

  const selectedIds = user?.isAdmin
    ? state.adminServers.filter((server) => server.isActive).map((server) => server.id)
    : user?.serverIds || [];
  return state.adminServers
    .map(
      (server) => `
        <label class="permission-option ${server.isActive ? "" : "is-paused"}">
          <input
            type="checkbox"
            ${user ? `class="access-server-checkbox" data-user="${user.id}"` : ""}
            ${name ? `name="${name}"` : ""}
            value="${server.id}"
            ${selectedIds.includes(server.id) ? "checked" : ""}
            ${disabled ? "disabled" : ""}
          />
          <span class="permission-mark" aria-hidden="true">✓</span>
          <span class="permission-copy">
            <strong>${escapeHtml(server.name)}</strong>
            <small>${escapeHtml(server.slug)}${server.isActive ? "" : " · 운영 중지"}</small>
          </span>
        </label>`,
    )
    .join("");
}

function accessRows() {
  if (!state.adminUsers.length) {
    return `
      <div class="management-empty">
        <strong>등록된 사용자가 없습니다.</strong>
        <p>위의 사용자 등록에서 첫 계정을 추가하세요.</p>
      </div>`;
  }

  return [...state.adminUsers]
    .sort(
      (left, right) =>
        Number(right.isAdmin) - Number(left.isAdmin) ||
        Number(right.isActive) - Number(left.isActive) ||
        left.displayName.localeCompare(right.displayName, "ko"),
    )
    .map((user) => {
      const accessCount = user.isAdmin
        ? state.adminServers.filter((server) => server.isActive).length
        : user.serverIds.length;
      const searchText = `${user.displayName} ${user.username}`.toLowerCase();
      return `
        <article class="access-card" data-user-card data-search="${escapeHtml(searchText)}">
          <div class="access-card-head">
            <div class="user-identity">
              <span class="user-avatar">${escapeHtml(user.displayName.trim().charAt(0) || "U")}</span>
              <div>
                <div class="identity-line">
                  <h3>${escapeHtml(user.displayName)}</h3>
                  ${user.isAdmin ? '<span class="status-badge admin">관리자</span>' : ""}
                  <span class="status-badge ${user.isActive ? "active" : "inactive"}">${user.isActive ? "사용 중" : "로그인 차단"}</span>
                </div>
                <p>@${escapeHtml(user.username)}</p>
              </div>
            </div>
            <button class="ghost compact-button edit-user" type="button" data-user="${user.id}">계정 정보 수정</button>
          </div>
          <div class="access-card-body">
            <div class="permission-title">
              <div>
                <strong>접속 서버</strong>
                <span>${user.isAdmin ? "관리자는 활성 서버에 자동으로 접근합니다." : "이 사용자가 접속할 현장을 선택하세요."}</span>
              </div>
              <span class="permission-count"><strong>${accessCount}</strong>개 허용</span>
            </div>
            <div class="permission-selector ${user.isAdmin ? "is-readonly" : ""}">
              ${permissionOptions({ user, disabled: user.isAdmin })}
            </div>
          </div>
          <div class="access-card-actions">
            ${
              user.isAdmin
                ? '<p><span aria-hidden="true">●</span> 별도 권한 저장이 필요하지 않습니다.</p>'
                : `
                  <div class="quick-select">
                    <button class="text-button select-all-access" type="button" data-user="${user.id}">전체 선택</button>
                    <button class="text-button clear-access" type="button" data-user="${user.id}">선택 해제</button>
                  </div>
                  <button class="secondary save-access" type="button" data-user="${user.id}">권한 저장</button>`
            }
          </div>
        </article>`;
    })
    .join("");
}

function registeredServerCards() {
  if (!state.adminServers.length) {
    return `
      <div class="management-empty">
        <strong>등록된 서버가 없습니다.</strong>
        <p>위의 서버 등록 양식에서 첫 현장을 연결하세요.</p>
      </div>`;
  }

  return state.adminServers
    .map(
      (server) => `
        <article class="managed-server-card" data-server-card data-search="${escapeHtml(`${server.name} ${server.slug} ${server.targetHost}`.toLowerCase())}">
          <div class="managed-server-main">
            <span class="server-status-icon ${server.isActive ? "active" : "inactive"}" aria-hidden="true"></span>
            <div>
              <div class="identity-line">
                <h3>${escapeHtml(server.name)}</h3>
                <span class="status-badge ${server.isActive ? "active" : "inactive"}">${server.isActive ? "운영 중" : "운영 중지"}</span>
              </div>
              <a class="server-public-url" href="${escapeHtml(server.url)}" target="_blank" rel="noreferrer">${escapeHtml(server.url)}</a>
            </div>
          </div>
          <div class="server-endpoint">
            <span>내부 연결 주소</span>
            <code>${escapeHtml(server.targetHost)}:${server.targetPort}</code>
          </div>
          <div class="managed-server-actions">
            <button class="ghost compact-button edit-server" type="button" data-id="${server.id}">연결 정보 수정</button>
            <button class="${server.isActive ? "pause-button" : "secondary"} toggle-server" type="button" data-id="${server.id}" data-active="${server.isActive}">
              ${server.isActive ? "운영 중지" : "다시 활성화"}
            </button>
          </div>
        </article>`,
    )
    .join("");
}

function adminView() {
  const activeUsers = state.adminUsers.filter((user) => user.isActive).length;
  const activeServers = state.adminServers.filter((server) => server.isActive).length;
  const accessCount = state.adminUsers.reduce(
    (total, user) => total + (user.isAdmin ? activeServers : user.serverIds.length),
    0,
  );

  app.innerHTML = `
    ${header("포털 관리")}
    <section class="content admin-content">
      <a class="back-link" href="/">← 서버 선택으로 돌아가기</a>
      <section class="admin-hero">
        <div>
          <p class="eyebrow">ADMIN WORKSPACE</p>
          <h2>서버와 사용자 연결을 한 화면에서 관리하세요.</h2>
          <p>서버를 먼저 등록하고, 사용자를 만들면서 접속 권한까지 바로 지정할 수 있습니다.</p>
        </div>
        <div class="admin-summary" aria-label="등록 현황">
          <div><span>사용자</span><strong>${activeUsers}</strong><small>전체 ${state.adminUsers.length}명</small></div>
          <div><span>운영 서버</span><strong>${activeServers}</strong><small>전체 ${state.adminServers.length}대</small></div>
          <div><span>권한 연결</span><strong>${accessCount}</strong><small>현재 허용 건수</small></div>
        </div>
      </section>

      <div class="setup-grid">
        <form id="server-form" class="card setup-card">
          <div class="setup-card-head">
            <span class="step-number">1</span>
            <div>
              <p class="eyebrow">SERVER SETUP</p>
              <h2>모니터링 서버 등록</h2>
              <p>현장 PC의 내부 주소와 외부 접속 이름을 연결합니다.</p>
            </div>
          </div>
          <div class="form-section">
            <label>
              <span>현장 이름 <small>목록에 표시되는 이름</small></span>
              <input name="name" maxlength="128" placeholder="예: 본사 압축기실" required />
            </label>
            <label>
              <span>접속 주소 이름 <small>영문 소문자·숫자·하이픈</small></span>
              <div class="slug-field">
                <input name="slug" pattern="[a-z0-9][a-z0-9-]*[a-z0-9]|[a-z0-9]" maxlength="63" inputmode="url" autocapitalize="none" spellcheck="false" placeholder="head-office" required />
                <span>.${escapeHtml(location.hostname)}</span>
              </div>
            </label>
            <div class="inline-fields">
              <label><span>내부 IP <small>현장 PC 주소</small></span><input name="targetHost" inputmode="decimal" placeholder="192.168.0.101" required /></label>
              <label><span>포트</span><input name="targetPort" type="number" value="80" min="1" max="65535" required /></label>
            </div>
          </div>
          <div class="endpoint-preview">
            <span>생성될 접속 주소</span>
            <strong id="server-url-preview">주소 이름을 입력하세요</strong>
          </div>
          <button class="primary full-button" type="submit">서버 등록하기</button>
        </form>

        <form id="user-form" class="card setup-card">
          <div class="setup-card-head">
            <span class="step-number">2</span>
            <div>
              <p class="eyebrow">USER & ACCESS</p>
              <h2>사용자와 권한 등록</h2>
              <p>계정을 만들고 접속 가능한 서버를 함께 지정합니다.</p>
            </div>
          </div>
          <div class="user-fields">
            <label><span>사용자 이름 <small>화면에 표시되는 이름</small></span><input name="displayName" maxlength="128" placeholder="예: 생산팀 홍길동" required /></label>
            <label><span>로그인 아이디 <small>영문·숫자·._- 사용 가능</small></span><input name="username" minlength="3" maxlength="64" pattern="[A-Za-z0-9_.-]+" autocapitalize="none" spellcheck="false" placeholder="예: operator01" required /></label>
          </div>
          <label><span>임시 비밀번호 <small>12자 이상, 최초 로그인 후 변경 안내</small></span><input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" placeholder="12자 이상 입력" required /></label>
          <fieldset class="role-fieldset">
            <legend>계정 역할</legend>
            <div class="role-options">
              <label class="role-option">
                <input name="role" type="radio" value="user" checked />
                <span><strong>일반 사용자</strong><small>선택한 서버만 접속</small></span>
              </label>
              <label class="role-option">
                <input name="role" type="radio" value="admin" />
                <span><strong>관리자</strong><small>모든 서버와 관리 기능 사용</small></span>
              </label>
            </div>
          </fieldset>
          <fieldset id="new-user-permissions" class="permission-fieldset">
            <legend class="sr-only">접속 서버 선택</legend>
            <div class="permission-title">
              <strong>접속 서버 선택</strong>
              <span id="selected-server-count">0개 선택</span>
            </div>
            <div class="permission-selector permission-selector-create">
              ${permissionOptions({ name: "serverIds" })}
            </div>
            <p id="admin-permission-note" class="form-help">사용자가 로그인 후 볼 수 있는 서버를 선택하세요.</p>
          </fieldset>
          <button class="primary full-button" type="submit">사용자와 권한 등록하기</button>
        </form>
      </div>

      <p id="form-message" class="message admin-toast" data-toast="true" role="status" aria-live="polite"></p>

      <section class="management-section">
        <div class="management-heading">
          <div>
            <p class="eyebrow">ACCESS CONTROL</p>
            <h2>사용자 권한 관리</h2>
            <p>계정별로 접속 서버를 변경하고 계정 상태를 관리합니다.</p>
          </div>
          <label class="search-field">
            <span aria-hidden="true">⌕</span>
            <input id="user-search" type="search" placeholder="사용자 이름 또는 아이디 검색" />
          </label>
        </div>
        <div class="access-list">${accessRows()}</div>
      </section>

      <section class="management-section">
        <div class="management-heading">
          <div>
            <p class="eyebrow">REGISTERED SERVERS</p>
            <h2>등록 서버 관리</h2>
            <p>외부 접속 주소와 내부 연결 정보를 확인하고 운영 상태를 변경합니다.</p>
          </div>
          <label class="search-field">
            <span aria-hidden="true">⌕</span>
            <input id="server-search" type="search" placeholder="서버 이름, 주소 또는 IP 검색" />
          </label>
        </div>
        <div class="registered-list">${registeredServerCards()}</div>
      </section>
    </section>
    <dialog id="user-dialog" class="password-dialog">
      <form id="user-edit-form" class="form-card">
        <div><p class="eyebrow">ACCOUNT</p><h2>계정 수정</h2></div>
        <label>표시 이름<input name="displayName" maxlength="128" required /></label>
        <label>아이디<input name="username" minlength="3" maxlength="64" pattern="[A-Za-z0-9_.-]+" required /></label>
        <label>새 비밀번호<input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" placeholder="변경하지 않으면 비워두세요" /></label>
        <div class="account-options">
          <label class="check-line"><input name="isAdmin" type="checkbox" /> 관리자 권한</label>
          <label class="check-line"><input name="isActive" type="checkbox" /> 계정 활성화</label>
        </div>
        <p class="form-help account-help"></p>
        <p class="message dialog-message" role="alert"></p>
        <div class="dialog-actions split-actions">
          <button class="danger delete-user" type="button">계정 삭제</button>
          <span></span>
          <button class="ghost cancel-user-edit" type="button">취소</button>
          <button class="primary" type="submit">저장</button>
        </div>
      </form>
    </dialog>
    <dialog id="server-dialog" class="password-dialog server-dialog">
      <form id="server-edit-form" class="form-card">
        <div><p class="eyebrow">SERVER CONNECTION</p><h2>서버 연결 정보 수정</h2></div>
        <div class="dialog-server-address"><span>외부 접속 주소</span><strong class="server-dialog-url"></strong></div>
        <label>현장 이름<input name="name" maxlength="128" required /></label>
        <div class="inline-fields">
          <label>내부 IP<input name="targetHost" inputmode="decimal" required /></label>
          <label>포트<input name="targetPort" type="number" min="1" max="65535" required /></label>
        </div>
        <label class="check-line"><input name="isActive" type="checkbox" /> 서버 운영 활성화</label>
        <p class="form-help">접속 주소 이름은 등록 후 변경할 수 없습니다.</p>
        <p class="message dialog-message" role="alert"></p>
        <div class="dialog-actions">
          <button class="ghost cancel-server-edit" type="button">취소</button>
          <button class="primary" type="submit">연결 정보 저장</button>
        </div>
      </form>
    </dialog>`;

  wireAccountActions();
  document.querySelector("#server-form").addEventListener("submit", submitServer);
  document.querySelector("#user-form").addEventListener("submit", submitUser);
  document.querySelectorAll(".save-access").forEach((button) => button.addEventListener("click", saveAccess));
  document.querySelectorAll(".edit-user").forEach((button) => button.addEventListener("click", openUserEditor));
  document.querySelectorAll(".edit-server").forEach((button) => button.addEventListener("click", openServerEditor));
  document.querySelectorAll(".toggle-server").forEach((button) => button.addEventListener("click", toggleServer));
  document.querySelectorAll(".select-all-access").forEach((button) => button.addEventListener("click", selectAllAccess));
  document.querySelectorAll(".clear-access").forEach((button) => button.addEventListener("click", clearAccess));
  document.querySelectorAll(".access-server-checkbox").forEach((input) => input.addEventListener("change", markAccessDirty));
  document.querySelector(".cancel-user-edit").addEventListener("click", () => document.querySelector("#user-dialog").close());
  document.querySelector("#user-edit-form").addEventListener("submit", submitUserUpdate);
  document.querySelector(".delete-user").addEventListener("click", deleteUser);
  document.querySelector(".cancel-server-edit").addEventListener("click", () => document.querySelector("#server-dialog").close());
  document.querySelector("#server-edit-form").addEventListener("submit", submitServerUpdate);
  wireAdminFormHelpers();
  wireAdminSearch();
}

async function redrawAdmin(successText) {
  await refreshAdminData();
  adminView();
  if (successText) message(successText, "success");
}

function wireAdminFormHelpers() {
  const slugInput = document.querySelector('#server-form input[name="slug"]');
  const preview = document.querySelector("#server-url-preview");
  const updateServerPreview = () => {
    slugInput.value = slugInput.value.toLowerCase();
    preview.textContent = slugInput.value
      ? `https://${slugInput.value}.${location.hostname}`
      : "주소 이름을 입력하세요";
  };
  slugInput.addEventListener("input", updateServerPreview);

  const permissionFieldset = document.querySelector("#new-user-permissions");
  const permissionNote = document.querySelector("#admin-permission-note");
  const permissionInputs = [...document.querySelectorAll('#user-form input[name="serverIds"]')];
  const updatePermissionCount = () => {
    const isAdmin = document.querySelector('#user-form input[name="role"]:checked')?.value === "admin";
    const selectedCount = permissionInputs.filter((input) => input.checked).length;
    document.querySelector("#selected-server-count").textContent = isAdmin
      ? "전체 서버 자동 허용"
      : `${selectedCount}개 선택`;
  };
  const updateRole = () => {
    const isAdmin = document.querySelector('#user-form input[name="role"]:checked')?.value === "admin";
    permissionFieldset.disabled = isAdmin;
    permissionFieldset.classList.toggle("is-disabled", isAdmin);
    permissionNote.textContent = isAdmin
      ? "관리자는 현재 및 향후 등록되는 모든 활성 서버에 자동으로 접근합니다."
      : "사용자가 로그인 후 볼 수 있는 서버를 선택하세요.";
    updatePermissionCount();
  };
  document.querySelectorAll('#user-form input[name="role"]').forEach((input) => input.addEventListener("change", updateRole));
  permissionInputs.forEach((input) => input.addEventListener("change", updatePermissionCount));
  updateRole();
}

function wireAdminSearch() {
  const wireSearch = (inputSelector, itemSelector) => {
    const input = document.querySelector(inputSelector);
    input?.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      document.querySelectorAll(itemSelector).forEach((item) => {
        item.hidden = Boolean(query) && !item.dataset.search.includes(query);
      });
    });
  };
  wireSearch("#user-search", "[data-user-card]");
  wireSearch("#server-search", "[data-server-card]");
}

function updateAccessCardState(userId, dirty = true) {
  const card = document.querySelector(`[data-user-card] input[data-user="${userId}"]`)?.closest(".access-card");
  if (!card) return;
  const selectedCount = card.querySelectorAll(`input[data-user="${userId}"]:checked`).length;
  const count = card.querySelector(".permission-count strong");
  const saveButton = card.querySelector(".save-access");
  if (count) count.textContent = String(selectedCount);
  card.classList.toggle("has-changes", dirty);
  if (saveButton) saveButton.textContent = dirty ? "변경사항 저장" : "권한 저장";
}

function markAccessDirty(event) {
  updateAccessCardState(Number(event.currentTarget.dataset.user));
}

function setAccessSelection(userId, checked) {
  document.querySelectorAll(`input[data-user="${userId}"]:not(:disabled)`).forEach((input) => {
    input.checked = checked;
  });
  updateAccessCardState(userId);
}

function selectAllAccess(event) {
  setAccessSelection(Number(event.currentTarget.dataset.user), true);
}

function clearAccess(event) {
  setAccessSelection(Number(event.currentTarget.dataset.user), false);
}

async function submitServer(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const form = new FormData(event.currentTarget);
  button.disabled = true;
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
    button.disabled = false;
  }
}

async function submitUser(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const form = new FormData(event.currentTarget);
  button.disabled = true;
  try {
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        display_name: form.get("displayName"),
        username: form.get("username"),
        password: form.get("password"),
        is_admin: form.get("role") === "admin",
        server_ids: form.getAll("serverIds").map(Number),
      }),
    });
    await redrawAdmin("사용자와 서버 권한을 등록했습니다.");
  } catch (error) {
    message(error.message);
    button.disabled = false;
  }
}

function openUserEditor(event) {
  const user = state.adminUsers.find((item) => item.id === Number(event.currentTarget.dataset.user));
  if (!user) return;

  const form = document.querySelector("#user-edit-form");
  const isSelf = user.id === state.user.id;
  form.dataset.user = String(user.id);
  form.elements.displayName.value = user.displayName;
  form.elements.username.value = user.username;
  form.elements.password.value = "";
  form.elements.isAdmin.checked = user.isAdmin;
  form.elements.isAdmin.disabled = isSelf;
  form.elements.isActive.checked = user.isActive;
  form.elements.isActive.disabled = isSelf;
  form.querySelector(".delete-user").disabled = isSelf;
  form.querySelector(".account-help").textContent = isSelf
    ? "현재 로그인한 계정은 권한 변경이나 삭제를 할 수 없습니다."
    : "비밀번호 또는 활성 상태를 변경하면 해당 계정의 기존 로그인이 해제됩니다.";
  form.querySelector(".dialog-message").textContent = "";
  document.querySelector("#user-dialog").showModal();
}

async function submitUserUpdate(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const userId = Number(formElement.dataset.user);
  const password = String(form.get("password") || "");
  const payload = {
    display_name: form.get("displayName"),
    username: form.get("username"),
    is_admin: formElement.elements.isAdmin.checked,
    is_active: formElement.elements.isActive.checked,
  };
  if (password) payload.password = password;

  try {
    const updatedUser = await api(`/api/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (state.user.id === updatedUser.id) {
      state.user = { ...state.user, ...updatedUser };
    }
    document.querySelector("#user-dialog").close();
    await redrawAdmin("계정 정보를 수정했습니다.");
  } catch (error) {
    formElement.querySelector(".dialog-message").textContent = error.message;
  }
}

async function deleteUser(event) {
  const formElement = event.currentTarget.closest("form");
  const userId = Number(formElement.dataset.user);
  const user = state.adminUsers.find((item) => item.id === userId);
  if (!user || !confirm(`${user.displayName} (${user.username}) 계정을 삭제하시겠습니까?`)) return;

  try {
    await api(`/api/admin/users/${userId}`, { method: "DELETE" });
    document.querySelector("#user-dialog").close();
    await redrawAdmin("계정을 삭제했습니다.");
  } catch (error) {
    formElement.querySelector(".dialog-message").textContent = error.message;
  }
}

async function saveAccess(event) {
  event.preventDefault();
  const userId = Number(event.currentTarget.dataset.user);
  const button = event.currentTarget;
  const serverIds = [...document.querySelectorAll(`input[data-user="${userId}"]:checked`)].map((input) => Number(input.value));
  button.disabled = true;
  try {
    const updatedUser = await api(`/api/admin/users/${userId}/servers`, {
      method: "PUT",
      body: JSON.stringify({ server_ids: serverIds }),
    });
    state.adminUsers = state.adminUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user));
    updateAccessCardState(userId, false);
    message("서버 접근 권한을 저장했습니다.", "success");
  } catch (error) {
    message(error.message);
  } finally {
    button.disabled = false;
  }
}

function openServerEditor(event) {
  const server = state.adminServers.find((item) => item.id === Number(event.currentTarget.dataset.id));
  if (!server) return;

  const form = document.querySelector("#server-edit-form");
  form.dataset.server = String(server.id);
  form.elements.name.value = server.name;
  form.elements.targetHost.value = server.targetHost;
  form.elements.targetPort.value = server.targetPort;
  form.elements.isActive.checked = server.isActive;
  form.querySelector(".server-dialog-url").textContent = server.url;
  form.querySelector(".dialog-message").textContent = "";
  document.querySelector("#server-dialog").showModal();
}

async function submitServerUpdate(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const button = formElement.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await api(`/api/admin/servers/${Number(formElement.dataset.server)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: form.get("name"),
        target_host: form.get("targetHost"),
        target_port: Number(form.get("targetPort")),
        is_active: formElement.elements.isActive.checked,
      }),
    });
    document.querySelector("#server-dialog").close();
    await redrawAdmin("서버 연결 정보를 수정했습니다.");
  } catch (error) {
    formElement.querySelector(".dialog-message").textContent = error.message;
    button.disabled = false;
  }
}

async function toggleServer(event) {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await api(`/api/admin/servers/${button.dataset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: button.dataset.active !== "true" }),
    });
    await redrawAdmin("서버 상태를 변경했습니다.");
  } catch (error) {
    message(error.message);
    button.disabled = false;
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
