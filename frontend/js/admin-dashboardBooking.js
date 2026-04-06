// Load dashboard data when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setInterval(loadDashboardData, 30000); // Auto-refresh every 30 seconds
});

// Global variable to store all bookings for search
let allBookings = [];

// Validation functions for admin drawer
function validateAdminName(name) {
  if (!name) return '❌ Name is required';
  if (name.length < 2) return '❌ Name must be at least 2 characters';
  if (name.length > 50) return '❌ Name must be less than 50 characters';
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(name)) return '❌ Name should contain only letters and spaces';
  return null;
}

function validateAdminStudentId(studentId) {
  if (!studentId) return '❌ Student/Lecturer ID is required';
  const idRegex = /^[A-Za-z0-9]{10}$/;
  if (!idRegex.test(studentId)) return '❌ Student ID or Lecturer ID must be exactly 10 alphanumeric characters';
  return null;
}

function validateAdminSeats(seats) {
  if (!seats || seats.length === 0) return '❌ Please select at least one seat';
  return null;
}

function validateAdminDate(date) {
  if (!date) return '❌ Date is required';
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) return '❌ Cannot book past dates';
  return null;
}

function validateAdminTime(fromTime, toTime) {
  if (!fromTime) return '❌ Start time is required';
  if (!toTime) return '❌ End time is required';
  if (fromTime >= toTime) return '❌ End time must be after start time';
  
  const fromMinutes = parseInt(fromTime.split(':')[0]) * 60 + parseInt(fromTime.split(':')[1]);
  const toMinutes = parseInt(toTime.split(':')[0]) * 60 + parseInt(toTime.split(':')[1]);
  const duration = toMinutes - fromMinutes;
  
  if (duration < 30) return '❌ Minimum booking duration is 30 minutes';
  if (duration > 240) return '❌ Maximum booking duration is 4 hours';
  return null;
}

function clearAdminErrors() {
  const errorIds = ['editNameError', 'editStudentIdError', 'editSeatError', 'editDateError', 'editTimeError'];
  errorIds.forEach(id => {
    const errorEl = document.getElementById(id);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  });
  
  const inputs = ['editName', 'editStudentId', 'editSeat', 'editDate', 'editFromTime', 'editToTime'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.classList.remove('input-error');
  });
}

function showAdminError(fieldId, message) {
  const errorDiv = document.getElementById(fieldId);
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
  const inputMap = {
    'editNameError': 'editName',
    'editStudentIdError': 'editStudentId',
    'editSeatError': 'editSeat',
    'editDateError': 'editDate',
    'editTimeError': 'editFromTime'
  };
  const inputId = inputMap[fieldId];
  if (inputId) {
    const input = document.getElementById(inputId);
    if (input) input.classList.add('input-error');
  }
}

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

       <td>
      <button onclick="editBooking('${booking._id}')" class="btn-edit">✏️</button>
      <button onclick="deleteBooking('${booking._id}')" class="btn-delete">🗑️</button>
    </td>
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

