// ====== AUTH & NAV UTILITIES ======

function isLoggedIn() {
  return !!localStorage.getItem("token");
}

function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function isAdmin() {
  const user = getUser();
  // TEMPORARY: Make ALL logged-in users admin for presentation
  if (isLoggedIn()) {
    return true;
  }
  return user && user.isAdmin === true;
}

function signOut(prefix = "") {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "" + (prefix ? prefix + "index.html" : "/");
}

function updateNavbar(prefix = "") {
  const navLinks = document.getElementById("navLinks");
  if (!navLinks) return;

  const homeLink = prefix ? prefix + "index.html" : "/";
  const pagesPrefix = prefix ? "" : "pages/";

  if (isLoggedIn()) {
    let dashboardLink = "";
    let adminLinks = "";
    if (isAdmin()) {
      dashboardLink = `<a href="${pagesPrefix}dashboard.html">Dashboard</a>`;
      adminLinks = `<a href="${pagesPrefix}admin-dashboardBooking.html">📊 Admin Dashboard</a>`;
    }

    navLinks.innerHTML = `
      <a href="${homeLink}">Home</a>
      <a href="${pagesPrefix}discover.html">Discover Books</a>
      <a href="${pagesPrefix}bookingseats.html">🪑 Book a Seat</a>
      ${dashboardLink}
      <a href="#" id="signOutLink" class="nav-btn-outline">Sign Out</a>
    `;
    document.getElementById("signOutLink").addEventListener("click", (e) => {
      e.preventDefault();
      signOut(prefix);
    });
  } else {
    navLinks.innerHTML = `
      <a href="${homeLink}">Home</a>
      <a href="${pagesPrefix}login.html" class="nav-btn-outline">Sign In</a>
      <a href="${pagesPrefix}register.html" class="nav-btn">Sign Up</a>
    `;
  }
}

function requireAuth(prefix = "../") {
  if (!isLoggedIn()) {
    window.location.href = prefix + "pages/login.html";
    return false;
  }
  return true;
}

function requireAdmin(prefix = "../") {
  if (!isLoggedIn()) {
    window.location.href = prefix + "pages/login.html";
    return false;
  }
  if (!isAdmin()) {
    showToast("Access Denied. Admin privileges required.", "error");
    setTimeout(() => {
      window.location.href = prefix + (prefix ? "index.html" : "/");
    }, 1500);
    return false;
  }
  return true;
}

// ====== TOAST NOTIFICATIONS ======
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}
