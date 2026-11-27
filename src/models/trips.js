import trip from "./schemas/trips.js";

export async function getTripById(id) {
  return trip.findOne({ id }).lean();
}

export async function getAllTrips({ filter = {}, page = 1, limit = 10, sort = 'name', order = 'asc' }) {
  const skip = (page - 1) * limit;
  
  // Convert 'asc'/'desc' to 1/-1 for Mongoose
  const sortOrder = order === 'desc' ? -1 : 1;
  const sortOptions = { [sort]: sortOrder };

  // Run two queries at the same time: one for the data, one for the total count
  const [trips, totalItems] = await Promise.all([
    trip.find(filter).sort(sortOptions).skip(skip).limit(limit).lean(),
    trip.countDocuments(filter)
  ]);

  return { trips, totalItems };
}

export async function getTripRegions() {
  return await trip.distinct("region");
}

export async function getTripSeasons() {
  return await trip.distinct("bestSeason");
}