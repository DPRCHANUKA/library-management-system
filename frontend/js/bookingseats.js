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
      
      // Filter active bookings for current user
      const activeBookings = allBookings.filter(booking => {
        // Check if booking belongs to current user
        const bookingStudentId = booking.studentId || '';
        const userStudentId = currentUser.studentId || currentUser.id || currentUser.email || '';
        
        if (bookingStudentId !== userStudentId) return false;
        
        // Check if booking is active (not expired)
        const bookingDate = booking.date;
        if (bookingDate < todayDate) return false;
        
        if (bookingDate === todayDate) {
          const toTimeMinutes = convertTimeToMinutes(booking.toTime);
          if (toTimeMinutes <= currentTimeMinutes) return false;
        }
        
        return true;
      });
      
      // Count total seats booked (each booking can have multiple seats)
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
      
      // Show warning if user already has 2 seats
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

  // Function to set minimum time based on current time for today
  function setMinTimeForToday() {
    const selectedDate = dateInput.value;
    const todayDate = new Date().toISOString().split('T')[0];
    
    if (selectedDate === todayDate) {
      const now = new Date();
      let currentHour = now.getHours();
      let currentMinute = now.getMinutes();
      
      // Round up to next 30-minute interval
      if (currentMinute > 0 && currentMinute <= 30) {
        currentMinute = 30;
      } else if (currentMinute > 30) {
        currentHour += 1;
        currentMinute = 0;
      }
      
      const currentTimeFormatted = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      fromTimeInput.min = currentTimeFormatted;
      fromTimeInput.max = "22:00";
      
      if (fromTimeInput.value < currentTimeFormatted) {
        fromTimeInput.value = currentTimeFormatted;
      }
      
      updateToTimeMin();
      
      // Show/hide warning message
      let timeWarning = document.getElementById('timeWarning');
      if (!timeWarning) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'timeWarning';
        warningDiv.className = 'text-yellow-500 text-xs mt-1';
        fromTimeInput.parentNode.appendChild(warningDiv);
        timeWarning = warningDiv;
      }
      timeWarning.textContent = `⚠️ Current time is ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}. Earliest booking: ${currentTimeFormatted}`;
    } else {
      fromTimeInput.min = "08:00";
      fromTimeInput.max = "22:00";
      const timeWarning = document.getElementById('timeWarning');
      if (timeWarning) timeWarning.remove();
    }
  }
  
  // Function to update toTime minimum based on fromTime
  function updateToTimeMin() {
    if (fromTimeInput.value) {
      toTimeInput.min = fromTimeInput.value;
      toTimeInput.max = "22:00";
      
      if (toTimeInput.value <= fromTimeInput.value) {
        const [hours, minutes] = fromTimeInput.value.split(':');
        let newHours = parseInt(hours);
        let newMinutes = parseInt(minutes) + 30;
        
        if (newMinutes >= 60) {
          newHours += 1;
          newMinutes -= 60;
        }
        
        if (newHours < 22 || (newHours === 22 && newMinutes === 0)) {
          toTimeInput.value = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        } else {
          toTimeInput.value = "22:00";
        }
      }
    }
  }

  // Function to load ALL current bookings from database and update seat availability
  async function loadCurrentBookings() {
    const date = dateInput ? dateInput.value : formattedDate;
    const fromTime = fromTimeInput ? fromTimeInput.value : "08:00";
    const toTime = toTimeInput ? toTimeInput.value : "22:00";
    
    if (!date || !fromTime || !toTime) return;
    
    try {
      console.log(`Loading bookings for ${date} from ${fromTime} to ${toTime}...`);
      const response = await fetch(`http://localhost:5000/api/bookings/check-availability?date=${date}&fromTime=${fromTime}&toTime=${toTime}`);
      const data = await response.json();
      
      if (response.ok) {
        // Reset all seats to available first
        seats.forEach(seat => {
          seat.classList.remove('available', 'selected', 'booked');
          seat.classList.add('available');
        });
        
        // Mark booked seats for the current time slot
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

  // Auto-refresh bookings every 30 seconds for real-time updates
  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      const selectedDate = dateInput.value;
      if (fromTimeInput.value && toTimeInput.value) {
        console.log("Auto-refreshing bookings...");
        loadCurrentBookings();
        setMinTimeForToday();
        getUserActiveBookingCount(); // Refresh user's booking count
      }
    }, 30000); // Refresh every 30 seconds for real-time updates
  }

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
      showError('studentIdError', '❌ Must be exactly 10 alphanumeric characters');
      return false;
    }
    return true;
  }

  // Validate Seats with availability check
  async function validateSeats() {
    if (selectedSeats.length === 0) {
      showError('seatError', '❌ Please select at least one seat');
      return false;
    }
    
    // Check if user can book more seats
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
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    if (selectedDate > maxDate) {
      showError('dateError', '❌ Cannot book more than 7 days in advance');
      return false;
    }
    return true;
  }

  // Validate Time with current time restriction
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
    
    if (selectedDate === todayDate) {
      const now = new Date();
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      const fromMinutes = parseInt(fromTime.split(':')[0]) * 60 + parseInt(fromTime.split(':')[1]);
      
      if (fromMinutes < currentTimeMinutes - 15) {
        showError('fromTimeError', '❌ Cannot book past time. Select current or future time');
        return false;
      }
    }
    
    if (fromTime >= toTime) {
      showError('toTimeError', '❌ End time must be after start time');
      return false;
    }
    
    const fromMinutes = parseInt(fromTime.split(':')[0]) * 60 + parseInt(fromTime.split(':')[1]);
    const toMinutes = parseInt(toTime.split(':')[0]) * 60 + parseInt(toTime.split(':')[1]);
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

  // Validate all fields
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
        
        // Check if user can book more seats before selection
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
      setMinTimeForToday();
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
      updateToTimeMin();
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

        // Update UI immediately
        selectedSeats.forEach(s => {
          document.querySelectorAll(".seat").forEach(btn => {
            if (btn.getAttribute("data-seat") === s) {
              btn.classList.remove("available", "selected");
              btn.classList.add("booked");
            }
          });
        });

        // Reload bookings from database to ensure consistency
        await loadCurrentBookings();
        await getUserActiveBookingCount(); // Update user's booking count
        
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
    const now = new Date();
    let currentHour = now.getHours();
    let currentMinute = now.getMinutes();
    
    if (currentMinute > 0 && currentMinute <= 30) currentMinute = 30;
    else if (currentMinute > 30) {
      currentHour += 1;
      currentMinute = 0;
    }
    
    if (!fromTimeInput.value) {
      fromTimeInput.value = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    }
    
    if (!toTimeInput.value) {
      let newHours = currentHour;
      let newMinutes = currentMinute + 30;
      if (newMinutes >= 60) {
        newHours += 1;
        newMinutes -= 60;
      }
      toTimeInput.value = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }
    
    setMinTimeForToday();
    // Load bookings from database on page load
    loadCurrentBookings();
    getUserActiveBookingCount(); // Get user's current booking count
    startAutoRefresh();
  }
  
  updateMapSeats();
  makeMapSeatsClickable();
  
  const observer = new MutationObserver(() => updateMapSeats());
  document.querySelectorAll(".seat").forEach(seat => {
    observer.observe(seat, { attributes: true, attributeFilter: ['class'] });
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
});