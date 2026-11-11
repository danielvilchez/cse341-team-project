import { getAllTrips, getTripById } from "../models/trips.js";

// --- API Controllers ---
export async function getTripsApi(req, res) {
  try {
    const trips = await getAllTrips();
    return res.status(200).json(trips);
  } catch (error) {
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
    return res.status(500).json({ message: "Internal server error" });
  }
}

// --- EJS Page Controllers ---

// The list page no longer fetches trips from the database. 
// It just renders the page, and the browser will fetch the data from /api/trips.
export async function renderTripsPage(req, res) {
  res.render("trips/list", { title: "Scenic Train Trips" });
}

// The details page still needs the server to render the main info.
// We use our new Mongoose model to get the trip.
export async function renderTripDetailsPage(req, res, next) {
  try {
    const trip = await getTripById(req.params.tripId);
    if (!trip) {
      return res.status(404).render("404"); // Or however your app handles 404s
    }
    res.render("trips/details", { 
      title: 'Trip Details', 
      details: trip 
    });
  } catch (error) {
    next(error);
  }
}