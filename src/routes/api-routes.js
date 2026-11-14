import { Router } from 'express';
import {
    createBookingHandler,
    getAllBookingsHandler,
    getBookingByIdHandler
} from '../controllers/bookings.js';

import { trainsApi } from "./trains.js";
import { getTripsApi, getTripByIdApi } from "../controllers/trips.js";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - id
 *         - scheduleId
 *         - tripId
 *         - ticketClass
 *         - selectedDay
 *         - passengers
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
 *         id:
 *           type: string
 *           readOnly: true
 *           example: JRAB12CD34
 *         scheduleId:
 *           type: string
 *           example: '1'
 *         tripId:
 *           type: string
 *           example: alpine-panorama
 *         ticketClass:
 *           type: string
 *           enum:
 *             - standard
 *             - premium
 *             - first
 *         selectedDay:
 *           type: string
 *           enum:
 *             - monday
 *             - tuesday
 *             - wednesday
 *             - thursday
 *             - friday
 *             - saturday
 *             - sunday
 *         passengers:
 *           type: array
 *           minItems: 1
 *           maxItems: 8
 *           items:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - phone
 *               - email
 *             properties:
 *               _id:
 *                 type: string
 *                 readOnly: true
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         __v:
 *           type: integer
 *           readOnly: true
 *     Error:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: string
 *           example: Invalid booking data
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: List all bookings
 *     tags:
 *       - Bookings
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - bookings
 *               properties:
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       500:
 *         description: Failed to fetch bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bookings', getAllBookingsHandler);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking
 *     description: The server generates the booking ID. Any client-provided ID is ignored.
 *     tags:
 *       - Bookings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - tripId
 *               - ticketClass
 *               - selectedDay
 *               - passengers
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 example: '1'
 *               tripId:
 *                 type: string
 *                 example: alpine-panorama
 *               ticketClass:
 *                 type: string
 *                 enum:
 *                   - standard
 *                   - premium
 *                   - first
 *               selectedDay:
 *                 type: string
 *                 enum:
 *                   - monday
 *                   - tuesday
 *                   - wednesday
 *                   - thursday
 *                   - friday
 *                   - saturday
 *                   - sunday
 *               passengers:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 8
 *                 items:
 *                   type: object
 *                   required:
 *                     - firstName
 *                     - lastName
 *                     - phone
 *                     - email
 *                   properties:
 *                     firstName:
 *                       type: string
 *                       example: Alex
 *                     lastName:
 *                       type: string
 *                       example: Example
 *                     phone:
 *                       type: string
 *                       example: 555-0100
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: alex@example.com
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - booking
 *               properties:
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Invalid booking data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to create booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bookings', createBookingHandler);

/**
 * @swagger
 * /api/bookings/{bookingId}:
 *   get:
 *     summary: Get a booking by ID
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         description: Booking code generated by the server
 *         schema:
 *           type: string
 *         example: JRAB12CD34
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - booking
 *               properties:
 *                 booking:
 *                   $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bookings/:bookingId', getBookingByIdHandler);

// Trains API
router.get("/api/trains", trainsApi);

/**
 * @openapi
 * /api/trips:
 *   get:
 *     summary: Get all trips
 *     tags:
 *       - Trips
 *     responses:
 *       200:
 *         description: A list of trips
 *       500:
 *         description: Internal server error
 */
router.get("/api/trips", getTripsApi);

/**
 * @openapi
 * /api/trips/{id}:
 *   get:
 *     summary: Get a single trip by ID
 *     tags:
 *       - Trips
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trip found
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Internal server error
 */
router.get("/api/trips/:id", getTripByIdApi);

export default router;
