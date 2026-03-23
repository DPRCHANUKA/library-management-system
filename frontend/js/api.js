const BASE_URL = window.location.origin;

// ====== AUTH API ======
async function apiSignUp(data) {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiSignIn(data) {
  const res = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiGetMe() {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

async function apiGetShelf() {
  const res = await fetch(`${BASE_URL}/api/auth/shelf`, {
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

// ====== BOOKS API ======
async function apiGetBooks() {
  const res = await fetch(`${BASE_URL}/api/books`);
  return res.json();
}

async function apiAddBook(formData) {
  const res = await fetch(`${BASE_URL}/api/books`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
    body: formData
  });
  return res.json();
}

async function apiDeleteBook(bookId) {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

async function apiBookBook(bookId) {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  });
  return res.json();
}

async function apiReturnBook(bookId) {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}/return`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  });
  return res.json();
}

async function apiAddToWishlist(bookId) {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}/wishlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  });
  return res.json();
}

async function apiRemoveFromWishlist(bookId) {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}/wishlist`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
  });
  return res.json();
}

async function apiBookFromWishlist(bookId) {
  const res = await fetch(`${BASE_URL}/api/books/${bookId}/wishlist/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  });
  return res.json();
}