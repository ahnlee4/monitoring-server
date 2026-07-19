const PRIVACY_VERSION = "2026-07-19";

const phoneDisplay = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export function createRegistrationViews({ app, api }) {
  let verificationToken = "";
  let verifiedEmail = "";
  let cooldownTimer = null;

  const showMessage = (text, type = "error") => {
    const element = document.querySelector("#form-message");
    if (!element) return;
    element.textContent = text;
    element.className = `message signup-message ${type}`;
  };

  const clearCooldown = () => {
    if (cooldownTimer) window.clearInterval(cooldownTimer);
    cooldownTimer = null;
  };

  const startCooldown = (seconds) => {
    clearCooldown();
    const button = document.querySelector("#send-email-code");
    if (!button) return;
    let remaining = seconds;
    button.disabled = true;
    button.textContent = `${remaining}초 후 재요청`;
    cooldownTimer = window.setInterval(() => {
      remaining -= 1;
      if (!button.isConnected || remaining <= 0) {
        clearCooldown();
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = "인증번호 다시 받기";
        }
        return;
      }
      button.textContent = `${remaining}초 후 재요청`;
    }, 1000);
  };

  const resetEmailVerification = () => {
    verificationToken = "";
    verifiedEmail = "";
    document.querySelector("#email-verified-state")?.classList.add("is-hidden");
    document.querySelector("#email-code-fields")?.classList.add("is-hidden");
    const emailInput = document.querySelector('#signup-form input[name="email"]');
    if (emailInput) emailInput.readOnly = false;
  };

  const signupCompleteView = () => {
    clearCooldown();
    app.innerHTML = `
      <section class="registration-page simple-registration completion-page">
        <a class="registration-brand" href="/login"><span class="brand-mark">T</span><span><strong>THE IN TECH</strong><small>TMS CONTROL CENTER</small></span></a>
        <div class="completion-card card">
          <span class="completion-icon" aria-hidden="true">✓</span>
          <h1>가입 신청 완료</h1>
          <p>관리자가 서버를 배정하고 승인하면 로그인할 수 있습니다.</p>
          <a class="primary completion-button" href="/login">로그인</a>
        </div>
      </section>`;
  };

  const wireSignupForm = (options) => {
    const form = document.querySelector("#signup-form");
    const emailPanel = document.querySelector("#email-contact-panel");
    const phonePanel = document.querySelector("#phone-contact-panel");
    const emailInput = form.elements.email;
    const phoneInput = form.elements.phone;
    const sendButton = document.querySelector("#send-email-code");

    const updateContactPanel = () => {
      const contactType = form.elements.contactType.value;
      emailPanel.classList.toggle("is-hidden", contactType !== "email");
      phonePanel.classList.toggle("is-hidden", contactType !== "phone");
      emailInput.required = contactType === "email";
      phoneInput.required = contactType === "phone";
      showMessage("");
    };

    form.querySelectorAll('input[name="contactType"]').forEach((input) => {
      input.addEventListener("change", updateContactPanel);
    });
    updateContactPanel();

    emailInput.addEventListener("input", () => {
      if (emailInput.value.trim().toLowerCase() !== verifiedEmail) {
        resetEmailVerification();
      }
    });
    phoneInput.addEventListener("input", () => {
      phoneInput.value = phoneDisplay(phoneInput.value);
    });

    if (!options.emailVerificationAvailable) {
      sendButton.disabled = true;
      sendButton.textContent = "이메일 발송 준비 중";
      document.querySelector("#email-availability-note").textContent =
        "현재 이메일 발송 설정이 완료되지 않았습니다. 휴대전화 번호로 가입해 주세요.";
      document.querySelector("#email-availability-note").classList.add("warning");
    }

    sendButton.addEventListener("click", async () => {
      if (!emailInput.reportValidity()) return;
      sendButton.disabled = true;
      showMessage("");
      try {
        const result = await api("/api/signup/email/send", {
          method: "POST",
          body: JSON.stringify({ email: emailInput.value }),
        });
        document.querySelector("#email-code-fields").classList.remove("is-hidden");
        form.elements.emailCode.focus();
        showMessage(`${result.email}로 인증번호를 보냈습니다.`, "success");
        startCooldown(result.resendAfterSeconds);
      } catch (error) {
        showMessage(error.message);
        sendButton.disabled = false;
      }
    });

    document.querySelector("#verify-email-code").addEventListener("click", async () => {
      const codeInput = form.elements.emailCode;
      if (!emailInput.reportValidity() || !codeInput.reportValidity()) return;
      const button = document.querySelector("#verify-email-code");
      button.disabled = true;
      showMessage("");
      try {
        const result = await api("/api/signup/email/verify", {
          method: "POST",
          body: JSON.stringify({
            email: emailInput.value,
            code: codeInput.value,
          }),
        });
        verificationToken = result.verificationToken;
        verifiedEmail = result.email;
        emailInput.value = result.email;
        emailInput.readOnly = true;
        document.querySelector("#email-code-fields").classList.add("is-hidden");
        document.querySelector("#email-verified-state").classList.remove("is-hidden");
        showMessage("이메일 인증이 완료되었습니다.", "success");
      } catch (error) {
        showMessage(error.message);
        button.disabled = false;
      }
    });

    form.elements.passwordConfirm.addEventListener("input", () => {
      form.elements.passwordConfirm.setCustomValidity(
        form.elements.password.value === form.elements.passwordConfirm.value
          ? ""
          : "비밀번호가 일치하지 않습니다.",
      );
    });
    form.elements.password.addEventListener("input", () => {
      form.elements.passwordConfirm.dispatchEvent(new Event("input"));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      showMessage("");
      form.elements.passwordConfirm.setCustomValidity(
        form.elements.password.value === form.elements.passwordConfirm.value
          ? ""
          : "비밀번호가 일치하지 않습니다.",
      );
      if (!form.reportValidity()) return;

      const contactType = form.elements.contactType.value;
      if (contactType === "email" && (!verificationToken || verifiedEmail !== emailInput.value.trim().toLowerCase())) {
        showMessage("이메일 인증을 완료하세요.");
        return;
      }

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await api("/api/signup/register", {
          method: "POST",
          body: JSON.stringify({
            display_name: form.elements.displayName.value,
            username: form.elements.username.value,
            password: form.elements.password.value,
            contact_type: contactType,
            contact_value: contactType === "email" ? emailInput.value : phoneInput.value,
            email_verification_token: contactType === "email" ? verificationToken : null,
            privacy_agreed: form.elements.privacyAgreed.checked,
          }),
        });
        signupCompleteView();
      } catch (error) {
        showMessage(error.message);
        button.disabled = false;
      }
    });
  };

  const signupView = async () => {
    clearCooldown();
    verificationToken = "";
    verifiedEmail = "";
    app.innerHTML = `
      <section class="registration-page simple-registration">
        <header class="registration-top">
          <a class="registration-brand" href="/login"><span class="brand-mark">T</span><span><strong>THE IN TECH</strong><small>TMS CONTROL CENTER</small></span></a>
          <a class="ghost" href="/login">로그인</a>
        </header>

        <form id="signup-form" class="card signup-card simple-signup-card">
          <div class="simple-signup-head">
            <h1>회원가입</h1>
            <p>가입 후 관리자 승인이 필요합니다.</p>
          </div>

            <section class="signup-section">
              <h2>계정 정보</h2>
              <div class="signup-two-fields">
                <label><span>이름</span><input name="displayName" maxlength="128" placeholder="생산팀 홍길동" required autofocus /></label>
                <label><span>아이디</span><input name="username" minlength="3" maxlength="64" pattern="[A-Za-z0-9_.-]+" autocapitalize="none" spellcheck="false" placeholder="operator01" required /></label>
              </div>
              <div class="signup-two-fields">
                <label><span>비밀번호</span><input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" placeholder="12자 이상" required /></label>
                <label><span>비밀번호 확인</span><input name="passwordConfirm" type="password" minlength="12" maxlength="128" autocomplete="new-password" required /></label>
              </div>
            </section>

            <section class="signup-section">
              <h2>연락처</h2>
              <div class="contact-type-options">
                <label><input name="contactType" type="radio" value="phone" checked /><span><strong>휴대전화</strong><small>인증 없음</small></span></label>
                <label><input name="contactType" type="radio" value="email" /><span><strong>이메일</strong><small>인증 필요</small></span></label>
              </div>
              <div id="phone-contact-panel" class="contact-panel">
                <label><span>휴대전화 번호</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="13" placeholder="010-1234-5678" /></label>
              </div>
              <div id="email-contact-panel" class="contact-panel is-hidden">
                <label><span>이메일 <small id="email-availability-note"></small></span><div class="action-input"><input name="email" type="email" autocomplete="email" maxlength="254" placeholder="name@example.com" /><button id="send-email-code" class="secondary" type="button">인증번호 받기</button></div></label>
                <div id="email-code-fields" class="action-input is-hidden"><input name="emailCode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="6자리 인증번호" /><button id="verify-email-code" class="secondary" type="button">인증 확인</button></div>
                <div id="email-verified-state" class="verified-state is-hidden"><span>✓</span><strong>이메일 인증 완료</strong></div>
              </div>
            </section>

            <section class="signup-section consent-section">
              <label class="consent-check">
                <input name="privacyAgreed" type="checkbox" required />
                <span><strong>개인정보 수집·이용 동의 <em>필수</em></strong></span>
              </label>
              <a class="privacy-detail-link" href="/privacy" target="_blank" rel="noreferrer">내용 보기</a>
            </section>

            <p id="form-message" class="message signup-message" role="alert"></p>
            <button class="primary signup-submit" type="submit">가입 신청하기</button>
        </form>
      </section>`;

    try {
      const options = await api("/api/signup/options");
      if (!options.registrationEnabled) {
        showMessage("현재 회원가입을 받을 수 없습니다.");
        document.querySelector("#signup-form").querySelectorAll("input, button").forEach((element) => {
          element.disabled = true;
        });
        return;
      }
      wireSignupForm(options);
    } catch (error) {
      showMessage(error.message);
    }
  };

  const privacyView = () => {
    clearCooldown();
    app.innerHTML = `
      <section class="privacy-page">
        <header class="privacy-header">
          <a class="registration-brand" href="/login"><span class="brand-mark">T</span><span><strong>THE IN TECH</strong><small>TMS CONTROL CENTER</small></span></a>
          <a class="ghost privacy-close" href="/signup">회원가입으로 돌아가기</a>
        </header>
        <article class="privacy-document">
          <p class="eyebrow">PRIVACY NOTICE</p>
          <h1>개인정보 수집·이용 안내</h1>
          <p class="privacy-version">시행일 및 동의서 버전: ${PRIVACY_VERSION}</p>
          <p class="privacy-lead">더인테크는 TMS 모니터링 포털 회원가입과 계정 관리를 위해 아래와 같이 최소한의 개인정보를 수집·이용합니다.</p>

          <section><span>01</span><div><h2>개인정보처리자</h2><p><strong>법인명:</strong> 더인테크<br /><strong>개인정보 문의:</strong> 010-7662-6428</p></div></section>
          <section><span>02</span><div><h2>수집·이용 목적</h2><ul><li>회원가입 신청 접수와 신청자 확인</li><li>관리자의 계정 승인 및 모니터링 서버 권한 배정</li><li>로그인, 계정 보안, 비인가 이용 방지</li><li>계정 관련 안내와 문의 대응</li></ul></div></section>
          <section><span>03</span><div><h2>수집 항목</h2><ul><li><strong>필수 공통:</strong> 사용자 이름, 로그인 아이디, 비밀번호의 암호화 해시, 동의 일시와 동의서 버전</li><li><strong>연락처 중 택일:</strong> 이메일 주소 또는 휴대전화 번호</li><li><strong>이메일 선택 시:</strong> 인증 완료 여부와 인증 일시</li><li><strong>자동 생성:</strong> 가입 신청 일시, 승인 상태, 서비스 접속 및 보안 기록</li></ul><p class="privacy-note">휴대전화 번호는 별도 본인인증 없이 수집되며, 주민등록번호·생년월일·성별·CI/DI는 수집하지 않습니다.</p></div></section>
          <section><span>04</span><div><h2>보유 및 이용기간</h2><p>회원탈퇴 또는 계정 삭제 시까지 보유·이용하고, 목적이 달성되면 지체 없이 파기합니다. 다만 관계 법령에 따라 보존할 의무가 있는 정보는 해당 법정기간 동안 분리 보관할 수 있습니다.</p></div></section>
          <section><span>05</span><div><h2>이메일 인증 처리</h2><p>이메일 가입을 선택하면 인증번호 발송을 위해 이메일 주소가 네이버 SMTP 서비스로 전송됩니다. 인증번호는 제한된 시간 동안만 유효하며, 인증 완료 또는 만료 후 가입 처리 목적 외로 사용하지 않습니다.</p></div></section>
          <section><span>06</span><div><h2>동의 거부 권리 및 불이익</h2><p>개인정보 수집·이용에 동의하지 않을 권리가 있습니다. 다만 위 정보는 회원가입과 계정 승인을 위해 필요한 최소 정보이므로 동의를 거부하면 회원가입을 신청할 수 없습니다.</p></div></section>

          <div class="privacy-footer-note">
            <strong>동의 전 확인해 주세요.</strong>
            <p>본 안내는 현재 서비스의 수집 항목과 처리 흐름을 기준으로 작성되었습니다. 수집 목적이나 외부 서비스가 변경되면 안내 내용과 버전을 함께 갱신합니다.</p>
          </div>
        </article>
      </section>`;
  };

  return { signupView, privacyView };
}
