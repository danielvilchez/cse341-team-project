import bookingsSchema from './schemas/bookings.js';

const createBooking = (bookingData) => {
    const booking = new bookingsSchema(bookingData);
    return booking.save();
};

const getAllBookings = () => {
    return bookingsSchema.find().exec();
};

const getPaginatedBookings = async ({ page = 1, limit = 10 }) => {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
        bookingsSchema
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec(),
        bookingsSchema.countDocuments()
    ]);

    return {
        data: bookings,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            sort: 'createdAt',
            order: 'desc'
        }
    };
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
    getPaginatedBookings,
    getBookingById,
    getBookingsByPassengerEmail
};
