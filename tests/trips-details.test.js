import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';

describe('Trip details page', () => {
  test('renders operating months when they are available', async () => {
    const response = await request(app).get('/trips/alpine-panorama');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<span class="month-badge">4</span>');
    expect(response.text).toContain('href="/trips/booking/1"');
  });

  test('renders the booking page from an available schedule', async () => {
    const detailsResponse = await request(app).get('/trips/alpine-panorama');
    const bookingResponse = await request(app).get('/trips/booking/1');

    expect(detailsResponse.status).toBe(200);
    expect(detailsResponse.text).toContain('Available Schedules');
    expect(bookingResponse.status).toBe(200);
    expect(bookingResponse.text).toContain('Confirm Booking');
  });

  test('renders a fallback when operating months are missing', async () => {
    await getDb().collection('trips').updateOne(
      { id: 'alpine-panorama' },
      { $unset: { operatingMonths: '' } }
    );

    const response = await request(app).get('/trips/alpine-panorama');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Operating months are not available.');
  });
});
