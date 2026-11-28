import { Router } from "express";

import {
    requireApiLogin,
    requireUserOwnerOrAdmin
} from "../middleware/auth.js"

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

import {
    getUsersHandler,
    updateUserHandler,
    deleteUserHandler
} from "../controllers/users.js"

import { getTicketClasses } from "../controllers/ticket-classes.js";

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
 *     User:
 *       type: object
 *       description: Safe user profile. Passwords and password hashes are never returned.
 *       required:
 *         - id
 *         - name
 *         - username
 *         - email
 *         - role
 *       properties:
 *         id:
 *           type: string
 *           description: User ID
 *           example: 64f000000000000000000001
 *         name:
 *           type: string
 *           example: Sample User
 *         username:
 *           type: string
 *           example: sampleuser
 *         email:
 *           type: string
 *           format: email
 *           example: sample@example.com
 *         role:
 *           type: string
 *           enum:
 *             - customer
 *             - admin
 *           example: customer
 *     UserListResponse:
 *       type: object
 *       required:
 *         - users
 *         - pagination
 *       properties:
 *         users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         pagination:
 *           type: object
 *           required:
 *             - page
 *             - limit
 *             - total
 *             - totalPages
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 *     UserResponse:
 *       type: object
 *       required:
 *         - user
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *     UserUpdateRequest:
 *       type: object
 *       additionalProperties: false
 *       description: Partial update. Omitted fields remain unchanged; an empty object is allowed.
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           example: Updated Name
 *         username:
 *           type: string
 *           minLength: 1
 *           description: Normalized to lowercase.
 *           example: updateduser
 *         email:
 *           type: string
 *           format: email
 *           description: Normalized to lowercase.
 *           example: updated@example.com
 *         password:
 *           type: string
 *           format: password
 *           writeOnly: true
 *           description: New plaintext password accepted only in the request; it is never returned.
 *         role:
 *           type: string
 *           enum:
 *             - customer
 *             - admin
 *           description: Only admins may update a user's role.
 *     UserDeleteRequest:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           format: password
 *           writeOnly: true
 *           description: Current password of the authenticated user, required to confirm deletion.
 *     UserError:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           example: Invalid user data.
 *   securitySchemes:
 *     sessionCookie:
 *       type: apiKey
 *       in: cookie
 *       name: connect.sid
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

//Ticket Classes
/**
 * @openapi
 * /api/ticket-classes:
 *   get:
 *     summary: Get ticket classes
 *     description: Returns all ticket classes, or only those available on a specific day when the day query parameter is provided. The days field is optional and is only present when the class is limited to specific days.
 *     tags:
 *       - Ticket Classes
 *     parameters:
 *       - in: query
 *         name: day
 *         required: false
 *         description: Day of the week to filter ticket classes
 *         schema:
 *           type: string
 *           enum:
 *             - monday
 *             - tuesday
 *             - wednesday
 *             - thursday
 *             - friday
 *             - saturday
 *             - sunday
 *     responses:
 *       200:
 *         description: A list of ticket classes
 *         content:
 *           application/json:
 *             example:
 *               - class: "first"
 *                 name: "First Class"
 *                 pricePerKm: 250
 *                 amenities:
 *                   - "Private compartment"
 *                   - "Multi-course meal"
 *                   - "Champagne service"
 *                   - "Priority boarding"
 *                   - "Souvenir gift"
 *                 description: "Ultimate luxury with private seating and full dining service"
 *       400:
 *         description: Invalid day in query named 'day'
 *         content:
 *           application/json:
 *             example:
 *               message: "Invalid day in query named 'day'"
 *       500:
 *         description: Error fetching ticket classes
 *         content:
 *           application/json:
 *             example:
 *               message: "Error fetching ticket classes"
 */
router.get("/api/ticket-classes", getTicketClasses);

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

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users visible to the authenticated user
 *     description: Admins receive all users. Customers receive only their own user record. Passwords and password hashes are never returned.
 *     tags:
 *       - Users
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         description: Text search across name, username, and email. Search is applied to admin results; customers still receive only their own record.
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: page
 *         required: false
 *         description: One-based result page; defaults to 1.
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Page size; defaults to 25 and cannot exceed 100.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Safe user records and pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *       400:
 *         description: Invalid search or pagination parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       403:
 *         description: The authenticated account does not have an allowed role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       404:
 *         description: The authenticated customer's user record was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       500:
 *         description: Unexpected server or database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 */
router.get("/api/users", requireApiLogin, getUsersHandler);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: Partially update a user
 *     description: Customers may update their own account; admins may update any account. Only admins may change a role. Passwords and password hashes are never returned.
 *     tags:
 *       - Users
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: MongoDB ID of the user to update
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *     responses:
 *       200:
 *         description: User updated; response contains only the safe user representation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid user ID or update data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       403:
 *         description: Customer attempted to update another user or change a role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       409:
 *         description: Username or email conflicts with existing data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       500:
 *         description: Unexpected server or database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 */
router.put("/api/users/:userId", requireApiLogin, requireUserOwnerOrAdmin, updateUserHandler);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     description: Customers may delete only their own account; admins may delete any account. The authenticated user's current password must be supplied to confirm deletion. The deleted user's active sessions are invalidated.
 *     tags:
 *       - Users
 *     security:
 *       - sessionCookie: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: MongoDB ID of the user to delete
 *         schema:
 *           type: string
 *           pattern: '^[a-fA-F0-9]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserDeleteRequest'
 *     responses:
 *       204:
 *         description: User deleted; no response body
 *       400:
 *         description: Invalid user ID or missing current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       403:
 *         description: Customer attempted to delete another user or the supplied current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 *       500:
 *         description: Unexpected server, database, or session error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserError'
 */
router.delete("/api/users/:userId", requireApiLogin, requireUserOwnerOrAdmin, deleteUserHandler);

export default router;
