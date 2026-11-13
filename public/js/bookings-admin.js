
document.addEventListener("DOMContentLoaded", async () => {
  const loading = document.getElementById("bookings-loading");
  const errorMessage = document.getElementById("bookings-error");
  const emptyMessage = document.getElementById("bookings-empty");
  const bookingsCount = document.getElementById("bookings-count");
  const bookingsTable = document.getElementById("bookings-table");
  const bookingsList = document.getElementById("bookings-list");

  try {
    const response = await fetch("/api/bookings");

    if (!response.ok) {
      throw new Error("Unable to load bookings.");
    }

    const bookings = await response.json();

    loading.hidden = true;
    bookingsCount.textContent = `${bookings.length} booking(s) found`;

    if (bookings.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    bookings.forEach((booking) => {
      const row = document.createElement("tr");

      const values = [
        booking.id,
        booking.createdAt
          ? new Date(booking.createdAt).toLocaleDateString()
          : "N/A",
        booking.tripId,
        booking.ticketClass,
        booking.passengers?.length ?? 0,
        `$${Number(booking.totalPrice).toFixed(2)}`
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      bookingsList.appendChild(row);
    });

    bookingsTable.hidden = false;
  } catch (error) {
    console.error("Error loading bookings:", error);
    loading.hidden = true;
    errorMessage.textContent =
      "Unable to load bookings. Please try again later.";
    errorMessage.hidden = false;
    bookingsCount.textContent = "Bookings unavailable";
  }
});
