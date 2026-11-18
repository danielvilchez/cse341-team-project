import schedule from "./schemas/schedules.js";
import { getTripById } from "./trips.js";

export async function getSchedulesByTripId(tripId, month) {
  const tripDetails = await getTripById(tripId);

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
