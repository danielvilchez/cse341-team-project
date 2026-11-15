import railTripsRouter from './trips.js';
import apiRoutes from './api-routes.js';
import { trainsPage } from './trains.js';
import { Router } from 'express';
import { aboutPage, testErrorPage } from './index.js';
import { bookingsAdminPage } from '../controllers/bookings.js';
import ejsRoutes from "./ejs-routes.js";

const router = Router();

// Use API routes (e.g., /api/trains, /api/trips)
router.use(apiRoutes);

// About page
router.get('/about', aboutPage);

// Bookings admin page
router.get('/bookings-admin', bookingsAdminPage);

// Trains page
router.get('/trains', trainsPage);

router.use('/api', apiRoutes);

// Rail trips
router.use('/trips', railTripsRouter);

// Test 500 error page
router.get('/500', testErrorPage);
// Use EJS routes (e.g., /, /about, /trains, /trips)
router.use(ejsRoutes);

export default router;