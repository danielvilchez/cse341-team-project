import { bookingPage, processBookingRequest } from './book.js';
import confirmationPage from './confirm.js';
import { renderTripsPage, renderTripDetailsPage } from '../controllers/trips.js';
import { Router } from 'express';

const router = Router();

// List all trips
router.get('/', renderTripsPage);

// Trip details page
router.get('/:tripId', renderTripDetailsPage);

// Book ticket
router.get('/booking/:scheduleId', bookingPage);
router.post('/book', processBookingRequest);

// Booking confirmation page
router.get('/confirmation/:confirmationId', confirmationPage);

export default router;