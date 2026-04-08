// @ts-nocheck
// bookingseats.js - Complete file with real-time availability checking and persistence

document.addEventListener("DOMContentLoaded", () => {
  // ========== AUTHENTICATION & NAVBAR ==========
  if (typeof updateNavbar === 'function') {
    updateNavbar("../");
  }

  // Hide Admin Dashboard button if user is not admin
  const adminBtn = document.getElementById("adminDashboardBtn");
  const bookingHistoryBtn = document.getElementById("bookingHistoryBtn");

  if (adminBtn && typeof isAdmin === 'function') {
    if (!isAdmin()) {
      adminBtn.style.display = "none";
    }
  }
  
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
  let currentUser = null;
  if (typeof getUser === 'function') {
    currentUser = getUser();
    if (currentUser) {
      console.log("Logged in as:", currentUser.name);
      const studentIdInput = document.getElementById("studentIdInput");
      if (studentIdInput && currentUser.studentId) {
        studentIdInput.value = currentUser.studentId;
        studentIdInput.readOnly = true;
      }
      
      const nameInput = document.getElementById("nameInput");
      if (nameInput && currentUser.name) {
        nameInput.value = currentUser.name;
        nameInput.readOnly = true;
      }
    }
  }

  // ========== SEAT BOOKING FUNCTIONALITY ==========
  let selectedSeats = [];
  let currentTable = null;
  let refreshInterval;
  let userActiveBookingCount = 0;

  const seats = document.querySelectorAll(".seat");
  const drawer = document.getElementById("drawer-form");
  const seatInput = document.getElementById("seatInput");
  const drawerTitle = document.getElementById("drawerTitle");
  const closeBtn = document.getElementById("closeDrawer");
  const dateInput = document.getElementById("dateInput");
  const form = document.getElementById("bookingForm");
  const fromTimeInput = document.getElementById("fromTime");
  const toTimeInput = document.getElementById("toTime");

  // Set today's date and restrict dates
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  if (dateInput) {
    dateInput.value = formattedDate;
    dateInput.min = formattedDate;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    dateInput.max = maxDate.toISOString().split('T')[0];
  }

  // Function to get current time rounded to next 30 minutes
  function getCurrentRoundedTime() {
    const now = new Date();
    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();
    
    if (currentMinute > 0 && currentMinute <= 30) {
      currentMinute = 30;
    } else if (currentMinute > 30) {
      currentHour += 1;
      currentMinute = 0;
    }
    
    // Don't exceed 6 PM
    if (currentHour >= 18) {
      currentHour = 17;
      currentMinute = 30;
    }
    
    return `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  }

  // Function to set from time as read-only and fixed to current time
  function setFixedFromTime() {
    const selectedDate = dateInput.value;
    const todayDate = new Date().toISOString().split('T')[0];
    
    if (selectedDate === todayDate) {
      // For today, set from time to current rounded time (read-only)
      const currentTimeFormatted = getCurrentRoundedTime();
      fromTimeInput.value = currentTimeFormatted;
      fromTimeInput.readOnly = true;
      fromTimeInput.style.backgroundColor = '#f3f4f6';
      fromTimeInput.style.cursor = 'not-allowed';
      
      // Set min/max for to time
      toTimeInput.min = currentTimeFormatted;
      toTimeInput.max = "18:00";
      
      // Calculate max allowed to time (4 hours from from time)
      updateToTimeConstraints();
      
      // Show warning message
      let timeWarning = document.getElementById('timeWarning');
      if (!timeWarning) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'timeWarning';
        warningDiv.className = 'text-yellow-500 text-xs mt-1';
        fromTimeInput.parentNode.appendChild(warningDiv);
        timeWarning = warningDiv;
      }
      const now = new Date();
      timeWarning.textContent = `⚠️ Start time is fixed to current time (${currentTimeFormatted}). You can only change end time.`;
    } else {
      // For future dates, allow from time selection (8 AM to 6 PM)
      fromTimeInput.readOnly = false;
      fromTimeInput.style.backgroundColor = '';
      fromTimeInput.style.cursor = 'pointer';
      fromTimeInput.min = "08:00";
      fromTimeInput.max = "18:00";
      
      if (!fromTimeInput.value || fromTimeInput.value < "08:00") {
        fromTimeInput.value = "08:00";
      }
      
      toTimeInput.min = fromTimeInput.value;
      toTimeInput.max = "18:00";
      
      const timeWarning = document.getElementById('timeWarning');
      if (timeWarning) timeWarning.remove();
    }
  }

  // Function to update to time constraints (max 4 hours from from time)
  function updateToTimeConstraints() {
    if (fromTimeInput.value) {
      const [fromHours, fromMinutes] = fromTimeInput.value.split(':').map(Number);
      
      // Calculate max allowed time (4 hours later)
      let maxHours = fromHours + 4;
      let maxMinutes = fromMinutes;
      
      if (maxMinutes >= 60) {
        maxHours += Math.floor(maxMinutes / 60);
        maxMinutes = maxMinutes % 60;
      }
      
      const maxAllowedTime = `${maxHours.toString().padStart(2, '0')}:${maxMinutes.toString().padStart(2, '0')}`;
      
      // To time cannot exceed 6 PM or max allowed time
      const absoluteMax = maxAllowedTime < "18:00" ? maxAllowedTime : "18:00";
      toTimeInput.max = absoluteMax;
      
      // Set default to time (30 minutes after from time, but not exceeding max)
      if (!toTimeInput.value || toTimeInput.value <= fromTimeInput.value) {
        let newMinutes = fromMinutes + 30;
        let newHours = fromHours;
        
        if (newMinutes >= 60) {
          newHours += 1;
          newMinutes -= 60;
        }
        
        const defaultToTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        
        if (defaultToTime <= absoluteMax) {
          toTimeInput.value = defaultToTime;
        } else {
          toTimeInput.value = absoluteMax;
        }
      }
      
      // Show duration warning
      let durationWarning = document.getElementById('durationWarning');
      if (!durationWarning) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'durationWarning';
        warningDiv.className = 'text-blue-500 text-xs mt-1';
        toTimeInput.parentNode.appendChild(warningDiv);
        durationWarning = warningDiv;
      }
      
      const maxTimeFormatted = absoluteMax;
      durationWarning.textContent = `⏱️ Max end time: ${maxTimeFormatted} (4 hours max) | Min duration: 30 minutes`;
      
      // Validate duration on to time change
      validateDuration();
    }
  }

  // Function to validate duration
  function validateDuration() {
    if (fromTimeInput.value && toTimeInput.value) {
      const fromMinutes = convertTimeToMinutes(fromTimeInput.value);
      const toMinutes = convertTimeToMinutes(toTimeInput.value);
      const duration = toMinutes - fromMinutes;
      
      let durationWarning = document.getElementById('durationWarning');
      if (!durationWarning) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'durationWarning';
        warningDiv.className = 'text-blue-500 text-xs mt-1';
        toTimeInput.parentNode.appendChild(warningDiv);
        durationWarning = warningDiv;
      }
      
      if (duration < 30) {
        durationWarning.innerHTML = '⚠️ Minimum booking is 30 minutes! Please select a later end time.';
        durationWarning.style.color = '#ef4444';
      } else if (duration > 240) {
        durationWarning.innerHTML = '⚠️ Maximum booking is 4 hours! Please select an earlier end time.';
        durationWarning.style.color = '#ef4444';
      } else {
        durationWarning.innerHTML = `✅ Duration: ${Math.floor(duration / 60)}h ${duration % 60}m (Max 4 hours)`;
        durationWarning.style.color = '#10b981';
      }
    }
  }

  // Function to get user's active booking count
  async function getUserActiveBookingCount() {
    if (!currentUser) return 0;
    
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
        const userStudentId = currentUser.studentId || currentUser.id || currentUser.email || '';
        
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
      
      userActiveBookingCount = totalSeatsBooked;
      console.log(`User has ${userActiveBookingCount} active seat(s) booked`);
      
      const limitWarning = document.getElementById('bookingLimitWarning');
      if (userActiveBookingCount >= 2) {
        if (!limitWarning) {
          const warningDiv = document.createElement('div');
          warningDiv.id = 'bookingLimitWarning';
          warningDiv.className = 'bg-red-500 text-white p-3 rounded-lg mb-4 text-center';
          warningDiv.innerHTML = `⚠️ You already have ${userActiveBookingCount} active seat(s). Maximum 2 seats allowed. Please cancel existing bookings to book more.`;
          const pageContent = document.querySelector('.page-content');
          if (pageContent && pageContent.firstChild) {
            pageContent.insertBefore(warningDiv, pageContent.firstChild);
          }
        } else {
          limitWarning.innerHTML = `⚠️ You already have ${userActiveBookingCount} active seat(s). Maximum 2 seats allowed. Please cancel existing bookings to book more.`;
          limitWarning.style.display = 'block';
        }
      } else {
        if (limitWarning) limitWarning.style.display = 'none';
      }
      
      return totalSeatsBooked;
    } catch (err) {
      console.error("Error getting user booking count:", err);
      return 0;
    }
  }

  // Helper function to convert time to minutes
  function convertTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Function to check if user can book more seats
  async function canUserBookMoreSeats(requestedSeatsCount) {
    await getUserActiveBookingCount();
    const totalAfterBooking = userActiveBookingCount + requestedSeatsCount;
    
    if (totalAfterBooking > 2) {
      alert(`❌ You cannot book ${requestedSeatsCount} more seat(s). You already have ${userActiveBookingCount} active seat(s). Maximum limit is 2 seats total.\n\nPlease cancel existing bookings to book more.`);
      return false;
    }
    return true;
  }

  // Function to load ALL current bookings from database and update seat availability
  async function loadCurrentBookings() {
    const date = dateInput ? dateInput.value : formattedDate;
    const fromTime = fromTimeInput ? fromTimeInput.value : "08:00";
    const toTime = toTimeInput ? toTimeInput.value : "18:00";
    
    if (!date || !fromTime || !toTime) return;
    
    try {
      console.log(`Loading bookings for ${date} from ${fromTime} to ${toTime}...`);
      const response = await fetch(`http://localhost:5000/api/bookings/check-availability?date=${date}&fromTime=${fromTime}&toTime=${toTime}`);
      const data = await response.json();
      
      if (response.ok) {
        seats.forEach(seat => {
          seat.classList.remove('available', 'selected', 'booked');
          seat.classList.add('available');
        });
        
        if (data.bookedSeats && data.bookedSeats.length > 0) {
          console.log(`Found ${data.bookedSeats.length} booked seats:`, data.bookedSeats);
          seats.forEach(seat => {
            const seatNumber = seat.getAttribute("data-seat");
            if (data.bookedSeats.includes(seatNumber)) {
              seat.classList.remove('available', 'selected');
              seat.classList.add('booked');
            }
          });
        } else {
          console.log("No booked seats for this time slot");
        }
        
        updateMapSeats();
      } else {
        console.error("Failed to load bookings:", data);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
    }
  }

  // Function to check if specific seat is available
  async function checkSeatAvailability(seatNumber, date, fromTime, toTime) {
    try {
      const response = await fetch(`http://localhost:5000/api/bookings/check-availability?seat=${seatNumber}&date=${date}&fromTime=${fromTime}&toTime=${toTime}`);
      const data = await response.json();
      return data.available;
    } catch (err) {
      console.error("Error checking seat availability:", err);
      return false;
    }
  }

  // Auto-refresh bookings every 30 seconds
  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      const selectedDate = dateInput.value;
      if (fromTimeInput.value && toTimeInput.value) {
        console.log("Auto-refreshing bookings...");
        loadCurrentBookings();
        getUserActiveBookingCount();
      }
    }, 30000);
  }

  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
    document.querySelectorAll('input').forEach(el => {
      el.classList.remove('input-error');
    });
  }

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

  function validateStudentId(studentId) {
    if (!studentId) {
      showError('studentIdError', '❌ Student/Lecturer ID is required');
      return false;
    }
    const idRegex = /^[A-Za-z0-9]{10}$/;
    if (!idRegex.test(studentId)) {
      showError('studentIdError', '❌ Must be exactly 10 alphanumeric characters');
      return false;
    }
    return true;
  }

  async function validateSeats() {
    if (selectedSeats.length === 0) {
      showError('seatError', '❌ Please select at least one seat');
      return false;
    }
    
    const canBook = await canUserBookMoreSeats(selectedSeats.length);
    if (!canBook) {
      showError('seatError', `❌ You already have ${userActiveBookingCount} active seat(s). Maximum limit is 2 seats total.`);
      return false;
    }
    
    const date = dateInput.value;
    const fromTime = fromTimeInput.value;
    const toTime = toTimeInput.value;
    
    for (const seat of selectedSeats) {
      const isAvailable = await checkSeatAvailability(seat, date, fromTime, toTime);
      if (!isAvailable) {
        showError('seatError', `❌ Seat ${seat} is already booked for this time slot`);
        return false;
      }
    }
    return true;
  }

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
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    if (selectedDate > maxDate) {
      showError('dateError', '❌ Cannot book more than 7 days in advance');
      return false;
    }
    return true;
  }

  // Validate Time with duration restrictions
  function validateTime(fromTime, toTime) {
    if (!fromTime) {
      showError('fromTimeError', '❌ Start time is required');
      return false;
    }
    if (!toTime) {
      showError('toTimeError', '❌ End time is required');
      return false;
    }
    
    const selectedDate = dateInput.value;
    const todayDate = new Date().toISOString().split('T')[0];
    
    // Check operating hours
    if (fromTime < "08:00" || toTime > "18:00") {
      showError('toTimeError', '❌ Booking hours are 8:00 AM to 6:00 PM only');
      return false;
    }
    
    if (fromTime >= toTime) {
      showError('toTimeError', '❌ End time must be after start time');
      return false;
    }
    
    const fromMinutes = convertTimeToMinutes(fromTime);
    const toMinutes = convertTimeToMinutes(toTime);
    const duration = toMinutes - fromMinutes;
    
    if (duration < 30) {
      showError('toTimeError', '❌ Minimum booking is 30 minutes');
      return false;
    }
    
    if (duration > 240) {
      showError('toTimeError', '❌ Maximum booking is 4 hours');
      return false;
    }
    
    return true;
  }

  async function validateForm() {
    clearErrors();
    
    const name = document.getElementById("nameInput").value.trim();
    const studentId = document.getElementById("studentIdInput").value.trim();
    const date = dateInput.value;
    const fromTime = fromTimeInput.value;
    const toTime = toTimeInput.value;
    
    const isNameValid = validateName(name);
    const isIdValid = validateStudentId(studentId);
    const isSeatValid = await validateSeats();
    const isDateValid = validateDate(date);
    const isTimeValid = validateTime(fromTime, toTime);
    
    return isNameValid && isIdValid && isSeatValid && isDateValid && isTimeValid;
  }

  // Seat selection logic
  if (seats.length > 0) {
    seats.forEach(seat => {
      seat.addEventListener("click", async () => {
        if (seat.classList.contains("booked")) {
          alert("❌ This seat is already booked for the selected time slot!");
          return;
        }
        
        const seatError = document.getElementById('seatError');
        if (seatError) seatError.style.display = 'none';

        const seatNumber = seat.getAttribute("data-seat");
        const table = seatNumber.charAt(0);
        
        const date = dateInput.value;
        const fromTime = fromTimeInput.value;
        const toTime = toTimeInput.value;
        
        const currentSeatCount = selectedSeats.includes(seatNumber) ? selectedSeats.length : selectedSeats.length + 1;
        const canBook = await canUserBookMoreSeats(currentSeatCount);
        if (!canBook && !selectedSeats.includes(seatNumber)) {
          return;
        }
        
        if (date && fromTime && toTime) {
          const isAvailable = await checkSeatAvailability(seatNumber, date, fromTime, toTime);
          if (!isAvailable) {
            alert(`❌ Seat ${seatNumber} is already booked for this time slot!`);
            seat.classList.remove('available');
            seat.classList.add('booked');
            updateMapSeats();
            return;
          }
        }

        if (selectedSeats.length === 0) currentTable = table;
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

  // Date and time change handlers
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      setFixedFromTime();
      if (fromTimeInput.value && toTimeInput.value) {
        loadCurrentBookings();
        selectedSeats = [];
        if (seatInput) seatInput.value = "";
        document.querySelectorAll(".seat.selected").forEach(s => s.classList.remove("selected"));
      }
    });
  }
  
  if (fromTimeInput) {
    fromTimeInput.addEventListener("change", () => {
      updateToTimeConstraints();
      if (dateInput.value && toTimeInput.value) {
        loadCurrentBookings();
        selectedSeats = [];
        if (seatInput) seatInput.value = "";
        document.querySelectorAll(".seat.selected").forEach(s => s.classList.remove("selected"));
      }
      validateTime(fromTimeInput.value, toTimeInput.value);
    });
  }
  
  if (toTimeInput) {
    toTimeInput.addEventListener("change", () => {
      validateDuration();
      if (dateInput.value && fromTimeInput.value) {
        loadCurrentBookings();
        selectedSeats = [];
        if (seatInput) seatInput.value = "";
        document.querySelectorAll(".seat.selected").forEach(s => s.classList.remove("selected"));
      }
      validateTime(fromTimeInput.value, toTimeInput.value);
    });
  }

  // Form submit
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!await validateForm()) {
        const firstError = document.querySelector('.error-message[style*="display: block"]');
        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const name = document.getElementById("nameInput").value.trim();
      const studentId = document.getElementById("studentIdInput").value.trim();
      const date = dateInput.value;
      const fromTime = fromTimeInput.value;
      const toTime = toTimeInput.value;

      const submitBtn = document.querySelector("button[type='submit']");
      const originalText = submitBtn?.innerText || "CONFIRM BOOKING";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ PROCESSING...";
      }

      try {
        const res = await fetch("http://localhost:5000/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, studentId, seat: selectedSeats, date, fromTime, toTime })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(`❌ ${data.message || "Booking failed"}`);
          if (data.conflictingSeats) loadCurrentBookings();
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

        await loadCurrentBookings();
        await getUserActiveBookingCount();
        
        selectedSeats = [];
        currentTable = null;
        if (seatInput) seatInput.value = "";
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
      if (name) validateName(name);
      else {
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
      if (studentId) validateStudentId(studentId);
      else {
        const errorDiv = document.getElementById('studentIdError');
        if (errorDiv) errorDiv.style.display = 'none';
        e.target.classList.remove('input-error');
      }
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
      const actualSeat = Array.from(actualSeats).find(seat => seat.getAttribute("data-seat") === seatNumber);
      
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
        const actualSeat = Array.from(document.querySelectorAll(".seat")).find(seat => seat.getAttribute("data-seat") === seatNumber);
        
        if (actualSeat && !actualSeat.classList.contains("booked")) {
          actualSeat.click();
        } else if (actualSeat && actualSeat.classList.contains("booked")) {
          alert(`❌ Seat ${seatNumber} is already booked for the selected time slot!`);
        }
      });
    });
  }
  
  // Initial setup
  if (fromTimeInput && toTimeInput && dateInput) {
    setFixedFromTime();
    updateToTimeConstraints();
    loadCurrentBookings();
    getUserActiveBookingCount();
    startAutoRefresh();
  }
  
  updateMapSeats();
  makeMapSeatsClickable();
  
  const observer = new MutationObserver(() => updateMapSeats());
  document.querySelectorAll(".seat").forEach(seat => {
    observer.observe(seat, { attributes: true, attributeFilter: ['class'] });
  });
  
  window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
});