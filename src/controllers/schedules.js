
import { getSchedulesByTripId } from "../models/schedules.js";

export async function getSchedulesByTrip(req, res) {
  try {
    const { id } = req.params;
    const { month } = req.query;

    if (
      month !== undefined &&
      (!/^\d+$/.test(month) || Number(month) < 1 || Number(month) > 12)
    ) {
      return res.status(400).json({
        error: "Month must be a number between 1 and 12",
      });
    }

    const schedules = await getSchedulesByTripId(
      id,
      month === undefined ? undefined : Number(month)
    );

    if (schedules === null) {
      return res.status(404).json({
        error: "Trip not found",
      });
    }

    return res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return res.status(500).json({
      error: "Failed to fetch schedules",
    });
  }
}
