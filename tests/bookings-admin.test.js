import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getDb } from '../src/db/connect.js';

const clientScript = readFileSync(
  new URL('../public/js/bookings-admin.js', import.meta.url),
  'utf8'
);

class MockElement {
  constructor() {
    this.hidden = false;
    this.disabled = false;
    this.textContent = '';
    this.children = [];
    this.listeners = {};
  }

  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }

  appendChild(child) {
    this.children.push(...(child.isFragment ? child.children : [child]));
  }

  replaceChildren(...children) {
    this.children = children.flatMap((child) =>
      child.isFragment ? child.children : [child]
    );
  }

  setAttribute(name, value) {
    this.attributes = this.attributes || {};
    this.attributes[name] = value;
  }
}

const runBookingsScript = async (fetch) => {
  const ids = [
    'bookings-list',
    'bookings-cards-view',
    'bookings-table-list',
    'bookings-table-wrap',
    'bookings-view-controls',
    'bookings-cards-button',
    'bookings-table-button',
    'bookings-loading',
    'bookings-empty',
    'bookings-error',
    'bookings-retry',
    'bookings-pagination',
    'bookings-previous',
    'bookings-next',
    'bookings-page-info'
  ];

  const elements = Object.fromEntries(
    ids.map((id) => [id, new MockElement()])
  );

  elements['booking-card-template'] = {
    content: {
      cloneNode: () => {
        const fields = [
          'booking-id',
          'ticket-class',
          'trip',
          'schedule',
          'travel-day',
          'passengers',
          'created'
        ];

        const card = new MockElement();

        card.fields = Object.fromEntries(
          fields.map((field) => [
            `[data-field="${field}"]`,
            new MockElement()
          ])
        );

        card.querySelector = (selector) => card.fields[selector];

        return {
          isFragment: true,
          children: [card],
          querySelector: card.querySelector
        };
      }
    }
  };

  const documentEvents = {};

  const document = {
    getElementById: (id) => elements[id],
    createElement: () => new MockElement(),
    createDocumentFragment: () =>
      Object.assign(new MockElement(), { isFragment: true }),
    addEventListener: (event, callback) => {
      documentEvents[event] = callback;
    }
  };

  runInNewContext(clientScript, {
    document,
    fetch,
    console,
    Date,
    Number
  });

  await documentEvents.DOMContentLoaded();

  return elements;
};

const createBooking = (id = 'JR-EXAMPLE') => ({
  id,
  scheduleId: '1',
  tripId: 'alpine-panorama',
  ticketClass: 'standard',
  selectedDay: 'monday',
  passengers: [{ firstName: 'Alex', lastName: 'Example' }],
  createdAt: '2026-01-15T12:00:00.000Z'
});

const createPayload = (data, page = 1, totalPages = 1, total = data.length) => ({
  data,
  meta: {
    page,
    limit: 10,
    total,
    totalPages,
    sort: 'createdAt',
    order: 'desc'
  }
});

describe('Bookings admin page', () => {
  test('renders its shell and client script without server-rendered bookings', async () => {
    await getDb().collection('bookings').insertOne({
      id: 'JR-ADMIN-TEST',
      scheduleId: '1',
      tripId: 'alpine-panorama'
    });

    const response = await request(app).get('/bookings-admin');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<h1>Bookings Admin</h1>');
    expect(response.text).toContain('href="/bookings-admin">Bookings Admin</a>');
    expect(response.text).toContain('src="/js/bookings-admin.js"');
    expect(response.text).toContain('id="bookings-loading"');
    expect(response.text).toContain('id="bookings-pagination"');
    expect(response.text).not.toContain('JR-ADMIN-TEST');
  });

  test('renders booking rows from a populated API response', async () => {
    const elements = await runBookingsScript(async () => ({
      ok: true,
      json: async () => createPayload([createBooking()])
    }));

    expect(elements['bookings-cards-view'].hidden).toBe(false);
    expect(elements['bookings-table-wrap'].hidden).toBe(true);
    expect(elements['bookings-list'].children).toHaveLength(1);

    const card = elements['bookings-list'].children[0];

    expect(card.fields['[data-field="booking-id"]'].textContent).toBe('JR-EXAMPLE');
    expect(card.fields['[data-field="trip"]'].textContent).toBe('alpine-panorama');
    expect(card.fields['[data-field="passengers"]'].textContent).toBe('Alex Example');

    expect(elements['bookings-table-list'].children).toHaveLength(1);
    expect(elements['bookings-loading'].hidden).toBe(true);
    expect(elements['bookings-pagination'].hidden).toBe(false);
    expect(elements['bookings-page-info'].textContent).toBe('Page 1 of 1');

    await elements['bookings-table-button'].listeners.click();

    expect(elements['bookings-cards-view'].hidden).toBe(true);
    expect(elements['bookings-table-wrap'].hidden).toBe(false);
    expect(elements['bookings-table-button'].attributes['aria-pressed']).toBe('true');

    await elements['bookings-cards-button'].listeners.click();

    expect(elements['bookings-cards-view'].hidden).toBe(false);
    expect(elements['bookings-table-wrap'].hidden).toBe(true);
    expect(elements['bookings-cards-button'].attributes['aria-pressed']).toBe('true');
  });

  test('shows the empty state when the API returns no bookings', async () => {
    const elements = await runBookingsScript(async () => ({
      ok: true,
      json: async () => createPayload([], 1, 0, 0)
    }));

    expect(elements['bookings-empty'].hidden).toBe(false);
    expect(elements['bookings-cards-view'].hidden).toBe(true);
    expect(elements['bookings-table-wrap'].hidden).toBe(true);
    expect(elements['bookings-pagination'].hidden).toBe(true);
  });

  test('shows the error state when the API request fails', async () => {
    const elements = await runBookingsScript(async () => ({
      ok: false,
      status: 500
    }));

    expect(elements['bookings-error'].hidden).toBe(false);
    expect(elements['bookings-loading'].hidden).toBe(true);
  });

  test('navigates between pages using Previous and Next', async () => {
    const requestedUrls = [];

    const elements = await runBookingsScript(async (url) => {
      requestedUrls.push(url);

      if (url.includes('page=2')) {
        return {
          ok: true,
          json: async () => createPayload(
            [createBooking('JR-PAGE-2')],
            2,
            2,
            11
          )
        };
      }

      return {
        ok: true,
        json: async () => createPayload(
          [createBooking('JR-PAGE-1')],
          1,
          2,
          11
        )
      };
    });

    expect(requestedUrls[0]).toBe('/api/bookings?page=1&limit=10');
    expect(elements['bookings-page-info'].textContent).toBe('Page 1 of 2');
    expect(elements['bookings-previous'].disabled).toBe(true);
    expect(elements['bookings-next'].disabled).toBe(false);

    await elements['bookings-next'].listeners.click();

    expect(requestedUrls[1]).toBe('/api/bookings?page=2&limit=10');
    expect(elements['bookings-page-info'].textContent).toBe('Page 2 of 2');
    expect(elements['bookings-list'].children[0]
      .fields['[data-field="booking-id"]'].textContent).toBe('JR-PAGE-2');
    expect(elements['bookings-previous'].disabled).toBe(false);
    expect(elements['bookings-next'].disabled).toBe(true);

    await elements['bookings-previous'].listeners.click();

    expect(requestedUrls[2]).toBe('/api/bookings?page=1&limit=10');
    expect(elements['bookings-page-info'].textContent).toBe('Page 1 of 2');
  });
});
