import trip from "./schemas/trips.js";

export async function getTripById(id) {
  return trip.findOne({ id }).lean();
}

export async function getAllTrips() {
  return trip.find({}).lean();
}

export async function getTripRegions() {
  return await trip.distinct("region");
}

export async function getTripSeasons() {
  return await trip.distinct("bestSeason");
}