// ===== REVIEWS PAGE LOGIC =====
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar("../");

  // Review and Donation → Donation page with Request type pre-selected
  const rdBtn = document.getElementById("reviewAndDonationBtn");
  if (rdBtn) {
    rdBtn.addEventListener("click", () => {
      window.location.href = "donation.html?type=Request";
    });
  }

  // Scroll-triggered fade-in animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(
    ".reviews-stat-card, .feed-featured, .feed-side-card, .testimonial-card"
  ).forEach((el) => observer.observe(el));
});
