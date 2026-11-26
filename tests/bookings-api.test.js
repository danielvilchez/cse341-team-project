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

const emptyFilters = {
  ticketClass: null,
  startDate: null,
  endDate: null
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
        order: 'desc',
        filters: emptyFilters
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
      order: 'desc',
      filters: emptyFilters
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
      order: 'desc',
      filters: emptyFilters
    });
  });

  test('GET /api/bookings filters bookings by ticket class', async () => {
    await request(app).post('/api/bookings').send(bookingRequest);
    await request(app).post('/api/bookings').send({
      ...bookingRequest,
      ticketClass: 'premium'
    });

    const response = await request(app)
      .get('/api/bookings?ticketClass=premium');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].ticketClass).toBe('premium');
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.filters).toEqual({
      ticketClass: 'premium',
      startDate: null,
      endDate: null
    });
  });

  test('GET /api/bookings filters bookings by creation date range', async () => {
    const oldBooking = {
      ...bookingRequest,
      id: 'JR-OLD-BOOKING',
      createdAt: new Date('2026-01-10T12:00:00.000Z')
    };

    const newBooking = {
      ...bookingRequest,
      id: 'JR-NEW-BOOKING',
      createdAt: new Date('2026-01-20T12:00:00.000Z')
    };

    await getDb().collection('bookings').insertMany([
      oldBooking,
      newBooking
    ]);

    const response = await request(app)
      .get('/api/bookings?startDate=2026-01-15&endDate=2026-01-25');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('JR-NEW-BOOKING');
    expect(response.body.meta.filters).toEqual({
      ticketClass: null,
      startDate: '2026-01-15',
      endDate: '2026-01-25'
    });
  });

  test('GET /api/bookings combines ticket class and date filters', async () => {
    await getDb().collection('bookings').insertMany([
      {
        ...bookingRequest,
        id: 'JR-STANDARD',
        ticketClass: 'standard',
        createdAt: new Date('2026-01-20T12:00:00.000Z')
      },
      {
        ...bookingRequest,
        id: 'JR-PREMIUM-IN-RANGE',
        ticketClass: 'premium',
        createdAt: new Date('2026-01-20T12:00:00.000Z')
      },
      {
        ...bookingRequest,
        id: 'JR-PREMIUM-OUT-OF-RANGE',
        ticketClass: 'premium',
        createdAt: new Date('2026-02-20T12:00:00.000Z')
      }
    ]);

    const response = await request(app)
      .get('/api/bookings?ticketClass=premium&startDate=2026-01-15&endDate=2026-01-25');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('JR-PREMIUM-IN-RANGE');
    expect(response.body.meta.total).toBe(1);
  });

  test.each([
    ['invalid ticket class', '/api/bookings?ticketClass=economy'],
    ['invalid start date format', '/api/bookings?startDate=15-01-2026'],
    ['invalid end date format', '/api/bookings?endDate=2026/01/25'],
    ['invalid calendar date', '/api/bookings?startDate=2026-02-30'],
    ['start date after end date', '/api/bookings?startDate=2026-02-01&endDate=2026-01-01']
  ])('GET /api/bookings rejects invalid filters: %s', async (_description, url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
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
