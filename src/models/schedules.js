
import schedule from "./schemas/schedules.js";
import trip from "./schemas/trips.js";

export async function getSchedulesByTripId(tripId, month) {
  const tripDetails = await trip.findOne({ id: tripId }).lean();

  if (!tripDetails) {
    return null;
  }

  if (
    month !== undefined &&
    !tripDetails.operatingMonths?.includes(Number(month))
  ) {
    return [];
  }

  return schedule.find({
    tripId,
    status: true,
  }).lean();
}
