import bookingsSchema from './schemas/bookings.js';

const createBooking = (bookingData) => {
    const booking = new bookingsSchema(bookingData);
    return booking.save();
};

const getAllBookings = () => {
    return bookingsSchema.find().exec();
};

const getBookingById = (bookingId) => {
    return bookingsSchema.findOne({ id: bookingId }).exec();
};

export { 
    createBooking, 
    getAllBookings, 
    getBookingById 
};