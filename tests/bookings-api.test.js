import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';

const bookingRequest = {
  scheduleId: '1',
  tripId: 'alpine-panorama',
  ticketClass: 'standard',
  selectedDay: 'monday',
  passengers: [{
    firstName: 'Alex',
    lastName: 'Example',
    email: 'alex@example.com',
    phone: '555-0100'
  }]
};

describe('Bookings API', () => {
  test('POST /api/bookings creates a booking and returns 201', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({ ...bookingRequest, id: 'CLIENT-PROVIDED-ID' });

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.booking.id).not.toBe('CLIENT-PROVIDED-ID');
    expect(response.body.booking).toHaveProperty('createdAt');

    const savedBooking = await getDb()
      .collection('bookings')
      .findOne({ id: response.body.booking.id });
    expect(savedBooking).not.toBeNull();
  });

  test('POST /api/bookings rejects invalid booking data', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .send({ ...bookingRequest, ticketClass: 'economy' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid booking data' });
    expect(await getDb().collection('bookings').countDocuments()).toBe(0);
  });

  test('GET /api/bookings returns an empty bookings array', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ bookings: [] });
  });

  test('GET /api/bookings returns created bookings', async () => {
    await request(app).post('/api/bookings').send(bookingRequest);

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.bookings[0]).toHaveProperty('ticketClass', 'standard');
  });

  test('GET /api/bookings/:bookingId returns the matching booking', async () => {
    const createdResponse = await request(app)
      .post('/api/bookings')
      .send(bookingRequest);

    const response = await request(app)
      .get(`/api/bookings/${createdResponse.body.booking.id}`);

    expect(response.status).toBe(200);
    expect(response.body.booking).toHaveProperty('id', createdResponse.body.booking.id);
  });

  test('GET /api/bookings/:bookingId returns 404 for an unknown booking code', async () => {
    const response = await request(app).get('/api/bookings/JR-NOT-FOUND');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Booking not found' });
  });
});
