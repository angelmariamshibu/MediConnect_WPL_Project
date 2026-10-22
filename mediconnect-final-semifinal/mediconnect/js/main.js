document.addEventListener("DOMContentLoaded", function () {
  mcHighlightActiveNav();
  mcRenderNavAuth();

  const yearEls = document.querySelectorAll("[data-year]");
  yearEls.forEach(el => el.textContent = new Date().getFullYear());

  const resetLink = document.getElementById("resetDemoData");
  if (resetLink) {
    resetLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm("Reset all demo data (accounts you registered, bookings, orders) back to the defaults?")) {
        mcResetDemo().catch(err => mcToast(
          err.status === 404 ? "Demo reset is disabled on this server." : err.message, "error"));
      }
    });
  }
});

function mcHighlightActiveNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".mc-navbar .nav-link[data-page]").forEach(link => {
    if (link.getAttribute("data-page") === page) {
      link.classList.add("active");
    }
  });
}

function mcToast(message, variant) {
  variant = variant || "success";
  const bgClass = variant === "error" ? "bg-danger" : "bg-success";

  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container position-fixed bottom-0 end-0 p-3 z-3";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  el.className = `toast align-items-center text-white ${bgClass} border-0`;
  el.setAttribute("role", "alert");
  el.setAttribute("aria-live", "assertive");
  el.setAttribute("aria-atomic", "true");
  el.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${mcEscape(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  container.appendChild(el);

  const toast = new bootstrap.Toast(el, { delay: 3200 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}
