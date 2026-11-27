import trip from "./schemas/trips.js";

export async function getTripById(id) {
  return trip.findOne({ id }).lean();
}

export async function getAllTrips({ page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;
  
  // Run two queries at the same time: one for the data, one for the total count
  const [trips, totalItems] = await Promise.all([
    trip.find({}).skip(skip).limit(limit).lean(),
    trip.countDocuments({})
  ]);

  return { trips, totalItems };
}

export async function getTripRegions() {
  return await trip.distinct("region");
}

export async function getTripSeasons() {
  return await trip.distinct("bestSeason");
}