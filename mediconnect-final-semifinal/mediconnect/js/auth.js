/* Session handling. The login session lives in an httpOnly cookie set by the server;
   the browser only ever asks "who am I?" via /api/auth/me. */

let _mcUserPromise = null;

function mcCurrentUser(forceRefresh) {
  if (!_mcUserPromise || forceRefresh) {
    _mcUserPromise = mcApi("/auth/me").then(r => r.user).catch(() => null);
  }
  return _mcUserPromise;
}

async function mcLogout() {
  try { await mcApi("/auth/logout", { method: "POST", body: {} }); } catch (e) { /* ignore */ }
  _mcUserPromise = null;
  window.location.href = "index.html";
}

async function mcLoginWith(identifier, password) {
  try {
    const { user } = await mcApi("/auth/login", { method: "POST", body: { identifier: identifier.trim(), password } });
    _mcUserPromise = Promise.resolve(user);
    return { ok: true, account: user };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

async function mcRegisterAccount({ name, phone, email, address, password }) {
  try {
    const { user } = await mcApi("/auth/register", { method: "POST", body: { name, phone, email, address, password } });
    _mcUserPromise = Promise.resolve(user);
    return { ok: true, account: user };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

async function mcRenderNavAuth() {
  const slot = document.getElementById("navAuthSlot");
  if (!slot) return;
  const user = await mcCurrentUser();

  if (user) {
    slot.innerHTML = `
      <span class="pill-outline d-none d-md-inline-flex">Hi, ${mcEscape(user.name.split(" ")[0])} &middot; ${mcEscape(user.memberId)}</span>
      <button class="btn btn-outline-navy btn-sm" id="navLogoutBtn" type="button">Log out</button>
    `;
    document.getElementById("navLogoutBtn").addEventListener("click", mcLogout);
  } else {
    slot.innerHTML = `
      <a href="login.html" class="nav-link" style="font-weight:600;">Log in</a>
      <a href="register.html" class="btn btn-teal btn-sm">Register</a>
    `;
  }
}

/* Resolves to the user when logged in. Otherwise sends the visitor to the login page and resolves to null. */
async function mcRequireLogin(redirectPage) {
  const user = await mcCurrentUser();
  if (user) return user;
  sessionStorage.setItem("mc_redirect_after_login", redirectPage || "index.html");
  window.location.href = "login.html?redirect=" + encodeURIComponent(redirectPage || "index.html");
  return null;
}

/* Only allow redirects to another page of this site (blocks ?redirect=https://evil.example). */
function mcSafeRedirect(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_=&%.-]*)?$/.test(value) ? value : null;
}
