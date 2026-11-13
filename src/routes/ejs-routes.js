
import { Router } from "express";
import { homePage, aboutPage, testErrorPage } from "./index.js";
import { trainsPage } from "./trains.js";
import { renderBookingsAdminPage } from "../controllers/bookings.js";
import railTripsRouter from "./trips.js";

const router = Router();

// Home page
router.get("/", homePage);

// About page
router.get("/about", aboutPage);

// Trains page
router.get("/trains", trainsPage);

// Bookings administration page
router.get("/bookings-admin", renderBookingsAdminPage);

// Rail trips page
router.use("/trips", railTripsRouter);

// Test 500 error page
router.get("/500", testErrorPage);

export default router;
