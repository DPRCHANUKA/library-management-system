// ===== DONATION PAGE LOGIC =====
// Uses localStorage for book data (same approach as the friend's bookApi.js)

const STORAGE_KEY = "donation_books";

function getDonationBooks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  const defaults = [
    {
      _id: "seed-1",
      title: "Example Book",
      author: "Author Name",
      description: "This is an example book. Add your own!",
      type: "Donation",
      phone: "",
      nic: "",
      imageUrl: "",
    },
  ];
  saveDonationBooks(defaults);
  return defaults;
}

function saveDonationBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function generateId() {
  return Date.now().toString() + "-" + Math.random().toString(36).substr(2, 6);
}

// Validation
function validatePhone(v) {
  if (!v) return "";
  return /^\d{10}$/.test(v) ? "" : "Phone must be exactly 10 digits";
}
function validateNIC(v) {
  if (!v) return "";
  return /^(?:\d{9}[vVxX]|\d{12})$/.test(v)
    ? ""
    : "NIC must be 9 digits + V/X or 12 digits";
}

// ---------- DOM Ready ----------
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar("../");

  const form = document.getElementById("donationForm");
  const grid = document.getElementById("donationGrid");
  const countEl = document.getElementById("bookCount");

  // Pre-select type from URL query param (e.g. ?type=Request from Reviews page)
  const urlParams = new URLSearchParams(window.location.search);
  const presetType = urlParams.get("type");
  if (presetType) {
    const typeSelect = form.querySelector('select[name="type"]');
    if (typeSelect) {
      typeSelect.value = presetType;
    }
  }

  let books = getDonationBooks();

  function render() {
    countEl.textContent = books.length;
    if (books.length === 0) {
      grid.innerHTML = '<p class="donation-empty">No books yet. Add one using the form!</p>';
      return;
    }
    grid.innerHTML = books.map((b) => renderCard(b)).join("");
    attachCardEvents();
  }

  function renderCard(b) {
    const imgHtml = b.imageUrl
      ? `<img class="book-img" src="${escapeHtml(b.imageUrl)}" alt="${escapeHtml(b.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="book-img-placeholder" style="display:none"><span class="placeholder-icon">📖</span><span>No Image</span></div>`
      : `<div class="book-img-placeholder"><span class="placeholder-icon">📖</span><span>No Image</span></div>`;

    const badgeClass = (b.type || "Donation").toLowerCase() === "request" ? "request" : "donation";

    return `
      <div class="donation-book-card" data-id="${b._id}">
        ${imgHtml}
        <div class="card-view">
          <div class="book-title-row">
            <span class="book-title" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</span>
            <span class="type-badge ${badgeClass}">${escapeHtml(b.type || "Donation")}</span>
          </div>
          <div class="book-author">By ${escapeHtml(b.author || "Unknown")}</div>
          <div class="book-desc">${escapeHtml(b.description || "No description provided.")}</div>
          <div class="contact-box">
            <div class="contact-row"><span class="contact-label">Phone:</span><span class="contact-value">${escapeHtml(b.phone || "N/A")}</span></div>
            <div class="contact-row"><span class="contact-label">NIC:</span><span class="contact-value">${escapeHtml(b.nic || "N/A")}</span></div>
          </div>
          <div class="card-actions">
            <button class="btn-edit" data-id="${b._id}">Edit</button>
            <button class="btn-delete" data-id="${b._id}">Delete</button>
          </div>
        </div>
      </div>`;
  }

  function attachCardEvents() {
    grid.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => startEdit(btn.dataset.id));
    });
    grid.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", () => deleteBook(btn.dataset.id));
    });
  }

  function startEdit(id) {
    const book = books.find((b) => b._id === id);
    if (!book) return;
    const card = grid.querySelector(`.donation-book-card[data-id="${id}"]`);
    const view = card.querySelector(".card-view");
    view.innerHTML = `
      <div class="edit-form">
        <input type="text" name="title" value="${escapeAttr(book.title)}" placeholder="Title" required>
        <input type="text" name="author" value="${escapeAttr(book.author || "")}" placeholder="Author">
        <textarea name="description" placeholder="Description" rows="2">${escapeHtml(book.description || "")}</textarea>
        <input type="text" name="imageUrl" value="${escapeAttr(book.imageUrl || "")}" placeholder="Image URL">
        <input type="text" name="phone" value="${escapeAttr(book.phone || "")}" placeholder="Phone (10 digits)">
        <input type="text" name="nic" value="${escapeAttr(book.nic || "")}" placeholder="NIC">
        <select name="type">
          <option value="Donation" ${book.type === "Donation" ? "selected" : ""}>Donation</option>
          <option value="Request" ${book.type === "Request" ? "selected" : ""}>Request</option>
        </select>
        <div class="edit-actions">
          <button type="button" class="btn-save" data-id="${id}">Save</button>
          <button type="button" class="btn-cancel">Cancel</button>
        </div>
      </div>`;

    card.querySelector(".btn-save").addEventListener("click", () => saveEdit(id, card));
    card.querySelector(".btn-cancel").addEventListener("click", () => render());
  }

  function saveEdit(id, card) {
    const ef = card.querySelector(".edit-form");
    const title = ef.querySelector('[name="title"]').value.trim();
    if (!title) { alert("Title is required"); return; }

    const phone = ef.querySelector('[name="phone"]').value.trim();
    const nic = ef.querySelector('[name="nic"]').value.trim();
    const phoneErr = validatePhone(phone);
    const nicErr = validateNIC(nic);
    if (phoneErr) { alert(phoneErr); return; }
    if (nicErr) { alert(nicErr); return; }

    const idx = books.findIndex((b) => b._id === id);
    if (idx === -1) return;
    books[idx] = {
      ...books[idx],
      title,
      author: ef.querySelector('[name="author"]').value.trim(),
      description: ef.querySelector('[name="description"]').value.trim(),
      imageUrl: ef.querySelector('[name="imageUrl"]').value.trim(),
      phone,
      nic,
      type: ef.querySelector('[name="type"]').value,
    };
    saveDonationBooks(books);
    showToast("Book updated successfully!", "success");
    render();
  }

  function deleteBook(id) {
    if (!confirm("Delete this book?")) return;
    books = books.filter((b) => b._id !== id);
    saveDonationBooks(books);
    showToast("Book deleted.", "info");
    render();
  }

  // Add new book
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const title = fd.get("title").trim();
    if (!title) { alert("Title is required"); return; }

    const phone = fd.get("phone").trim();
    const nic = fd.get("nic").trim();
    const phoneErr = validatePhone(phone);
    const nicErr = validateNIC(nic);
    if (phoneErr) { alert(phoneErr); return; }
    if (nicErr) { alert(nicErr); return; }

    const newBook = {
      _id: generateId(),
      title,
      author: fd.get("author").trim(),
      description: fd.get("description").trim(),
      imageUrl: fd.get("imageUrl").trim(),
      phone,
      nic,
      type: fd.get("type"),
    };
    books.unshift(newBook);
    saveDonationBooks(books);
    form.reset();
    showToast("Book added successfully!", "success");
    render();
  });

  // Initial render
  render();
});

// Helpers
function escapeHtml(str) {
  if (!str) return "";
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
function escapeAttr(str) {
  return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
