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

const getBookingsByPassengerEmail = (email) => {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return bookingsSchema.find({
        'passengers.email': {
            $regex: new RegExp(`^${escapedEmail}$`, 'i')
        }
    }).exec();
};

export {
    createBooking,
    getAllBookings,
    getBookingById,
    getBookingsByPassengerEmail
};
