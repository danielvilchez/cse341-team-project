import { Router } from "express";
import { trainsApi } from "./trains.js";
import { getTripsApi, getTripByIdApi } from "../controllers/trips.js";

const router = Router();

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