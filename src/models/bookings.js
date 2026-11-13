import booking from "./schemas/bookings.js";

// Create a new booking
export async function createBooking(bookingData) {
  const newBooking = new booking(bookingData);
  return await newBooking.save();
}

// Get all bookings
export async function getAllBookings() {
  return await booking.find({}).sort({ createdAt: -1 }).lean();
}

// Get a booking by its ID
export async function getBookingById(id) {
  return await booking.findOne({ id }).lean();
}
