import { Router } from "express";
import {
    createBookingHandler,
    getAllBookingsHandler,
    getBookingByIdHandler,
    getMyBookingsHandler
} from "../controllers/bookings.js";

import { requireApiRole } from "../middleware/auth.js";

import { trainsApi } from "./trains.js";
import { getTripsApi, getTripByIdApi } from "../controllers/trips.js";
import { getSchedulesByTrip } from "../controllers/schedules.js";

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
 *     summary: List bookings with pagination and filters
 *     description: Returns bookings ordered by creation date, newest first. Supports filtering by ticket class and booking creation date range.
 *     tags:
 *       - Bookings
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number to retrieve
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of bookings per page (maximum 100)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: ticketClass
 *         required: false
 *         description: Filter bookings by ticket class
 *         schema:
 *           type: string
 *           enum:
 *             - standard
 *             - premium
 *             - first
 *       - in: query
 *         name: startDate
 *         required: false
 *         description: Include bookings created on or after this date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: false
 *         description: Include bookings created on or before this date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Filtered bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - data
 *                 - meta
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     sort:
 *                       type: string
 *                       example: createdAt
 *                     order:
 *                       type: string
 *                       example: desc
 *                     filters:
 *                       type: object
 *                       properties:
 *                         ticketClass:
 *                           type: string
 *                           nullable: true
 *                         startDate:
 *                           type: string
 *                           nullable: true
 *                         endDate:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: Invalid pagination or filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to fetch bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/api/bookings', getAllBookingsHandler);

// Customer bookings API
router.get(
    '/api/my-bookings',
    requireApiRole('customer'),
    getMyBookingsHandler
);

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
router.post('/api/bookings', createBookingHandler);

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
router.get('/api/bookings/:bookingId', getBookingByIdHandler);

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

/**
 * @openapi
 * /api/trips/{id}/schedules:
 *   get:
 *     summary: Get schedules for a trip
 *     tags:
 *       - Schedules
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *     responses:
 *       200:
 *         description: Schedules retrieved successfully
 *       400:
 *         description: Invalid month
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Internal server error
 */
router.get("/api/trips/:id/schedules", getSchedulesByTrip);

export default router;
