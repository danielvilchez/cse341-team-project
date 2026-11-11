# Feature Set 1: Trips - Specification

## Goal
Refactor the existing Trips functionality to use Mongoose, create JSON API endpoints, and update the trips list page to dynamically hydrate the HTML using client-side JavaScript.

## Data Model (Mongoose)
File: `src/models/schemas/trips.js`
- `id`: String, required, unique
- `name`: String, required
- `description`: String
- `startStation`: String, required
- `endStation`: String, required
- `duration`: Number, required
- `price`: Number
- `region`: String
- `distance`: Number
- `bestSeason`: String
- `highlights`: Array of Strings

## API Endpoints
File: `src/routes/api-routes.js`
- **GET /api/trips**: Returns all trips. Status 200. (500 on error)
- **GET /api/trips/:id**: Returns one trip by ID. Status 200. (404 if not found, 500 on error)

## EJS Page Updates
- `src/views/trips/list.ejs`: Remove the EJS `forEach` loop. Replace with an HTML `<template>` and a `<script>` block that fetches data from `/api/trips` and dynamically populates the grid.
- `src/controllers/trips.js`: 
  - Move `details.js` logic here and use `getTripById` from the new model. Name it `renderTripDetailsPage`.
  - Move `list.js` logic here. Name it `renderTripsPage`. It should no longer fetch trips from the DB, just render the page and pass the filters (regions, seasons).

## Test Plan
- [ ] GET /api/trips returns status 200 and an array of trips.
- [ ] GET /api/trips/:id returns status 200 for an existing trip.
- [ ] GET /api/trips/:id returns status 404 for a missing trip.
- [ ] The `/trips` page successfully fetches data from the API and renders the trip cards without a full page reload.
- [ ] The filters (Region, Season) still populate correctly.
- [ ] Clicking "View Details" goes to the correct trip details page.