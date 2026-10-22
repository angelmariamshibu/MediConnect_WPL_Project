/* Thin client for the Mediconnect REST API (replaces the old localStorage "data.js"). */

// Same-origin by default (http://localhost:3000). If the pages are opened through
// VS Code Live Server (:5501) the API is on :3000 instead.
const MC_API_BASE = window.MC_API_BASE ||
  (["5500", "5501"].includes(window.location.port) ? "http://localhost:3000/api" : "/api");

async function mcApi(path, options) {
  options = options || {};
  const init = { method: options.method || "GET", credentials: "include", headers: {} };
  if (options.body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  let res;
  try {
    res = await fetch(MC_API_BASE + path, init);
  } catch (e) {
    const err = new Error("Can't reach the Mediconnect server. Please check that it's running and try again.");
    err.network = true;
    throw err;
  }
  let payload = null;
  try { payload = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error((payload && payload.error) || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return payload;
}

/* Small per-page cache for reference data that rarely changes. */
const _mcCache = {};
function mcCached(key, loader) {
  if (!_mcCache[key]) {
    _mcCache[key] = loader().catch(e => { delete _mcCache[key]; throw e; });
  }
  return _mcCache[key];
}

const mcGetSpecialties = () => mcCached("specialties", () => mcApi("/specialties"));
const mcGetDoctors = () => mcCached("doctors", () => mcApi("/doctors"));
const mcGetMedicines = () => mcCached("medicines", () => mcApi("/medicines"));
const mcGetPackages = () => mcCached("packages", () => mcApi("/packages"));

async function mcResetDemo() {
  await mcApi("/dev/reset", { method: "POST", body: {} });
  window.location.href = "index.html";
}

function mcEscape(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

/* Shows an error message in a page-level container, or falls back to a toast. */
function mcShowLoadError(el, message) {
  if (el) {
    el.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>${mcEscape(message)}</div>`;
  } else {
    mcToast(message, "error");
  }
}
