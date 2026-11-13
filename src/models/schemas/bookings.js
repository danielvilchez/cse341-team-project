import mongoose from "mongoose";

// Information for each passenger
const passengerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }
  },
  { _id: false }
);

// Main booking information
const bookingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    scheduleId: { type: Number, required: true },
    tripId: { type: String, required: true, trim: true },
    ticketClass: { type: String, required: true, trim: true },
    selectedDay: { type: String, required: true, trim: true },
    passengers: {
      type: [passengerSchema],
      required: true,
      validate: {
        validator: (passengers) =>
          passengers.length > 0 && passengers.length <= 8,
        message: "A booking must have between 1 and 8 passengers."
      }
    },
    pricePerPassenger: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true
  }
);

const booking = mongoose.model("Booking", bookingSchema, "bookings");

export default booking;
