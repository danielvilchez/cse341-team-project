import { getAllTrips, getTripById, getTripRegions, getTripSeasons } from "../models/trips.js";
import { getDb } from "../db/connect.js";

// --- API Controllers ---
export async function getTripsApi(req, res) {
  try {
    const trips = await getAllTrips();
    return res.status(200).json(trips);
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getTripByIdApi(req, res) {
  try {
    const trip = await getTripById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    return res.status(200).json(trip);
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function renderTripsPage(req, res, next) {
  try {
    const regions = await getTripRegions();
    const seasons = await getTripSeasons();

    res.render("trips/list", { 
      title: "Scenic Train Trips",
      regions: regions,
      seasons: seasons,
      query: req.query || {}
    });
  } catch (error) {
    next(error);
  }
}

export async function renderTripDetailsPage(req, res, next) {
  try {
    const trip = await getTripById(req.params.tripId);
    if (!trip) {
      return res.status(404).render("404");
    }
    const schedules = await getDb()
      .collection("schedules")
      .find({ tripId: req.params.tripId })
      .toArray();
    return res.render("trips/details", { 
      title: 'Trip Details', 
      details: { ...trip, schedules }
    });
  } catch (error) {
    return next(error);
  }
}