//delete booking 
async function deleteBooking(id) {
  if (!confirm("Are you sure you want to delete this booking?")) return;

  try {
    const res = await fetch(`http://localhost:5000/api/bookings/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();
    alert(data.message);

    loadDashboardData(); // refresh table
  } catch (err) {
    console.error(err);
    alert("Delete failed");
  }
}


//edit booking for admin drawer
function editBooking(id) {
  const booking = allBookings.find(b => b._id === id);
  if (!booking) return;

  document.getElementById("editBookingId").value = booking._id;
  document.getElementById("editName").value = booking.name;
  document.getElementById("editStudentId").value = booking.studentId;
  document.getElementById("editSeat").value = booking.seat.join(",");
  document.getElementById("editDate").value = booking.date;
  document.getElementById("editFromTime").value = booking.fromTime;
  document.getElementById("editToTime").value = booking.toTime;


  // Remove the negative translation class
 document.getElementById("admin-drawer")
 .classList.remove("-translate-x-full");
}

//close admin drawer
function closeAdminDrawer() {
  document.getElementById("admin-drawer")
  .classList.add("-translate-x-full");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminEditForm");

  // Add real-time validation for admin form fields
  const editNameField = document.getElementById("editName");
  if (editNameField) {
    editNameField.addEventListener("input", (e) => {
      const error = validateAdminName(e.target.value.trim());
      if (error) {
        showAdminError('editNameError', error);
      } else {
        const errorDiv = document.getElementById('editNameError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
    });
  }

  const editStudentIdField = document.getElementById("editStudentId");
  if (editStudentIdField) {
    editStudentIdField.addEventListener("input", (e) => {
      const error = validateAdminStudentId(e.target.value.trim());
      if (error) {
        showAdminError('editStudentIdError', error);
      } else {
        const errorDiv = document.getElementById('editStudentIdError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
    });
  }

  const editSeatField = document.getElementById("editSeat");
  if (editSeatField) {
    editSeatField.addEventListener("input", (e) => {
      const seats = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      const error = validateAdminSeats(seats);
      if (error) {
        showAdminError('editSeatError', error);
      } else {
        const errorDiv = document.getElementById('editSeatError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
    });
  }

  const editDateField = document.getElementById("editDate");
  if (editDateField) {
    editDateField.addEventListener("change", (e) => {
      const error = validateAdminDate(e.target.value);
      if (error) {
        showAdminError('editDateError', error);
      } else {
        const errorDiv = document.getElementById('editDateError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
    });
  }

  const editFromTimeField = document.getElementById("editFromTime");
  const editToTimeField = document.getElementById("editToTime");

  if (editFromTimeField) {
    editFromTimeField.addEventListener("change", () => {
      if (editFromTimeField.value && editToTimeField?.value) {
        const error = validateAdminTime(editFromTimeField.value, editToTimeField.value);
        if (error) {
          showAdminError('editTimeError', error);
        } else {
          const errorDiv = document.getElementById('editTimeError');
          if (errorDiv) errorDiv.style.display = 'none';
          editFromTimeField.classList.remove('input-error');
          if (editToTimeField) editToTimeField.classList.remove('input-error');
        }
      }
    });
  }

  if (editToTimeField) {
    editToTimeField.addEventListener("change", () => {
      if (editFromTimeField?.value && editToTimeField.value) {
        const error = validateAdminTime(editFromTimeField.value, editToTimeField.value);
        if (error) {
          showAdminError('editTimeError', error);
        } else {
          const errorDiv = document.getElementById('editTimeError');
          if (errorDiv) errorDiv.style.display = 'none';
          if (editFromTimeField) editFromTimeField.classList.remove('input-error');
          editToTimeField.classList.remove('input-error');
        }
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Get values
      const name = document.getElementById("editName").value.trim();
      const studentId = document.getElementById("editStudentId").value.trim();
      const seatValue = document.getElementById("editSeat").value;
      const seats = seatValue.split(',').map(s => s.trim()).filter(s => s);
      const date = document.getElementById("editDate").value;
      const fromTime = document.getElementById("editFromTime").value;
      const toTime = document.getElementById("editToTime").value;

      // Clear previous errors
      clearAdminErrors();

      // Validate all fields
      let hasError = false;
      
      const nameError = validateAdminName(name);
      if (nameError) {
        showAdminError('editNameError', nameError);
        hasError = true;
      }
      
      const idError = validateAdminStudentId(studentId);
      if (idError) {
        showAdminError('editStudentIdError', idError);
        hasError = true;
      }
      
      const seatError = validateAdminSeats(seats);
      if (seatError) {
        showAdminError('editSeatError', seatError);
        hasError = true;
      }
      
      const dateError = validateAdminDate(date);
      if (dateError) {
        showAdminError('editDateError', dateError);
        hasError = true;
      }
      
      const timeError = validateAdminTime(fromTime, toTime);
      if (timeError) {
        showAdminError('editTimeError', timeError);
        hasError = true;
      }
      
      if (hasError) {
        // Scroll to first error
        const firstError = document.querySelector('#admin-drawer .error-message[style*="display: block"]');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const id = document.getElementById("editBookingId").value;

      const updatedData = {
        name: name,
        studentId: studentId,
        seat: seats,
        date: date,
        fromTime: fromTime,
        toTime: toTime
      };

      try {
        const res = await fetch(`http://localhost:5000/api/bookings/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedData)
        });

        const result = await res.json();

        if (!res.ok) {
          alert(`❌ ${result.message || "Update failed"}`);
          return;
        }

        alert("✅ Booking updated successfully!");
        closeAdminDrawer();
        loadDashboardData();

      } catch (err) {
        console.log(err);
        alert("❌ Update failed. Please check your connection.");
      }
    });
  }
});

// Make functions globally available
window.refreshData = refreshData;
window.searchBookings = searchBookings;