// Load user booking history when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadUserBookingData();
  setInterval(loadUserBookingData, 30000);
});

// Global variable to store user's bookings for search
let allUserBookings = [];
let currentFilter = 'all';

// Get current logged in user
function getCurrentUser() {
  try {
    if (typeof getUser === 'function') {
      const user = getUser();
      if (user) return user;
    }
    
    const userData = localStorage.getItem('user') || localStorage.getItem('currentUser') || localStorage.getItem('authUser');
    if (userData) {
      return JSON.parse(userData);
    }
    
    return null;
  } catch (e) {
    console.error('Error getting user:', e);
    return null;
  }
}

// Function to get user's active booking count
async function getUserActiveBookingCount() {
  const user = getCurrentUser();
  if (!user) return 0;
  
  try {
    const response = await fetch('http://localhost:5000/api/bookings');
    if (!response.ok) return 0;
    
    const data = await response.json();
    const allBookings = data.bookings || data;
    const todayDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    const activeBookings = allBookings.filter(booking => {
      const bookingStudentId = booking.studentId || '';
      const userStudentId = user.studentId || user.id || user.email || '';
      
      if (bookingStudentId !== userStudentId) return false;
      if (booking.status === 'cancelled') return false;
      
      const bookingDate = booking.date;
      if (bookingDate < todayDate) return false;
      
      if (bookingDate === todayDate) {
        const toTimeMinutes = convertTimeToMinutes(booking.toTime);
        if (toTimeMinutes <= currentTimeMinutes) return false;
      }
      
      return true;
    });
    
    let totalSeatsBooked = 0;
    activeBookings.forEach(booking => {
      if (Array.isArray(booking.seat)) {
        totalSeatsBooked += booking.seat.length;
      } else {
        totalSeatsBooked += 1;
      }
    });
    
    return totalSeatsBooked;
  } catch (err) {
    console.error("Error getting user booking count:", err);
    return 0;
  }
}

// Function to load user's booking data
async function loadUserBookingData() {
  try {
    showLoading();
    
    const user = getCurrentUser();
    
    if (!user) {
      showError('Please login to view your booking history');
      return;
    }
    
    const response = await fetch('http://localhost:5000/api/bookings');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const allBookings = data.bookings || data;
    
    allUserBookings = allBookings.filter(booking => {
      const bookingStudentId = booking.studentId || '';
      const userStudentId = user.studentId || user.id || user.email || '';
      
      return bookingStudentId === userStudentId || 
             bookingStudentId === user.id ||
             bookingStudentId === user.email;
    });
    
    updateUserStatistics(allUserBookings);
    displayUserBookings(allUserBookings);
    updateLastUpdated();
    
  } catch (error) {
    console.error('Error loading user bookings:', error);
    showError('Failed to load your bookings.');
  }
}

// Function to update user statistics
function updateUserStatistics(bookings) {
  const total = bookings.length;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const active = bookings.filter(booking => {
    if (booking.status === 'cancelled') return false;
    const bookingDate = new Date(booking.date).toDateString();
    if (bookingDate !== now.toDateString()) return false;
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const fromTime = convertTimeToMinutes(booking.fromTime);
    const toTime = convertTimeToMinutes(booking.toTime);
    
    return currentTime >= fromTime && currentTime <= toTime;
  }).length;
  
  const completed = bookings.filter(booking => {
    if (booking.status === 'cancelled') return false;
    if (booking.status === 'completed') return true;
    
    const bookingDate = new Date(booking.date);
    if (bookingDate < todayStart) return true;
    
    if (bookingDate.toDateString() === now.toDateString()) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const toTime = convertTimeToMinutes(booking.toTime);
      if (currentTime > toTime) return true;
    }
    
    return false;
  }).length;
  
  const totalEl = document.getElementById('totalBookings');
  const activeEl = document.getElementById('activeBookings');
  const completedEl = document.getElementById('completedBookings');
  
  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (completedEl) completedEl.textContent = completed;
}

// Helper function to convert time to minutes
function convertTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to format seats
function formatSeats(seats) {
  if (!seats) return 'N/A';
  if (Array.isArray(seats)) {
    return seats.join(', ');
  }
  return seats;
}

