// Load dashboard data when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setInterval(loadDashboardData, 30000); // Auto-refresh every 30 seconds
});

// Global variable to store all bookings for search
let allBookings = [];
let currentFilter = 'all'; // Track current filter

// Function to calculate booking status based on current date and time
function getBookingStatus(booking) {
  const now = new Date();
  const bookingDate = new Date(booking.date);
  const fromTime = booking.fromTime;
  const toTime = booking.toTime;
  
  // Parse booking time
  const [fromHour, fromMinute] = fromTime.split(':').map(Number);
  const [toHour, toMinute] = toTime.split(':').map(Number);
  
  // Set booking start and end datetime
  const bookingStart = new Date(bookingDate);
  bookingStart.setHours(fromHour, fromMinute, 0, 0);
  
  const bookingEnd = new Date(bookingDate);
  bookingEnd.setHours(toHour, toMinute, 0, 0);
  
  // Check if booking is for future date or future time today
  if (bookingStart > now) {
    return { status: 'upcoming', text: 'Upcoming', class: 'status-upcoming' };
  }
  
  // Check if booking is currently active
  if (now >= bookingStart && now <= bookingEnd) {
    return { status: 'active', text: 'Active', class: 'status-active' };
  }
  
  // Check if booking has expired
  if (now > bookingEnd) {
    return { status: 'expired', text: 'Expired', class: 'status-expired' };
  }
  
  return { status: 'unknown', text: 'Unknown', class: 'status-unknown' };
}

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
    
    // Display bookings in table (apply current filter)
    applyCurrentFilter();
    
    // Update last updated time
    updateLastUpdated();
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Failed to load dashboard data. Make sure the server is running on http://localhost:5000');
  }
}

// Function to apply current filter
function applyCurrentFilter() {
  if (currentFilter === 'all') {
    displayBookings(allBookings);
  } else {
    const filtered = allBookings.filter(booking => {
      const status = getBookingStatus(booking);
      return status.status === currentFilter;
    });
    displayBookings(filtered);
  }
}

// Function to filter by status
function filterByStatus(status) {
  currentFilter = status;
  
  // Update active button state
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active');
    }
  });
  
  // Apply filter
  applyCurrentFilter();
}

// Function to update statistics
// Function to update statistics - ONLY COUNT CURRENTLY ACTIVE SEATS
function updateStatistics(bookings) {
  const totalSeats = 32;
  const today = new Date().toLocaleDateString();
  
  // Track seats that are ACTIVE right now (not expired or upcoming)
  const activeSeats = new Set();
  
  bookings.forEach(booking => {
    const status = getBookingStatus(booking);
    
    // ONLY add seats that are currently ACTIVE
    if (status.status === 'active') {
      if (booking.seat && Array.isArray(booking.seat)) {
        booking.seat.forEach(seat => activeSeats.add(seat));
      } else if (booking.seat) {
        activeSeats.add(booking.seat);
      }
    }
  });
  
  const currentlyBookedCount = activeSeats.size;
  const currentlyAvailableCount = totalSeats - currentlyBookedCount;
  
  // Count today's bookings (all bookings for today, any status)
  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date).toLocaleDateString();
    return bookingDate === today;
  }).length;
  
  // Update DOM with REAL-TIME data
  document.getElementById('totalSeats').textContent = totalSeats;
  document.getElementById('availableSeats').textContent = currentlyAvailableCount;
  document.getElementById('bookedSeats').textContent = currentlyBookedCount;
  document.getElementById('todayBookings').textContent = todayBookings;
}

// Function to display bookings in table
function displayBookings(bookings) {
  const tableBody = document.getElementById('bookingsTableBody');
  
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
    const statusInfo = getBookingStatus(booking);
    return `
      <tr>
        <td>${escapeHtml(booking.studentId || 'N/A')}</td>
        <td>${escapeHtml(booking.name || 'N/A')}</td>
        <td><strong>${formatSeats(booking.seat)}</strong></td>
        <td>${booking.date || 'N/A'}</td>
        <td>${booking.fromTime || 'N/A'} - ${booking.toTime || 'N/A'}</td>
        <td><span class="status-badge ${statusInfo.class}">${statusInfo.text}</span></td>
        <td class="action-buttons">
          <button onclick="editBooking('${booking._id}')" class="btn-edit" title="Edit Booking">✏️</button>
          <button onclick="deleteBooking('${booking._id}')" class="btn-delete" title="Delete Booking">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
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
  
  let bookingsToSearch = allBookings;
  
  // If filter is active, search within filtered results
  if (currentFilter !== 'all') {
    bookingsToSearch = allBookings.filter(booking => {
      const status = getBookingStatus(booking);
      return status.status === currentFilter;
    });
  }
  
  if (!searchTerm) {
    displayBookings(bookingsToSearch);
    return;
  }
  
  const filtered = bookingsToSearch.filter(booking => 
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
        <td colspan="7" class="loading-text">Loading bookings...</td>
      </tr>
    `;
  }
}

