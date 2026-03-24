// Load dashboard data when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setInterval(loadDashboardData, 30000); // Auto-refresh every 30 seconds
});

// Global variable to store all bookings for search
let allBookings = [];

// Function to load dashboard data
async function loadDashboardData() {
  try {
    showLoading();
    
    const response = await fetch('http://localhost:5000/api/bookings');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const bookings = data.bookings || data;
    
    allBookings = bookings; // Store for search
    
    // Calculate statistics
    updateStatistics(bookings);
    
    // Display bookings in table
    displayBookings(bookings);
    
    // Update last updated time
    updateLastUpdated();
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Failed to load dashboard data. Make sure the server is running on http://localhost:5000');
  }
}

// Function to update statistics
function updateStatistics(bookings) {
  const totalSeats = 32;
  const bookedSeats = new Set();
  const today = new Date().toLocaleDateString();
  
  // Count booked seats
  bookings.forEach(booking => {
    if (booking.seat && Array.isArray(booking.seat)) {
      booking.seat.forEach(seat => bookedSeats.add(seat));
    } else if (booking.seat) {
      bookedSeats.add(booking.seat);
    }
  });
  
  const bookedCount = bookedSeats.size;
  const availableCount = totalSeats - bookedCount;
  
  // Count today's bookings
  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date).toLocaleDateString();
    return bookingDate === today;
  }).length;
  
  // Update DOM
  document.getElementById('totalSeats').textContent = totalSeats;
  document.getElementById('availableSeats').textContent = availableCount;
  document.getElementById('bookedSeats').textContent = bookedCount;
  document.getElementById('todayBookings').textContent = todayBookings;
}

// Function to display bookings in table
function displayBookings(bookings) {
  const tableBody = document.getElementById('bookingsTableBody');
  
  if (!bookings || bookings.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="icon">📭</div>
          No bookings found
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort by date (newest first)
  const sortedBookings = [...bookings].reverse();
  
  tableBody.innerHTML = sortedBookings.map(booking => `
    <tr>
      <td>${escapeHtml(booking.studentId || 'N/A')}</td>
      <td>${escapeHtml(booking.name || 'N/A')}</td>
      <td><strong>${formatSeats(booking.seat)}</strong></td>
      <td>${booking.date || 'N/A'}</td>
      <td>${booking.fromTime || 'N/A'} - ${booking.toTime || 'N/A'}</td>
      <td><span class="status-badge">Active</span></td>
    </tr>
  `).join('');
}

// Helper function to format seats
function formatSeats(seats) {
  if (!seats) return 'N/A';
  if (Array.isArray(seats)) {
    return seats.join(', ');
  }
  return seats;
}

// Function to search bookings
function searchBookings() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  if (!searchTerm) {
    displayBookings(allBookings);
    return;
  }
  
  const filtered = allBookings.filter(booking => 
    booking.studentId?.toLowerCase().includes(searchTerm) ||
    booking.name?.toLowerCase().includes(searchTerm)
  );
  
  displayBookings(filtered);
}

// Function to refresh data manually
function refreshData() {
  loadDashboardData();
  // Show refresh feedback
  const refreshBtn = document.querySelector('.btn-secondary');
  const originalText = refreshBtn.innerHTML;
  refreshBtn.innerHTML = '🔄 Refreshing...';
  setTimeout(() => {
    refreshBtn.innerHTML = originalText;
  }, 1000);
}

// Helper function to update last updated time
function updateLastUpdated() {
  const now = new Date();
  const formattedTime = now.toLocaleTimeString();
  document.getElementById('lastUpdated').textContent = formattedTime;
}

// Helper function to show loading state
function showLoading() {
  const tableBody = document.getElementById('bookingsTableBody');
  if (tableBody && tableBody.children.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-text">Loading bookings...</td>
      </tr>
    `;
  }
}

// Helper function to show error
function showError(message) {
  const tableBody = document.getElementById('bookingsTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="6" class="empty-state">
        <div class="icon">⚠️</div>
        ${message}
      </td>
    </tr>
  `;
}

// Helper function to escape HTML (prevent XSS)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available
window.refreshData = refreshData;
window.searchBookings = searchBookings;