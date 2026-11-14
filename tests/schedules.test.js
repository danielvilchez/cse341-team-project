
import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/trips/:id/schedules', () => {
  test('returns schedules for an existing trip', async () => {
    const response = await request(app)
      .get('/api/trips/alpine-panorama/schedules');

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toHaveLength(2);
  });

  test('filters schedules by an operating month', async () => {
    const response = await request(app)
      .get('/api/trips/alpine-panorama/schedules?month=7');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('returns an empty array when the trip does not operate in the selected month', async () => {
    const response = await request(app)
      .get('/api/trips/alpine-panorama/schedules?month=1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('returns 400 when the month is invalid', async () => {
    const response = await request(app)
      .get('/api/trips/alpine-panorama/schedules?month=13');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('returns 404 when the trip does not exist', async () => {
    const response = await request(app)
      .get('/api/trips/nonexistent-trip/schedules');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});
