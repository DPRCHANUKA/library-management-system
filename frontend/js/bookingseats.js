// @ts-nocheck
// bookingseats.js - Complete file with both booking AND authentication

document.addEventListener("DOMContentLoaded", () => {
  // ========== AUTHENTICATION & NAVBAR (Moved here) ==========
  // Update navbar
  if (typeof updateNavbar === 'function') {
    updateNavbar("../");
  }

  // Hide Admin Dashboard button if user is not admin and 
  // show Booking History button if user is not logged in as admin
  const adminBtn = document.getElementById("adminDashboardBtn");
  const bookingHistoryBtn = document.getElementById("bookingHistoryBtn");

  if (adminBtn && typeof isAdmin === 'function') {
    if (!isAdmin()) {
      adminBtn.style.display = "none";
    }
  }
  // Show/hide Booking History button logic
if (bookingHistoryBtn && typeof isAdmin === 'function') {
  if (!isAdmin()) {
    bookingHistoryBtn.style.display = "block";
  } else {
    bookingHistoryBtn.style.display = "none";
  }
}

  // Check if user is logged in
  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    if (typeof showToast === 'function') {
      showToast("Please login to book seats", "error");
    } else {
      alert("Please login to book seats");
    }
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }
  
  // Display user info
  if (typeof getUser === 'function') {
    const user = getUser();
    if (user) {
      console.log("Logged in as:", user.name);
      const studentIdInput = document.getElementById("studentIdInput");
      if (studentIdInput && user.studentId) {
        studentIdInput.value = user.studentId;
        studentIdInput.readOnly = true;
      }
      
      const nameInput = document.getElementById("nameInput");
      if (nameInput && user.name) {
        nameInput.value = user.name;
        nameInput.readOnly = true;
      }
    }
  }

  // ========== SEAT BOOKING FUNCTIONALITY ==========
  let selectedSeats = [];
  let currentTable = null;

  const seats = document.querySelectorAll(".seat");
  const drawer = document.getElementById("drawer-form");
  const seatInput = document.getElementById("seatInput");
  const drawerTitle = document.getElementById("drawerTitle");
  const closeBtn = document.getElementById("closeDrawer");
  const dateInput = document.getElementById("dateInput");
  const form = document.getElementById("bookingForm");

  // Set today's date
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  if (dateInput) dateInput.value = formattedDate;

  // Clear all error messages
  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    document.querySelectorAll('input').forEach(el => {
      el.classList.remove('input-error');
    });
  }

  // Show error for specific field
  function showError(fieldId, message) {
    const errorDiv = document.getElementById(fieldId);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
    const inputField = document.getElementById(fieldId.replace('Error', 'Input'));
    if (inputField) {
      inputField.classList.add('input-error');
    }
  }

  // Validate Name
  function validateName(name) {
    if (!name) {
      showError('nameError', '❌ Name is required');
      return false;
    }
    if (name.length < 2) {
      showError('nameError', '❌ Name must be at least 2 characters');
      return false;
    }
    if (name.length > 50) {
      showError('nameError', '❌ Name must be less than 50 characters');
      return false;
    }
    const nameRegex = /^[A-Za-z\s.-]+$/;
    if (!nameRegex.test(name)) {
      showError('nameError', '❌ Name should contain only letters and spaces');
      return false;
    }
    return true;
  }

  // Validate Student ID
  function validateStudentId(studentId) {
    if (!studentId) {
      showError('studentIdError', '❌ Student/Lecturer ID is required');
      return false;
    }
    const idRegex = /^[A-Za-z0-9]{10}$/;
    if (!idRegex.test(studentId)) {
      showError('studentIdError', '❌ Student ID or Lecturer ID must be exactly 10 alphanumeric characters');
      return false;
    }
    return true;
  }

  // Validate Seats
  function validateSeats() {
    if (selectedSeats.length === 0) {
      showError('seatError', '❌ Please select at least one seat');
      return false;
    }
    return true;
  }

  // Validate Date
  function validateDate(date) {
    if (!date) {
      showError('dateError', '❌ Date is required');
      return false;
    }
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      showError('dateError', '❌ Cannot book past dates');
      return false;
    }
    return true;
  }

  // Validate Time
  function validateTime(fromTime, toTime) {
    if (!fromTime) {
      showError('fromTimeError', '❌ Start time is required');
      return false;
    }
    if (!toTime) {
      showError('toTimeError', '❌ End time is required');
      return false;
    }
    
    if (fromTime >= toTime) {
      showError('toTimeError', '❌ End time must be after start time');
      return false;
    }
    
    const fromMinutes = parseInt(fromTime.split(':')[0]) * 60 + parseInt(fromTime.split(':')[1]);
    const toMinutes = parseInt(toTime.split(':')[0]) * 60 + parseInt(toTime.split(':')[1]);
    const duration = toMinutes - fromMinutes;
    
    if (duration < 30) {
      showError('toTimeError', '❌ Minimum booking duration is 30 minutes');
      return false;
    }
    
    if (duration > 240) {
      showError('toTimeError', '❌ Maximum booking duration is 4 hours');
      return false;
    }
    
    return true;
  }

  // Validate all fields
  function validateForm() {
    clearErrors();
    
    const name = document.getElementById("nameInput").value.trim();
    const studentId = document.getElementById("studentIdInput").value.trim();
    const date = dateInput.value;
    const fromTime = document.getElementById("fromTime").value;
    const toTime = document.getElementById("toTime").value;
    
    const isNameValid = validateName(name);
    const isIdValid = validateStudentId(studentId);
    const isSeatValid = validateSeats();
    const isDateValid = validateDate(date);
    const isTimeValid = validateTime(fromTime, toTime);
    
    return isNameValid && isIdValid && isSeatValid && isDateValid && isTimeValid;
  }

  // Seat selection logic
  if (seats.length > 0) {
    seats.forEach(seat => {
      seat.addEventListener("click", () => {
        if (seat.classList.contains("booked")) return;
        
        const seatError = document.getElementById('seatError');
        if (seatError) {
          seatError.style.display = 'none';
        }

        const seatNumber = seat.getAttribute("data-seat");
        const table = seatNumber.charAt(0);

        if (selectedSeats.length === 0) {
          currentTable = table;
        }

        if (table !== currentTable) {
          alert("❌ Select seats from same table only!");
          return;
        }

        if (selectedSeats.length >= 2 && !selectedSeats.includes(seatNumber)) {
          alert("❌ You can only book 2 seats maximum!");
          return;
        }

        if (selectedSeats.includes(seatNumber)) {
          selectedSeats = selectedSeats.filter(s => s !== seatNumber);
          seat.classList.remove("selected");
        } else {
          selectedSeats.push(seatNumber);
          seat.classList.add("selected");
        }

        if (seatInput) seatInput.value = selectedSeats.join(", ");
        if (drawerTitle) drawerTitle.innerText = "Booking for " + (seatInput?.value || "Select Seats");
        
        if (drawer) drawer.classList.remove("-translate-x-full");
      });
    });
  }

  // Form submit
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        const firstError = document.querySelector('.error-message[style*="display: block"]');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      const name = document.getElementById("nameInput").value.trim();
      const studentId = document.getElementById("studentIdInput").value.trim();
      const date = dateInput.value;
      const fromTime = document.getElementById("fromTime").value;
      const toTime = document.getElementById("toTime").value;

      const submitBtn = document.querySelector("button[type='submit']");
      const originalText = submitBtn?.innerText || "CONFIRM BOOKING";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ PROCESSING...";
      }

      try {
        const res = await fetch("http://localhost:5000/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            studentId,
            seat: selectedSeats,
            date,
            fromTime,
            toTime
          })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(`❌ ${data.message || "Booking failed"}`);
          return;
        }

        alert(`✅ Booking Confirmed!\n\nSeat(s): ${selectedSeats.join(", ")}\nDate: ${date}\nTime: ${fromTime} - ${toTime}\n\nThank you, ${name}!`);

        selectedSeats.forEach(s => {
          document.querySelectorAll(".seat").forEach(btn => {
            if (btn.getAttribute("data-seat") === s) {
              btn.classList.remove("available", "selected");
              btn.classList.add("booked");
            }
          });
        });

        selectedSeats = [];
        currentTable = null;
        if (seatInput) seatInput.value = "";
        const nameInput = document.getElementById("nameInput");
        const studentIdInput = document.getElementById("studentIdInput");
        const fromTimeInput = document.getElementById("fromTime");
        const toTimeInput = document.getElementById("toTime");
        
        if (nameInput) nameInput.value = "";
        if (studentIdInput) studentIdInput.value = "";
        if (fromTimeInput) fromTimeInput.value = "";
        if (toTimeInput) toTimeInput.value = "";
        
        clearErrors();
        if (drawer) drawer.classList.add("-translate-x-full");

      } catch (err) {
        console.log(err);
        alert("❌ Error connecting to server. Please make sure server is running.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = originalText;
        }
      }
    });
  }

  // Real-time validation
  const nameInputField = document.getElementById("nameInput");
  if (nameInputField) {
    nameInputField.addEventListener("input", (e) => {
      const name = e.target.value.trim();
      if (name) {
        validateName(name);
      } else {
        const errorDiv = document.getElementById('nameError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
    });
  }

  const studentIdField = document.getElementById("studentIdInput");
  if (studentIdField) {
    studentIdField.addEventListener("input", (e) => {
      const studentId = e.target.value.trim();
      if (studentId) {
        validateStudentId(studentId);
      } else {
        const errorDiv = document.getElementById('studentIdError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
    });
  }

  const fromTimeField = document.getElementById("fromTime");
  const toTimeField = document.getElementById("toTime");
  
  if (fromTimeField) {
    fromTimeField.addEventListener("change", () => {
      if (fromTimeField.value && toTimeField?.value) {
        validateTime(fromTimeField.value, toTimeField.value);
      }
    });
    fromTimeField.addEventListener("input", () => {
      const errorDiv = document.getElementById('toTimeError');
      if (errorDiv) errorDiv.style.display = 'none';
      fromTimeField.classList.remove('input-error');
      if (toTimeField) toTimeField.classList.remove('input-error');
    });
  }

  if (toTimeField) {
    toTimeField.addEventListener("change", () => {
      if (fromTimeField?.value && toTimeField.value) {
        validateTime(fromTimeField.value, toTimeField.value);
      }
    });
    toTimeField.addEventListener("input", () => {
      const errorDiv = document.getElementById('toTimeError');
      if (errorDiv) errorDiv.style.display = 'none';
      if (fromTimeField) fromTimeField.classList.remove('input-error');
      toTimeField.classList.remove('input-error');
    });
  }

  // Close drawer
  if (closeBtn && drawer) {
    closeBtn.addEventListener("click", () => {
      drawer.classList.add("-translate-x-full");
      clearErrors();
    });
  }

  // Map functions
  function updateMapSeats() {
    const actualSeats = document.querySelectorAll(".seat");
    const mapSeats = document.querySelectorAll(".map-seat");
    
    mapSeats.forEach(mapSeat => {
      const seatNumber = mapSeat.getAttribute("data-seat");
      const actualSeat = Array.from(actualSeats).find(
        seat => seat.getAttribute("data-seat") === seatNumber
      );
      
      if (actualSeat && actualSeat.classList.contains("booked")) {
        mapSeat.classList.add("booked-seat");
      } else {
        mapSeat.classList.remove("booked-seat");
      }
    });
    
    const totalSeats = 32;
    const bookedSeats = document.querySelectorAll(".seat.booked").length;
    const availableSeats = totalSeats - bookedSeats;
    
    const mapAvailableCount = document.getElementById("mapAvailableCount");
    const mapBookedCount = document.getElementById("mapBookedCount");
    
    if (mapAvailableCount) mapAvailableCount.textContent = availableSeats;
    if (mapBookedCount) mapBookedCount.textContent = bookedSeats;
  }
  
  function makeMapSeatsClickable() {
    const mapSeats = document.querySelectorAll(".map-seat");
    mapSeats.forEach(mapSeat => {
      mapSeat.addEventListener("click", () => {
        const seatNumber = mapSeat.getAttribute("data-seat");
        const actualSeat = Array.from(document.querySelectorAll(".seat")).find(
          seat => seat.getAttribute("data-seat") === seatNumber
        );
        
        if (actualSeat && !actualSeat.classList.contains("booked")) {
          actualSeat.click();
        } else if (actualSeat && actualSeat.classList.contains("booked")) {
          alert(`❌ Seat ${seatNumber} is already booked!`);
        }
      });
    });
  }
  
  updateMapSeats();
  makeMapSeatsClickable();
  
  const observer = new MutationObserver(() => {
    updateMapSeats();
  });
  
  document.querySelectorAll(".seat").forEach(seat => {
    observer.observe(seat, { attributes: true, attributeFilter: ['class'] });
  });
});