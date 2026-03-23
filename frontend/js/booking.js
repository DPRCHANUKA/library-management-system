document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById("name").value,
      seat: document.getElementById("seat").value
    };

    const result = await createBooking(data);
    console.log(result);

    alert("Booking successful!");
  });
});