// Helper function to show error
function showError(message) {
  const tableBody = document.getElementById('bookingsTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">
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

// Delete booking 
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

// Edit booking for admin drawer
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
  document.getElementById("admin-drawer").classList.remove("-translate-x-full");
}

// Close admin drawer
function closeAdminDrawer() {
  document.getElementById("admin-drawer").classList.add("-translate-x-full");
}

// Add status filter buttons to the UI
function addStatusFilters() {
  const tableHeader = document.querySelector('.table-header');
  if (tableHeader && !document.querySelector('.status-filters')) {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'status-filters';
    filterDiv.innerHTML = `
      <button class="filter-btn active" data-status="all" onclick="filterByStatus('all')">📊 All</button>
      <button class="filter-btn" data-status="active" onclick="filterByStatus('active')">🟢 Active</button>
      <button class="filter-btn" data-status="upcoming" onclick="filterByStatus('upcoming')">🟡 Upcoming</button>
      <button class="filter-btn" data-status="expired" onclick="filterByStatus('expired')">🔴 Expired</button>
    `;
    tableHeader.appendChild(filterDiv);
  }
}

// Initialize filters after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Add status filters
  setTimeout(() => {
    addStatusFilters();
  }, 100);
  
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


// Function to download bookings as PDF
async function downloadPDF() {
  try {
    // Show loading message
    const downloadBtn = document.querySelector('.btn-download');
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '⏳ Generating PDF...';
    downloadBtn.disabled = true;
    
    // Get current filtered/sorted bookings for PDF
    let bookingsToExport = allBookings;
    
    // Apply current filter if not 'all'
    if (currentFilter !== 'all') {
      bookingsToExport = allBookings.filter(booking => {
        const status = getBookingStatus(booking);
        return status.status === currentFilter;
      });
    }
    
    // Apply current search if any
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
      bookingsToExport = bookingsToExport.filter(booking => 
        booking.studentId?.toLowerCase().includes(searchTerm) ||
        booking.name?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort by date (newest first)
    const sortedBookings = [...bookingsToExport].reverse();
    
    // Get current date and time for report
    const now = new Date();
    const reportDate = now.toLocaleDateString();
    const reportTime = now.toLocaleTimeString();
    
    // Get statistics
    const totalSeats = document.getElementById('totalSeats').textContent;
    const availableSeats = document.getElementById('availableSeats').textContent;
    const bookedSeats = document.getElementById('bookedSeats').textContent;
    const todayBookings = document.getElementById('todayBookings').textContent;
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Library Bookings Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3B82F6;
          }
          .header h1 {
            color: #3B82F6;
            margin: 0;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-box {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #3B82F6;
          }
          .stat-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #666;
          }
          .stat-box p {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            color: #3B82F6;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #3B82F6;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 12px;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
          }
          .status-active {
            color: #10B981;
            font-weight: bold;
          }
          .status-upcoming {
            color: #F59E0B;
            font-weight: bold;
          }
          .status-expired {
            color: #EF4444;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #999;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          .filter-info {
            background: #f9fafb;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📚 Library Booking System - Admin Report</h1>
          <p>Generated on: ${reportDate} at ${reportTime}</p>
        </div>
        
        <div class="stats">
          <div class="stat-box">
            <h3>Total Seats</h3>
            <p>${totalSeats}</p>
          </div>
          <div class="stat-box">
            <h3>Available Now</h3>
            <p>${availableSeats}</p>
          </div>
          <div class="stat-box">
            <h3>Booked Seats</h3>
            <p>${bookedSeats}</p>
          </div>
          <div class="stat-box">
            <h3>Today's Bookings</h3>
            <p>${todayBookings}</p>
          </div>
        </div>
        
        ${searchTerm ? `<div class="filter-info">🔍 Filtered by: "${searchTerm}"</div>` : ''}
        ${currentFilter !== 'all' ? `<div class="filter-info">🏷️ Status Filter: ${currentFilter.toUpperCase()}</div>` : ''}
        
        <h3>Booking Details (${sortedBookings.length} records)</h3>
        
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Seat(s)</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sortedBookings.map(booking => {
              const statusInfo = getBookingStatus(booking);
              return `
                <tr>
                  <td>${escapeHtml(booking.studentId || 'N/A')}</td>
                  <td>${escapeHtml(booking.name || 'N/A')}</td>
                  <td>${formatSeats(booking.seat)}</td>
                  <td>${booking.date || 'N/A'}</td>
                  <td>${booking.fromTime || 'N/A'} - ${booking.toTime || 'N/A'}</td>
                  <td class="status-${statusInfo.status}">${statusInfo.text}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is a system-generated report from Library Booking System</p>
          <p>© ${new Date().getFullYear()} LibraryHub - All Rights Reserved</p>
        </div>
      </body>
      </html>
    `;
    
    // Use html2pdf library to convert HTML to PDF
    if (typeof html2pdf === 'undefined') {
      // Load html2pdf script dynamically
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        generatePDF(htmlContent, downloadBtn, originalText);
      };
      document.head.appendChild(script);
    } else {
      generatePDF(htmlContent, downloadBtn, originalText);
    }
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    const downloadBtn = document.querySelector('.btn-download');
    if (downloadBtn) {
      downloadBtn.innerHTML = '📄 Download PDF';
      downloadBtn.disabled = false;
    }
  }
}

// Helper function to generate PDF
function generatePDF(htmlContent, downloadBtn, originalText) {
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  
  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `library_bookings_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    // Reset button
    if (downloadBtn) {
      downloadBtn.innerHTML = originalText;
      downloadBtn.disabled = false;
    }
  }).catch((error) => {
    console.error('PDF generation error:', error);
    alert('Error generating PDF. Please try again.');
    if (downloadBtn) {
      downloadBtn.innerHTML = originalText;
      downloadBtn.disabled = false;
    }
  });
}

// Make functions globally available
window.refreshData = refreshData;
window.searchBookings = searchBookings;
window.filterByStatus = filterByStatus;
window.editBooking = editBooking;
window.deleteBooking = deleteBooking;
window.closeAdminDrawer = closeAdminDrawer;
window.downloadPDF = downloadPDF;