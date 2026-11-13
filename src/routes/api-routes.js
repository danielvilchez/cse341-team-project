import { Router } from 'express';
import {
    createBookingHandler,
    getAllBookingsHandler,
    getBookingByIdHandler
} from '../controllers/bookings.js';

const router = Router();

router.get('/bookings', getAllBookingsHandler);
router.post('/bookings', createBookingHandler);
router.get('/bookings/:bookingId', getBookingByIdHandler);

export default router;
