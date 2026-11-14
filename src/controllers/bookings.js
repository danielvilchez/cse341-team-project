import {
    createBooking, 
    getBookingById,
    getAllBookings
} from '../models/bookings.js';

import { getTripById } from '../models/trips.js';

import { getDb } from '../db/connect.js';
import { generateBookingCode } from '../includes/helpers.js';

// API-controller functions
const createBookingHandler = async (req, res) => {
    try {
        const requestBody = req.body || {};
        const bookingData = {
            id: generateBookingCode(),
            scheduleId: requestBody.scheduleId,
            tripId: requestBody.tripId,
            ticketClass: requestBody.ticketClass,
            selectedDay: requestBody.selectedDay,
            passengers: requestBody.passengers
        };

        const booking = await createBooking(bookingData);
        return res.status(201).json({ booking });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Invalid booking data' });
        }

        console.error('Error creating booking:', error);
        return res.status(500).json({ error: 'Failed to create booking' });
    }
};

const getAllBookingsHandler = async (req, res) => {
    try {
        const bookings = await getAllBookings();
        return res.status(200).json({ bookings });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

const getBookingByIdHandler = async (req, res) => {
    const { bookingId } = req.params; 
    try {
        const booking = await getBookingById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        return res.status(200).json({ booking });
    } catch (error) {
        console.error('Error fetching booking:', error);
        return res.status(500).json({ error: 'Failed to fetch booking' });
    }
};

const bookingsAdminPage = (req, res) => {
    return res.status(200).render('bookings', {
        title: 'Bookings Admin'
    });
};

// HTML pages controllers
const bookingPage = async (req, res, next) => {
    const { scheduleId } = req.params;
    
    try {
        const db = getDb();
        const schedule = await db.collection('schedules').findOne({ id: Number(scheduleId) });
        if (!schedule || !schedule.status) {
            const error = new Error('Schedule not found or unavailable');
            error.status = 404;
            return next(error);
        }
        const trip = await getTripById(schedule.tripId);
        if (!trip) {
            const error = new Error('Trip not found');
            error.status = 404;
            return next(error);
        }
        const ticketClasses = await db.collection('ticketClasses').find({}).toArray();
        if (ticketClasses.length === 0) {
            const error = new Error('No ticket classes found');
            error.status = 404;
            return next(error);
        }
        const ticketOptions = ticketClasses.map((ticketClass) => ({
            class: ticketClass.class,
            name: ticketClass.name,
            price: trip.distance * ticketClass.pricePerKm,
            amenities: ticketClass.amenities,
            description: ticketClass.description
        }));
    
        return res.status(200).render('trips/book', {
            title: 'Book Trip',
            schedule,
            ticketOptions
        });
    } catch (error) {
        return next(error);
    }
};

const processBookingRequest = async (req, res, next) => {
    try {
        const bookingData = {
            id: generateBookingCode(),
            scheduleId: req.body.scheduleId,
            tripId: req.body.tripId,
            ticketClass: req.body.ticketClass,
            selectedDay: req.body.selectedDay,
            passengers: req.body.passengers
        };
    
        const booking = await createBooking(bookingData);
    
        return res.redirect(302, `/trips/confirmation/${booking.id}`);
    } catch (error) {
        return next(error)
    }
};

const confirmationPage = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const booking = await getBookingById(bookingId);

        if (!booking) {
            const error = new Error('Booking not found');
            error.status = 404;
            return next(error);
        }

        return res.status(200).render('trips/confirm', {
            title: 'Trip Confirmation',
            booking
        });
    } catch (error) {
        return next(error);
    }
};

export { 
    createBookingHandler,
    getAllBookingsHandler,
    getBookingByIdHandler,
    bookingsAdminPage,
    bookingPage,
    processBookingRequest,
    confirmationPage
};
