import { Router } from "express";
import { homePage, aboutPage, testErrorPage } from "./index.js";
import { trainsPage } from "./trains.js";
import railTripsRouter from "./trips.js";
import { bookingsAdminPage } from '../controllers/bookings.js';
import {
  renderRegisterPage,
  registerUser,
  renderLoginPage,
  loginUser,
  logoutUser
} from "../controllers/auth.js";
import { requirePageLogin, requirePageRole } from "../middleware/auth.js";

const router = Router();

// Home page
router.get("/", homePage);

// About page
router.get("/about", aboutPage);

// Trains page
router.get("/trains", trainsPage);

// Bookings admin page
router.get('/bookings-admin', bookingsAdminPage);

// Rail trips page
router.use("/trips", railTripsRouter);

// Auth routes
router.get("/register", renderRegisterPage);
router.post("/register", registerUser);
router.get("/login", renderLoginPage);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Protected user administration page
router.get("/users-admin", requirePageLogin, (req, res) => {
  res.render("users-admin", {
    title: "User Administration",
    currentUserId: req.user.id,
    isAdmin: req.user.role === "admin"
  });
});

// Admin Dashboard (Protected)
router.get("/admin/dashboard", requirePageRole('admin'), (req, res) => {
  res.render("admin/dashboard", { title: "Admin Dashboard" });
});

// Customer Dashboard (Protected)
router.get("/dashboard", requirePageRole("customer"), (req, res) => {
  res.render("customer/dashboard", { title: "Customer Dashboard" });
});

// Test 500 error page
router.get("/500", testErrorPage);

export default router;