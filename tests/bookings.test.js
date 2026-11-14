import { beforeAll, describe, expect, test } from 'vitest';
import mongoose from 'mongoose';
import Booking from '../src/models/schemas/bookings.js';
import {
  createBooking,
  getAllBookings,
  getBookingById
} from '../src/models/bookings.js';

beforeAll(async () => {
  await Booking.init();
});

const makeBooking = (overrides = {}) => ({
  id: 'JR-TEST-001',
  scheduleId: '1',
  tripId: 'alpine-panorama',
  ticketClass: 'standard',
  selectedDay: 'monday',
  passengers: [{
    firstName: 'Alex',
    lastName: 'Example',
    email: 'alex@example.com',
    phone: '555-0100'
  }],
  ...overrides
});

const makePassengers = (count) => Array.from({ length: count }, (_, index) => ({
  firstName: 'Alex',
  lastName: `Passenger ${index + 1}`,
  email: `passenger${index + 1}@example.com`,
  phone: '555-0100'
}));

describe('Booking Model', () => {
  test('should return an empty array when there are no bookings', async () => {
    const bookings = await getAllBookings();

    expect(bookings).toEqual([]);
  });

  test('should create a booking and set its creation date', async () => {
    const booking = await createBooking(makeBooking());

    expect(booking).toHaveProperty('id', 'JR-TEST-001');
    expect(booking.createdAt).toBeInstanceOf(Date);
  });

  test('should retrieve a booking by its booking code', async () => {
    await createBooking(makeBooking());

    const booking = await getBookingById('JR-TEST-001');

    expect(booking).toHaveProperty('id', 'JR-TEST-001');
  });

  test('should return null when a booking code does not exist', async () => {
    const booking = await getBookingById('JR-NOT-FOUND');

    expect(booking).toBeNull();
  });

  test('should retrieve all bookings', async () => {
    await createBooking(makeBooking({ id: 'JR-TEST-001' }));
    await createBooking(makeBooking({ id: 'JR-TEST-002' }));

    const bookings = await getAllBookings();

    expect(bookings).toHaveLength(2);
    expect(bookings.map(({ id }) => id)).toEqual(
      expect.arrayContaining(['JR-TEST-001', 'JR-TEST-002'])
    );
  });

  test.each(['id', 'scheduleId', 'tripId', 'ticketClass', 'selectedDay', 'passengers'])(
    'should require the booking field %s',
    async (field) => {
      const bookingData = makeBooking();
      delete bookingData[field];

      await expect(createBooking(bookingData)).rejects.toBeInstanceOf(
        mongoose.Error.ValidationError
      );
    }
  );

  test.each(['firstName', 'lastName', 'email', 'phone'])(
    'should require the passenger field %s',
    async (field) => {
      const bookingData = makeBooking();
      delete bookingData.passengers[0][field];

      await expect(createBooking(bookingData)).rejects.toBeInstanceOf(
        mongoose.Error.ValidationError
      );
    }
  );

  test.each(['economy', 'business'])(
    'should reject unsupported ticket class %s',
    async (ticketClass) => {
      await expect(
        createBooking(makeBooking({ ticketClass }))
      ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
    }
  );

  test('should reject a travel day not supported by the schema', async () => {
    await expect(
      createBooking(makeBooking({ selectedDay: 'holiday' }))
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });

  test('should reject an invalid passenger email', async () => {
    const passengers = makePassengers(1);
    passengers[0].email = 'invalid-email';

    await expect(
      createBooking(makeBooking({ passengers }))
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });

  test.each([0, 9])(
    'should reject a booking with %i passengers',
    async (passengerCount) => {
      await expect(
        createBooking(makeBooking({ passengers: makePassengers(passengerCount) }))
      ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
    }
  );

  test('should accept a booking with the maximum of eight passengers', async () => {
    const booking = await createBooking(
      makeBooking({ passengers: makePassengers(8) })
    );

    expect(booking.passengers).toHaveLength(8);
  });

  test('should reject duplicate booking codes', async () => {
    await createBooking(makeBooking({ id: 'JR-DUPLICATE' }));

    await expect(
      createBooking(makeBooking({ id: 'JR-DUPLICATE' }))
    ).rejects.toMatchObject({ code: 11000 });
  });
});