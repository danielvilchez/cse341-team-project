import { Router } from "express";
import ejsRoutes from "./ejs-routes.js";
import apiRoutes from "./api-routes.js";

const router = Router();

// Use API routes (e.g., /api/trains, /api/trips)
router.use(apiRoutes);

// Use EJS routes (e.g., /, /about, /trains, /trips)
router.use(ejsRoutes);

export default router;