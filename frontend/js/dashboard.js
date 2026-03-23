document.addEventListener("DOMContentLoaded", () => {
  // Check admin access
  if (!requireAdmin("../")) return;

  updateNavbar("../");
  loadDashboardBooks();
  setupAddBookModal();
  setupConfirmModal();
});

async function loadDashboardBooks() {
  try {
    const books = await apiGetBooks();
    renderDashboardTable(books);
  } catch (err) {
    showToast("Failed to load books", "error");
  }
}

function renderDashboardTable(books) {
  const tbody = document.getElementById("booksTableBody");

  if (!books.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 2rem;">No books yet. Click "Add Books" to get started!</td></tr>';
    return;
  }

  tbody.innerHTML = books.map(book => {
    const bookerDisplay = book.isAvailable
      ? '<span class="status-available">Available</span>'
      : `<span class="status-booked">${book.bookerName || 'Unknown'}</span>`;

    const dateDisplay = book.isAvailable
      ? '<span style="color: var(--text-muted);">Not Booked</span>'
      : new Date(book.bookedDate).toLocaleDateString();

    return `
      <tr>
        <td><img src="../images/${book.image}" alt="${book.name}" class="thumb" onerror="this.src='../images/book1.jpg'"></td>
        <td><strong>${book.name}</strong></td>
        <td><span class="genre-tag">${book.genre}</span></td>
        <td>${bookerDisplay}</td>
        <td>${dateDisplay}</td>
        <td>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${book._id}" data-name="${book.name}">🗑 Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  // Attach delete listeners
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const bookId = e.target.closest(".delete-btn").dataset.id;
      const bookName = e.target.closest(".delete-btn").dataset.name;
      showConfirm(`Are you sure you want to delete "${bookName}"?`, async () => {
        try {
          const result = await apiDeleteBook(bookId);
          if (result.error) {
            showToast(result.error, "error");
            return;
          }
          showToast("Book deleted successfully!", "success");
          loadDashboardBooks();
        } catch (err) {
          showToast("Failed to delete book", "error");
        }
      });
    });
  });
}

// ====== ADD BOOK MODAL ======
function setupAddBookModal() {
  const addBtn = document.getElementById("addBookBtn");
  const modal = document.getElementById("addBookModal");
  const closeBtn = document.getElementById("closeAddBook");
  const cancelBtn = document.getElementById("cancelAddBook");
  const submitBtn = document.getElementById("submitAddBook");
  const fileArea = document.getElementById("fileUploadArea");
  const fileInput = document.getElementById("bookImage");
  const fileName = document.getElementById("fileName");

  addBtn.addEventListener("click", () => modal.classList.add("active"));

  const closeModal = () => {
    modal.classList.remove("active");
    document.getElementById("addBookForm").reset();
    fileName.textContent = "";
  };

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // File upload area
  fileArea.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      fileName.textContent = "📎 " + fileInput.files[0].name;
    }
  });

  // Submit
  submitBtn.addEventListener("click", async () => {
    const bookName = document.getElementById("bookName").value.trim();
    const genre = document.getElementById("bookGenre").value;

    if (!bookName || !genre) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    const formData = new FormData();
    formData.append("name", bookName);
    formData.append("genre", genre);
    if (fileInput.files.length) {
      formData.append("image", fileInput.files[0]);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const result = await apiAddBook(formData);
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      showToast("Book added successfully! 📚", "success");
      closeModal();
      loadDashboardBooks();
    } catch (err) {
      showToast("Failed to add book", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });
}

// ====== CONFIRM MODAL ======
let confirmCallback = null;

function setupConfirmModal() {
  const overlay = document.getElementById("confirmOverlay");
  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");

  noBtn.addEventListener("click", () => {
    overlay.classList.remove("active");
    confirmCallback = null;
  });

  yesBtn.addEventListener("click", () => {
    overlay.classList.remove("active");
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });
}

function showConfirm(message, callback) {
  const overlay = document.getElementById("confirmOverlay");
  document.getElementById("confirmMsg").textContent = message;
  confirmCallback = callback;
  overlay.classList.add("active");
}
