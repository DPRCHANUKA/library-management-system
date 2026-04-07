// Load user booking history when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadUserBookingData();
  setInterval(loadUserBookingData, 30000); // Auto-refresh every 30 seconds
});

// Global variable to store user's bookings for search
let allUserBookings = [];
let currentFilter = 'all';

// Get current logged in user - USING SAME METHOD AS ADMIN DASHBOARD
function getCurrentUser() {
  try {
    // Try to use the global getUser function from auth.js first
    if (typeof getUser === 'function') {
      const user = getUser();
      if (user) return user;
    }
    
    // Fallback: check localStorage directly
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

// Function to load user's booking data
async function loadUserBookingData() {
  try {
    showLoading();
    
    const user = getCurrentUser();
    console.log('Current user:', user); // Debug: check what user object looks like
    
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
    
    console.log('All bookings:', allBookings); // Debug: check all bookings
    console.log('User ID to match:', user.id, user.studentId, user.email); // Debug
    
    // Filter bookings for current user only - TRY MULTIPLE MATCHING METHODS
    allUserBookings = allBookings.filter(booking => {
      // Check multiple possible user identifiers
      const bookingStudentId = booking.studentId || '';
      const userName = booking.name || '';
      
      const userStudentId = user.studentId || user.id || user.email || '';
      const userNameMatch = user.name || '';
      
      return bookingStudentId === userStudentId || 
             bookingStudentId === user.id ||
             bookingStudentId === user.email ||
             userName === userNameMatch ||
             (bookingStudentId && bookingStudentId.toLowerCase() === userStudentId.toLowerCase());
    });
    
    console.log('Filtered user bookings:', allUserBookings); // Debug: check filtered bookings
    
    // Calculate statistics for user
    updateUserStatistics(allUserBookings);
    
    // Display user's bookings in table
    displayUserBookings(allUserBookings);
    
    // Update last updated time
    updateLastUpdated();
    
  } catch (error) {
    console.error('Error loading user bookings:', error);
    showError('Failed to load your bookings. Make sure the server is running on http://localhost:5000');
  }
}

// Function to update user statistics
function updateUserStatistics(bookings) {
  const total = bookings.length;
  const today = new Date().toDateString();
  const now = new Date();
  
  // Count active bookings (today and current time within range)
  const active = bookings.filter(booking => {
    if (booking.status === 'cancelled') return false;
    const bookingDate = new Date(booking.date).toDateString();
    if (bookingDate !== today) return false;
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const fromTime = convertTimeToMinutes(booking.fromTime);
    const toTime = convertTimeToMinutes(booking.toTime);
    
    return currentTime >= fromTime && currentTime <= toTime;
  }).length;
  
  // Count completed bookings (today but time passed)
  const completed = bookings.filter(booking => {
    if (booking.status === 'cancelled') return false;
    if (booking.status === 'completed') return true;
    
    const bookingDate = new Date(booking.date).toDateString();
    if (bookingDate !== today) return false;
    
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const toTime = convertTimeToMinutes(booking.toTime);
    
    return currentTime > toTime;
  }).length;
  
 
  
  // Update DOM
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
// Function to display user's bookings in table
function displayUserBookings(bookings) {
  const tableBody = document.getElementById('bookingsTableBody');
  
  if (!tableBody) {
    console.error('Table body element not found');
    return;
  }
  
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
  
  // Sort by date (newest first)
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
          ${canEdit ? `<button onclick="editUserBooking('${bookingId}')" class="btn-edit">✏️ Edit</button>` : ''}
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

// Get status CSS class
function getStatusClass(status) {
  switch(status) {
    case 'active': return 'status-active';
    case 'completed': return 'status-completed';
    case 'cancelled': return 'status-cancelled';
    default: return 'status-active';
  }
}

// Get status text
function getStatusText(status) {
  switch(status) {
    case 'active': return 'Active Now';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return 'Active';
  }
}

// Check if booking can be edited (only active today's bookings)
function canEditBooking(booking) {
  if (booking.status === 'cancelled') return false;
  if (booking.status === 'completed') return false;
  
  const today = new Date().toDateString();
  const bookingDate = new Date(booking.date).toDateString();
  
  // Only today's bookings can be edited
  if (bookingDate !== today) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const toTime = convertTimeToMinutes(booking.toTime);
  
  // Can edit if booking hasn't ended yet
  return currentTime <= toTime;
}

// Format date
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

// Function to search user's bookings
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

// Function to filter bookings by status
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

// Function to refresh data manually
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

// View user booking details
function viewUserBooking(id) {
  const booking = allUserBookings.find(b => (b._id === id || b.id === id));
  if (!booking) return;
  
  const status = getBookingStatus(booking);
  const statusText = getStatusText(status);
  
  alert(`Booking Details:
    
Booking ID: ${id}
Seat: ${formatSeats(booking.seat)}
Date: ${booking.date}
Time: ${booking.fromTime} - ${booking.toTime}
Status: ${statusText}
Name: ${booking.name}
Student ID: ${booking.studentId}
Booked On: ${booking.createdAt ? formatDate(booking.createdAt) : 'N/A'}`);
}

// Edit user booking
function editUserBooking(id) {
  const booking = allUserBookings.find(b => (b._id === id || b.id === id));
  if (!booking) return;
  
  if (!canEditBooking(booking)) {
    alert('This booking cannot be edited because it has already expired.');
    return;
  }
  
  // Populate edit form
  const editBookingId = document.getElementById('editBookingId');
  const editSeat = document.getElementById('editSeat');
  const editFromTime = document.getElementById('editFromTime');
  const editToTime = document.getElementById('editToTime');
  
  if (editBookingId) editBookingId.value = booking._id || booking.id;
  if (editSeat) {
    const seatValue = Array.isArray(booking.seat) ? booking.seat[0] : booking.seat;
    editSeat.value = seatValue;
  }
  if (editFromTime) editFromTime.value = booking.fromTime;
  if (editToTime) editToTime.value = booking.toTime;
  
  // Clear previous errors
  clearEditErrors();
  
  // Show drawer
  const drawer = document.getElementById('user-edit-drawer');
  if (drawer) {
    drawer.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

// Cancel user booking
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
    loadUserBookingData(); // Reload
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    alert('❌ Cancel failed. Please check your connection.');
  }
}

// Close edit drawer
function closeUserEditDrawer() {
  const drawer = document.getElementById('user-edit-drawer');
  if (drawer) {
    drawer.style.display = 'none';
  }
  document.body.style.overflow = 'auto';
  clearEditErrors();
}

// Clear edit form errors
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

// Validate user edit form
function validateUserEditForm(seat, fromTime, toTime, originalSeat, bookingId, bookingDate) {
  // Check if seat is changed and already booked
  if (seat !== originalSeat) {
    // Check if seat is already booked for this time slot
    const isSeatTaken = allUserBookings.some(booking => {
      if ((booking._id === bookingId || booking.id === bookingId)) return false;
      if (booking.status === 'cancelled') return false;
      if (booking.date !== bookingDate) return false;
      
      const bookingSeat = Array.isArray(booking.seat) ? booking.seat[0] : booking.seat;
      if (bookingSeat !== seat) return false;
      
      const existingFrom = convertTimeToMinutes(booking.fromTime);
      const existingTo = convertTimeToMinutes(booking.toTime);
      const newFrom = convertTimeToMinutes(fromTime);
      const newTo = convertTimeToMinutes(toTime);
      
      return (newFrom < existingTo && newTo > existingFrom);
    });
    
    if (isSeatTaken) {
      const errorEl = document.getElementById('editSeatError');
      if (errorEl) {
        errorEl.textContent = 'This seat is already booked for the selected time slot';
        errorEl.classList.add('show');
      }
      return false;
    }
  }
  
  // Validate time range
  if (fromTime >= toTime) {
    const errorEl = document.getElementById('editTimeError');
    if (errorEl) {
      errorEl.textContent = 'End time must be after start time';
      errorEl.classList.add('show');
    }
    return false;
  }
  
  // Validate operating hours
  if (fromTime < '08:00' || toTime > '18:00') {
    const errorEl = document.getElementById('editTimeError');
    if (errorEl) {
      errorEl.textContent = 'Booking hours are 8:00 AM to 6:00 PM only';
      errorEl.classList.add('show');
    }
    return false;
  }
  
  return true;
}

// Show success message
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
      
      const newSeatInput = document.getElementById('editSeat');
      const newFromTimeInput = document.getElementById('editFromTime');
      const newToTimeInput = document.getElementById('editToTime');
      
      if (!newSeatInput || !newFromTimeInput || !newToTimeInput) return;
      
      const newSeat = newSeatInput.value;
      const newFromTime = newFromTimeInput.value;
      const newToTime = newToTimeInput.value;
      const originalSeat = Array.isArray(booking.seat) ? booking.seat[0] : booking.seat;
      
      // Validate
      const isValid = validateUserEditForm(newSeat, newFromTime, newToTime, originalSeat, bookingId, booking.date);
      
      if (!isValid) return;
      
      try {
        const updatedData = {
          name: booking.name,
          studentId: booking.studentId,
          seat: [newSeat],
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
        
        showSuccessMessage('✅ Booking updated successfully!');
        closeUserEditDrawer();
        loadUserBookingData(); // Reload
        
      } catch (error) {
        console.error('Error updating booking:', error);
        alert('❌ Update failed. Please check your connection.');
      }
    });
  }
});

// Helper function to update last updated time
function updateLastUpdated() {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString();
  const lastUpdatedEl = document.getElementById('lastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.textContent = formattedTime;
  }
}

// Helper function to show loading state
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

// Helper function to show error
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

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available
window.loadUserBookingData = loadUserBookingData;
window.searchBookings = searchBookings;
window.filterBookings = filterBookings;
window.refreshHistory = refreshHistory;
window.viewUserBooking = viewUserBooking;
window.editUserBooking = editUserBooking;
window.cancelUserBooking = cancelUserBooking;
window.closeUserEditDrawer = closeUserEditDrawer;