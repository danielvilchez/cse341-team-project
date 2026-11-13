import railTripsRouter from './trips.js';
import apiRoutes from './api-routes.js';
import { trainsApi, trainsPage } from './trains.js';
import { Router } from 'express';
import { homePage, aboutPage, testErrorPage } from './index.js';
import { bookingsAdminPage } from '../controllers/bookings.js';
import { Router } from "express";
import ejsRoutes from "./ejs-routes.js";+-

const router = Router();

// Use API routes (e.g., /api/trains, /api/trips)
router.use(apiRoutes);

// About page
router.get('/about', aboutPage);

// Bookings admin page
router.get('/bookings-admin', bookingsAdminPage);

// Trains page
router.get('/trains', trainsPage);

/**
 * @swagger
 * /api/trains:
 *   get:
 *     summary: List all trains
 *     tags:
 *       - Trains
 *     responses:
 *       200:
 *         description: Trains retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - trains
 *               properties:
 *                 trains:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required:
 *                       - id
 *                       - name
 *                       - operator
 *                       - type
 *                       - maxSpeedKmh
 *                       - capacity
 *                       - powerSource
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: series-e353
 *                       name:
 *                         type: string
 *                         example: Series E353 Limited Express
 *                       operator:
 *                         type: string
 *                         example: JR East
 *                       imageUrl:
 *                         type: string
 *                       imageAlt:
 *                         type: string
 *                       type:
 *                         type: string
 *                         example: Limited Express
 *                       maxSpeedKmh:
 *                         type: number
 *                         example: 130
 *                       capacity:
 *                         type: number
 *                         example: 360
 *                       powerSource:
 *                         type: string
 *                         example: Electric
 *                       bestFor:
 *                         type: string
 *                       description:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/api/trains', trainsApi);
router.use('/api', apiRoutes);

// Rail trips
router.use('/trips', railTripsRouter);

// Test 500 error page
router.get('/500', testErrorPage);
// Use EJS routes (e.g., /, /about, /trains, /trips)
router.use(ejsRoutes);

export default router;