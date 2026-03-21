const BASE_URL = "http://localhost:5000";

async function getBookings() {
  const res = await fetch(`${BASE_URL}/api/bookings`);
  return res.json();
}

async function createBooking(data) {
  const res = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  return res.json();
}