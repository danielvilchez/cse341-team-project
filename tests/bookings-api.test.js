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

  test('GET /api/bookings returns an empty paginated response', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        sort: 'createdAt',
        order: 'desc'
      }
    });
  });

  test('GET /api/bookings returns created bookings with pagination metadata', async () => {
    await request(app).post('/api/bookings').send(bookingRequest);

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toHaveProperty('ticketClass', 'standard');
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      sort: 'createdAt',
      order: 'desc'
    });
  });

  test('GET /api/bookings supports pagination parameters', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/bookings').send(bookingRequest);
    }

    const response = await request(app)
      .get('/api/bookings?page=2&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
      sort: 'createdAt',
      order: 'desc'
    });
  });

  test.each([
    ['page=0', '/api/bookings?page=0'],
    ['negative page', '/api/bookings?page=-1'],
    ['non-numeric page', '/api/bookings?page=abc'],
    ['limit=0', '/api/bookings?limit=0'],
    ['non-numeric limit', '/api/bookings?limit=abc'],
    ['limit greater than 100', '/api/bookings?limit=101']
  ])('GET /api/bookings rejects invalid pagination: %s', async (_description, url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
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
