
import { getDb } from "../db/connect.js";
import { generateConfirmationCode } from "../includes/helpers.js";
import {
  createBooking,
  getAllBookings,
  getBookingById
} from "../models/bookings.js";

// --- API Controllers ---

export async function getBookingsApi(req, res) {
  try {
    const bookings = await getAllBookings();
    return res.status(200).json(bookings);
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// --- EJS Controllers ---

export async function bookingPage(req, res, next) {
  try {
    const scheduleId = Number(req.params.scheduleId);
    const db = getDb();

    const schedule = await db.collection("schedules").findOne({
      id: scheduleId
    });

    if (!schedule || !schedule.status) {
      return res.status(404).render("errors/404", {
        title: "Page Not Found"
      });
    }

    const trip = await db.collection("trips").findOne({
      id: schedule.tripId
    });

    if (!trip) {
      return res.status(404).render("errors/404", {
        title: "Page Not Found"
      });
    }

    const ticketClasses = await db.collection("ticketClasses").find({}).toArray();

    const ticketOptions = ticketClasses.map((ticketClass) => ({
      class: ticketClass.class,
      name: ticketClass.name,
      price: trip.distance * ticketClass.pricePerKm,
      amenities: ticketClass.amenities,
      description: ticketClass.description
    }));

    return res.render("trips/book", {
      title: "Book Trip",
      schedule,
      ticketOptions
    });
  } catch (error) {
    return next(error);
  }
}

export async function processBookingRequest(req, res, next) {
  try {
    const db = getDb();
    const scheduleId = Number(req.body.scheduleId);
    const { ticketClass, selectedDay } = req.body;

    const schedule = await db.collection("schedules").findOne({
      id: scheduleId
    });

    if (!schedule || !schedule.status) {
      return res.status(400).send("The selected schedule is unavailable.");
    }

    if (!schedule.daysOfWeek.includes(selectedDay)) {
      return res.status(400).send("The selected day is unavailable.");
    }

    const trip = await db.collection("trips").findOne({
      id: schedule.tripId
    });

    if (!trip) {
      return res.status(404).render("errors/404", {
        title: "Page Not Found"
      });
    }

    const selectedTicketClass = await db.collection("ticketClasses").findOne({
      class: ticketClass
    });

    if (!selectedTicketClass) {
      return res.status(400).send("Invalid ticket class.");
    }

    const passengers = req.body.passengers;

    if (!Array.isArray(passengers) || passengers.length < 1 || passengers.length > 8) {
      return res.status(400).send("A booking must have between 1 and 8 passengers.");
    }

    const validPassengers = passengers.map((passenger) => ({
      firstName: passenger?.firstName?.trim(),
      lastName: passenger?.lastName?.trim(),
      email: passenger?.email?.trim(),
      phone: passenger?.phone?.trim()
    }));

    const hasInvalidPassenger = validPassengers.some((passenger) =>
      !passenger.firstName ||
      !passenger.lastName ||
      !passenger.email ||
      !passenger.phone
    );

    if (hasInvalidPassenger) {
      return res.status(400).send("All passenger fields are required.");
    }

    const pricePerPassenger =
      trip.distance * selectedTicketClass.pricePerKm;

    const totalPrice = pricePerPassenger * validPassengers.length;

    const newBooking = await createBooking({
      id: generateConfirmationCode(),
      scheduleId,
      tripId: schedule.tripId,
      ticketClass,
      selectedDay,
      passengers: validPassengers,
      pricePerPassenger,
      totalPrice
    });

    return res.redirect(`/trips/confirmation/${newBooking.id}`);
  } catch (error) {
    return next(error);
  }
}

export async function renderBookingConfirmationPage(req, res, next) {
  try {
    const confirmation = await getBookingById(req.params.confirmationId);

    if (!confirmation) {
      return res.status(404).render("errors/404", {
        title: "Page Not Found"
      });
    }

    return res.render("trips/confirm", {
      title: "Trip Confirmation",
      confirmation
    });
  } catch (error) {
    return next(error);
  }
}

export function renderBookingsAdminPage(req, res) {
  return res.render("bookings", {
    title: "Bookings Administration"
  });
}
