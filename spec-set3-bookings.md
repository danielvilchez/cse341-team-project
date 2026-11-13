# Feature Set 3: Bookings - Specification

## Goal
Refactor the existing booking functionality to use Mongoose, rename the MongoDB collection from `confirmations` to `bookings`, create a JSON API endpoint, and add an admin page that dynamically displays all bookings.

## Data Model (Mongoose)
File: `src/models/schemas/bookings.js`

- `id`: String, required, unique
- `scheduleId`: Number, required
- `tripId`: String, required
- `ticketClass`: String, required
- `selectedDay`: String, required
- `passengers`: Array of passenger objects, required
  - `firstName`: String, required
  - `lastName`: String, required
  - `email`: String, required
  - `phone`: String, required
- `pricePerPassenger`: Number, required
- `totalPrice`: Number, required
- `createdAt`: Date

## Model Functions
File: `src/models/bookings.js`

- `createBooking`: Creates a booking with its passenger information and calculated prices.
- `getAllBookings`: Returns all bookings.
- `getBookingById`: Returns one booking by its ID.

## API Endpoints
File: `src/routes/api-routes.js`

- **GET /api/bookings**: Returns all bookings. Status 200. (500 on error)

## Controller
File: `src/controllers/bookings.js`

- `getAllBookings`: API controller that returns bookings as JSON.
- `processBookingRequest`: Creates a booking using the model and redirects to its confirmation page.
- `bookingPage`: Loads the schedule, trip, and ticket options.
- `renderBookingConfirmationPage`: Retrieves a booking by ID and renders the confirmation page.
- `renderBookingsAdminPage`: Renders the admin page.

## EJS Page Updates

- Update the existing booking and confirmation controllers to use the new Mongoose model.
- Update `src/db/initialize.js` to initialize the `bookings` collection and its unique ID index.
- Create `src/views/bookings.ejs`. Use JavaScript `fetch('/api/bookings')` to dynamically display bookings. Do not use EJS loops to render bookings.
- Add the `/bookings-admin` route in `src/routes/ejs-routes.js`.
- Update the existing booking routes to use the new controllers.

## Test Plan

- [ ] A new booking is saved in the `bookings` collection.
- [ ] The booking ID is unique.
- [ ] Passenger information is saved correctly.
- [ ] Price per passenger is calculated using trip distance and ticket class.
- [ ] Total price matches the number of passengers.
- [ ] GET /api/bookings returns status 200 and an array of bookings.
- [ ] The booking confirmation page displays the correct booking.
- [ ] An invalid booking ID returns a 404 response.
- [ ] The `/bookings-admin` page successfully fetches and displays bookings.
- [ ] The old `confirmations` collection is no longer used.
