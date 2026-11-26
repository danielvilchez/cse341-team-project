import bookingsSchema from './schemas/bookings.js';

const createBooking = (bookingData) => {
    const booking = new bookingsSchema(bookingData);
    return booking.save();
};

const getAllBookings = () => {
    return bookingsSchema.find().exec();
};


const getPaginatedBookings = async ({
    page = 1,
    limit = 10,
    ticketClass,
    startDate,
    endDate
}) => {
    const skip = (page - 1) * limit;

    const filter = {};

    if (ticketClass) {
        filter.ticketClass = ticketClass;
    }

    if (startDate || endDate) {
        filter.createdAt = {};

        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setUTCDate(end.getUTCDate() + 1);
            filter.createdAt.$lt = end;
        }
    }

    const [bookings, total] = await Promise.all([
        bookingsSchema
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec(),
        bookingsSchema.countDocuments(filter)
    ]);

    return {
        data: bookings,
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            sort: 'createdAt',
            order: 'desc',
            filters: {
                ticketClass: ticketClass || null,
                startDate: startDate || null,
                endDate: endDate || null
            }
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
