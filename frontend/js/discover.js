document.addEventListener("DOMContentLoaded", () => {
  // Check auth
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  updateNavbar("../");
  loadBooks();
  setupShelfModal();
});

let allBooks = [];
let userShelf = null;

async function loadBooks() {
  try {
    const [books, shelf] = await Promise.all([apiGetBooks(), apiGetShelf()]);
    allBooks = books;
    userShelf = shelf;
    renderBookGrid();
  } catch (err) {
    showToast("Failed to load books", "error");
  }
}

function renderBookGrid() {
  const grid = document.getElementById("bookGrid");
  const user = getUser();

  if (!allBooks.length) {
    grid.innerHTML = '<p style="color: var(--text-muted); text-align:center; grid-column: 1/-1; padding: 3rem;">No books available. Go to Dashboard to add books!</p>';
    return;
  }

  // Build sets for quick lookup
  const borrowedIds = new Set((userShelf?.borrowedBooks || []).map(b => {
    return b.bookId ? (b.bookId._id || b.bookId) : b;
  }).map(String));

  const wishlistIds = new Set((userShelf?.wishlist || []).map(w => {
    return w._id || w;
  }).map(String));

  grid.innerHTML = allBooks.map(book => {
    const isBookedByMe = borrowedIds.has(String(book._id));
    const isBookedByOther = !book.isAvailable && !isBookedByMe;
    const isInWishlist = wishlistIds.has(String(book._id));

    let bookBtnClass = "btn btn-danger";
    let bookBtnText = "📕 BOOK";
    let bookBtnDisabled = "";

    if (isBookedByMe) {
      bookBtnClass = "btn btn-booked";
      bookBtnText = "✓ BOOKED";
      bookBtnDisabled = "disabled";
    } else if (isBookedByOther) {
      bookBtnClass = "btn btn-booked";
      bookBtnText = "UNAVAILABLE";
      bookBtnDisabled = "disabled";
    }

    let wishBtnClass = "btn btn-gold";
    let wishBtnText = "💛 ADD TO WISHLIST";
    let wishBtnDisabled = "";

    if (isInWishlist) {
      wishBtnClass = "btn btn-wishlisted";
      wishBtnText = "✓ IN WISHLIST";
      wishBtnDisabled = "disabled";
    }

    return `
      <div class="book-card" data-id="${book._id}">
        <img src="../images/${book.image}" alt="${book.name}" class="book-card-img" onerror="this.src='../images/book1.jpg'">
        <div class="book-card-body">
          <h3>${book.name}</h3>
          <span class="genre-tag">${book.genre}</span>
          <div class="book-card-actions">
            <button class="${bookBtnClass} book-btn" data-id="${book._id}" ${bookBtnDisabled}>${bookBtnText}</button>
            <button class="${wishBtnClass} wish-btn" data-id="${book._id}" ${wishBtnDisabled}>${wishBtnText}</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Attach event listeners
  document.querySelectorAll(".book-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", handleBook);
  });

  document.querySelectorAll(".wish-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", handleWishlist);
  });
}

async function handleBook(e) {
  const bookId = e.target.dataset.id;
  try {
    const result = await apiBookBook(bookId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Book Booked! 📚", "success");
    await loadBooks();
  } catch (err) {
    showToast("Failed to book", "error");
  }
}

async function handleWishlist(e) {
  const bookId = e.target.dataset.id;
  try {
    const result = await apiAddToWishlist(bookId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Added to Wishlist! 💛", "success");
    await loadBooks();
  } catch (err) {
    showToast("Failed to add to wishlist", "error");
  }
}

// ====== PERSONAL SHELF MODAL ======
function setupShelfModal() {
  const shelfBtn = document.getElementById("shelfBtn");
  const shelfModal = document.getElementById("shelfModal");
  const closeShelf = document.getElementById("closeShelf");

  shelfBtn.addEventListener("click", () => {
    loadShelf();
    shelfModal.classList.add("active");
  });

  closeShelf.addEventListener("click", () => {
    shelfModal.classList.remove("active");
  });

  shelfModal.addEventListener("click", (e) => {
    if (e.target === shelfModal) shelfModal.classList.remove("active");
  });
}

async function loadShelf() {
  try {
    const shelf = await apiGetShelf();
    userShelf = shelf;
    renderBorrowedBooks(shelf.borrowedBooks || []);
    renderWishlist(shelf.wishlist || []);
  } catch (err) {
    showToast("Failed to load shelf", "error");
  }
}

function renderBorrowedBooks(borrowedBooks) {
  const container = document.getElementById("borrowedList");
  const countEl = document.getElementById("borrowCount");
  countEl.textContent = `(${borrowedBooks.length}/3)`;

  if (!borrowedBooks.length) {
    container.innerHTML = '<p class="shelf-empty">No borrowed books yet.</p>';
    return;
  }

  container.innerHTML = borrowedBooks.map(item => {
    const book = item.bookId;
    if (!book) return "";

    const bookedDate = new Date(item.bookedDate);
    const returnDate = new Date(item.returnDate);
    const now = new Date();
    const daysRemaining = Math.ceil((returnDate - now) / (1000 * 60 * 60 * 24));

    let countdownClass = "countdown";
    let countdownText = `${daysRemaining} days remaining`;
    if (daysRemaining <= 0) {
      countdownClass = "countdown overdue";
      countdownText = "⚠ Overdue!";
    } else if (daysRemaining <= 2) {
      countdownClass = "countdown overdue";
      countdownText = `⚠ ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left!`;
    }

    return `
      <div class="shelf-item">
        <img src="../images/${book.image}" alt="${book.name}" onerror="this.src='../images/book1.jpg'">
        <div class="shelf-item-info">
          <h4>${book.name}</h4>
          <p>Borrowed: ${bookedDate.toLocaleDateString()}</p>
          <p>Return by: ${returnDate.toLocaleDateString()}</p>
          <p class="${countdownClass}">${countdownText}</p>
        </div>
        <div class="shelf-item-actions">
          <button class="btn btn-outline btn-sm return-btn" data-id="${book._id}">↩ Return</button>
        </div>
      </div>
    `;
  }).join("");

  // Attach return listeners
  document.querySelectorAll(".return-btn").forEach(btn => {
    btn.addEventListener("click", handleReturn);
  });
}

function renderWishlist(wishlist) {
  const container = document.getElementById("wishlistList");

  if (!wishlist.length) {
    container.innerHTML = '<p class="shelf-empty">Your wishlist is empty.</p>';
    return;
  }

  container.innerHTML = wishlist.map(book => {
    if (!book) return "";
    const bookId = book._id || book;

    return `
      <div class="shelf-item">
        <img src="../images/${book.image}" alt="${book.name}" onerror="this.src='../images/book1.jpg'">
        <div class="shelf-item-info">
          <h4>${book.name}</h4>
          <span class="genre-tag">${book.genre || ''}</span>
        </div>
        <div class="shelf-item-actions">
          <button class="btn btn-primary btn-sm wishbook-btn" data-id="${bookId}" ${!book.isAvailable ? 'disabled title="Currently unavailable"' : ''}>📕 Book Now</button>
          <button class="btn btn-outline btn-sm wishremove-btn" data-id="${bookId}">✕ Remove</button>
        </div>
      </div>
    `;
  }).join("");

  // Attach wishlist listeners
  document.querySelectorAll(".wishbook-btn:not([disabled])").forEach(btn => {
    btn.addEventListener("click", handleBookFromWishlist);
  });

  document.querySelectorAll(".wishremove-btn").forEach(btn => {
    btn.addEventListener("click", handleRemoveFromWishlist);
  });
}

async function handleReturn(e) {
  const bookId = e.target.dataset.id;
  try {
    const result = await apiReturnBook(bookId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Book returned successfully! ↩", "success");
    await loadShelf();
    await loadBooks();
  } catch (err) {
    showToast("Failed to return book", "error");
  }
}

async function handleBookFromWishlist(e) {
  const bookId = e.target.dataset.id;
  try {
    const result = await apiBookFromWishlist(bookId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Book Booked from Wishlist! 📚", "success");
    await loadShelf();
    await loadBooks();
  } catch (err) {
    showToast("Failed to book", "error");
  }
}

async function handleRemoveFromWishlist(e) {
  const bookId = e.target.dataset.id;
  try {
    const result = await apiRemoveFromWishlist(bookId);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    showToast("Removed from wishlist", "info");
    await loadShelf();
    await loadBooks();
  } catch (err) {
    showToast("Failed to remove from wishlist", "error");
  }
}