// Function to display user's bookings in table
function displayUserBookings(bookings) {
  const tableBody = document.getElementById('bookingsTableBody');
  
  if (!tableBody) return;
  
  if (!bookings || bookings.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="icon">📭</div>
          No bookings found
        </td>
      </tr>
    `;
    return;
  }
  
  const sortedBookings = [...bookings].reverse();
  
  tableBody.innerHTML = sortedBookings.map(booking => {
    const status = getBookingStatus(booking);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    const canEdit = canEditBooking(booking);
    const canCancel = status === 'active';
    const bookingId = booking._id || booking.id;
    
    return `
      <tr>
        <td><strong>${escapeHtml(booking.name || 'N/A')}</strong></td>
        <td><strong>${escapeHtml(formatSeats(booking.seat))}</strong></td>
        <td>${booking.date || 'N/A'}</td>
        <td>${booking.fromTime || 'N/A'} - ${booking.toTime || 'N/A'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>${booking.createdAt ? formatDate(booking.createdAt) : 'N/A'}</td>
        <td>
          <button onclick="viewUserBooking('${bookingId}')" class="btn-view">📄 View</button>
          ${canEdit ? `<button onclick="editUserBooking('${bookingId}')" class="btn-edit">✏️ Edit Time</button>` : ''}
          ${canCancel ? `<button onclick="cancelUserBooking('${bookingId}')" class="btn-cancel">❌ Cancel</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

// Get booking status
function getBookingStatus(booking) {
  if (booking.status === 'cancelled') return 'cancelled';
  if (booking.status === 'completed') return 'completed';
  
  const today = new Date().toDateString();
  const bookingDate = new Date(booking.date).toDateString();
  
  if (bookingDate !== today) return 'completed';
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const fromTime = convertTimeToMinutes(booking.fromTime);
  const toTime = convertTimeToMinutes(booking.toTime);
  
  if (currentTime >= fromTime && currentTime <= toTime) return 'active';
  if (currentTime > toTime) return 'completed';
  
  return 'active';
}

function getStatusClass(status) {
  switch(status) {
    case 'active': return 'status-active';
    case 'completed': return 'status-completed';
    case 'cancelled': return 'status-cancelled';
    default: return 'status-active';
  }
}

function getStatusText(status) {
  switch(status) {
    case 'active': return 'Active Now';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return 'Active';
  }
}

function canEditBooking(booking) {
  if (booking.status === 'cancelled') return false;
  if (booking.status === 'completed') return false;
  
  const today = new Date().toDateString();
  const bookingDate = new Date(booking.date).toDateString();
  
  if (bookingDate !== today) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const toTime = convertTimeToMinutes(booking.toTime);
  
  return currentTime <= toTime;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function searchBookings() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    displayUserBookings(allUserBookings);
    return;
  }
  
  const filtered = allUserBookings.filter(booking => 
    formatSeats(booking.seat).toLowerCase().includes(searchTerm)
  );
  
  displayUserBookings(filtered);
}

function filterBookings(filter) {
  currentFilter = filter;
  
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (filter === 'all') {
    const allBtn = document.getElementById('filterAll');
    if (allBtn) allBtn.classList.add('active');
    displayUserBookings(allUserBookings);
  } else if (filter === 'active') {
    const activeBtn = document.getElementById('filterActive');
    if (activeBtn) activeBtn.classList.add('active');
    const active = allUserBookings.filter(booking => getBookingStatus(booking) === 'active');
    displayUserBookings(active);
  } else if (filter === 'completed') {
    const completedBtn = document.getElementById('filterCompleted');
    if (completedBtn) completedBtn.classList.add('active');
    const completed = allUserBookings.filter(booking => getBookingStatus(booking) === 'completed');
    displayUserBookings(completed);
  }
}

function refreshHistory() {
  loadUserBookingData();
  const refreshBtn = document.querySelector('.btn-secondary');
  if (refreshBtn) {
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '🔄 Refreshing...';
    setTimeout(() => {
      refreshBtn.innerHTML = originalText;
    }, 1000);
  }
}

function viewUserBooking(id) {
  const booking = allUserBookings.find(b => (b._id === id || b.id === id));
  if (!booking) return;
  
  const status = getBookingStatus(booking);
  const statusText = getStatusText(status);
  
  alert(`Booking Details:\n\nBooking ID: ${id}\nSeat(s): ${formatSeats(booking.seat)}\nDate: ${booking.date}\nTime: ${booking.fromTime} - ${booking.toTime}\nStatus: ${statusText}\nName: ${booking.name}\nStudent ID: ${booking.studentId}`);
}

// ========== FIXED EDIT FUNCTION ==========
function editUserBooking(id) {
  const booking = allUserBookings.find(b => (b._id === id || b.id === id));
  if (!booking) return;
  
  if (!canEditBooking(booking)) {
    alert('This booking cannot be edited because it has already expired.');
    return;
  }
  
  const editBookingId = document.getElementById('editBookingId');
  const editSeatsDisplay = document.getElementById('editSeatsDisplay');
  const editFromTime = document.getElementById('editFromTime');
  const editToTime = document.getElementById('editToTime');
  const editDate = document.getElementById('editDate');
  
  if (editBookingId) editBookingId.value = booking._id || booking.id;
  
  if (editSeatsDisplay) {
    const seatsArray = Array.isArray(booking.seat) ? booking.seat : [booking.seat];
    editSeatsDisplay.value = seatsArray.join(', ');
    editSeatsDisplay.readOnly = true;
  }
  
  if (editDate) {
    editDate.value = booking.date;
    editDate.readOnly = true;
  }
  
  // Make both from time and to time EDITABLE
  if (editFromTime) {
    editFromTime.value = booking.fromTime;
    editFromTime.readOnly = false;
    editFromTime.style.backgroundColor = '';
    editFromTime.style.cursor = 'pointer';
    editFromTime.min = "08:00";
    editFromTime.max = "18:00";
  }
  
  if (editToTime) {
    editToTime.value = booking.toTime;
    editToTime.readOnly = false;
    editToTime.style.backgroundColor = '';
    editToTime.style.cursor = 'pointer';
    editToTime.min = "08:00";
    editToTime.max = "18:00";
  }
  
  clearEditErrors();
  
  const drawer = document.getElementById('user-edit-drawer');
  if (drawer) {
    drawer.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

async function cancelUserBooking(id) {
  const booking = allUserBookings.find(b => (b._id === id || b.id === id));
  if (!booking) return;
  
  if (!confirm(`Are you sure you want to cancel your booking for seat ${formatSeats(booking.seat)} on ${booking.date}?`)) {
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:5000/api/bookings/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      alert(`❌ ${result.message || 'Cancel failed'}`);
      return;
    }
    
    alert('✅ Booking cancelled successfully!');
    loadUserBookingData();
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    alert('❌ Cancel failed. Please check your connection.');
  }
}

function closeUserEditDrawer() {
  const drawer = document.getElementById('user-edit-drawer');
  if (drawer) {
    drawer.style.display = 'none';
  }
  document.body.style.overflow = 'auto';
  clearEditErrors();
}

function clearEditErrors() {
  const errors = ['editSeatError', 'editTimeError', 'editToTimeError'];
  errors.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.classList.remove('show');
    }
  });
}

// ========== FIXED VALIDATION FUNCTION ==========
async function validateUserEditForm(fromTime, toTime, bookingDate) {
  // Basic validations
  if (fromTime >= toTime) {
    const errorEl = document.getElementById('editTimeError');
    if (errorEl) {
      errorEl.textContent = 'End time must be after start time';
      errorEl.classList.add('show');
    }
    return false;
  }
  
  const fromMinutes = convertTimeToMinutes(fromTime);
  const toMinutes = convertTimeToMinutes(toTime);
  const duration = toMinutes - fromMinutes;
  
  if (duration < 30) {
    const errorEl = document.getElementById('editTimeError');
    if (errorEl) {
      errorEl.textContent = 'Minimum booking is 30 minutes';
      errorEl.classList.add('show');
    }
    return false;
  }
  
  if (duration > 240) {
    const errorEl = document.getElementById('editTimeError');
    if (errorEl) {
      errorEl.textContent = 'Maximum booking is 4 hours';
      errorEl.classList.add('show');
    }
    return false;
  }
  
  if (fromTime < '08:00' || toTime > '18:00') {
    const errorEl = document.getElementById('editTimeError');
    if (errorEl) {
      errorEl.textContent = 'Booking hours are 8:00 AM to 6:00 PM only';
      errorEl.classList.add('show');
    }
    return false;
  }
  
  const bookingId = document.getElementById('editBookingId').value;
  const currentBooking = allUserBookings.find(b => (b._id === bookingId || b.id === bookingId));
  
  if (currentBooking) {
    const seats = Array.isArray(currentBooking.seat) ? currentBooking.seat : [currentBooking.seat];
    
    for (const seat of seats) {
      const isAvailable = await checkSeatAvailabilityForEdit(seat, bookingDate, fromTime, toTime, currentBooking._id || currentBooking.id);
      if (!isAvailable) {
        const errorEl = document.getElementById('editTimeError');
        if (errorEl) {
          errorEl.textContent = `❌ The time slot conflicts with another booking for seat ${seat}`;
          errorEl.classList.add('show');
        }
        return false;
      }
    }
  }
  
  return true;
}

// ========== FIXED AVAILABILITY CHECK ==========
async function checkSeatAvailabilityForEdit(seatNumber, date, fromTime, toTime, currentBookingId) {
  try {
    // Pass excludeBookingId to backend to exclude current booking
    const url = `http://localhost:5000/api/bookings/check-availability?seat=${seatNumber}&date=${date}&fromTime=${fromTime}&toTime=${toTime}&excludeBookingId=${currentBookingId}`;
    console.log("Checking URL:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`Seat ${seatNumber} response:`, data);
    
    return data.available === true;
    
  } catch (err) {
    console.error("Error checking seat availability:", err);
    return false;
  }
}

function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Handle edit form submission
document.addEventListener('DOMContentLoaded', () => {
  const editForm = document.getElementById('userEditForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const bookingIdInput = document.getElementById('editBookingId');
      if (!bookingIdInput) return;
      
      const bookingId = bookingIdInput.value;
      const booking = allUserBookings.find(b => (b._id === bookingId || b.id === bookingId));
      
      if (!booking) {
        alert('Booking not found');
        return;
      }
      
      const newFromTimeInput = document.getElementById('editFromTime');
      const newToTimeInput = document.getElementById('editToTime');
      
      if (!newFromTimeInput || !newToTimeInput) return;
      
      const newFromTime = newFromTimeInput.value;
      const newToTime = newToTimeInput.value;
      
      const isValid = await validateUserEditForm(newFromTime, newToTime, booking.date);
      
      if (!isValid) return;
      
      const submitBtn = editForm.querySelector('button[type="submit"]');
      const originalText = submitBtn?.innerText || 'Save Changes';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = '⏳ Updating...';
      }
      
      try {
        const updatedData = {
          name: booking.name,
          studentId: booking.studentId,
          seat: booking.seat,
          date: booking.date,
          fromTime: newFromTime,
          toTime: newToTime
        };
        
        const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          alert(`❌ ${result.message || 'Update failed'}`);
          return;
        }
        
        showSuccessMessage('✅ Booking time updated successfully!');
        closeUserEditDrawer();
        loadUserBookingData();
        
      } catch (error) {
        console.error('Error updating booking:', error);
        alert('❌ Update failed. Please check your connection.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = originalText;
        }
      }
    });
  }
});

function updateLastUpdated() {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString();
  const lastUpdatedEl = document.getElementById('lastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = formattedTime;
  }
}

function showLoading() {
  const tableBody = document.getElementById('bookingsTableBody');
  if (tableBody && (tableBody.children.length === 0 || tableBody.innerHTML.includes('Loading'))) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-text">Loading your bookings...</td>
      </tr>
    `;
  }
}

function showError(message) {
  const tableBody = document.getElementById('bookingsTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="icon">⚠️</div>
          ${message}
        </td>
      </tr>
    `;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.loadUserBookingData = loadUserBookingData;
window.searchBookings = searchBookings;
window.filterBookings = filterBookings;
window.refreshHistory = refreshHistory;
window.viewUserBooking = viewUserBooking;
window.editUserBooking = editUserBooking;
window.cancelUserBooking = cancelUserBooking;
window.closeUserEditDrawer = closeUserEditDrawer;