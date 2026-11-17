import { expect, test } from 'vitest';
import mongoose from 'mongoose';
import { getDb } from '../src/db/connect.js';

test('connects the native driver and Mongoose to the test database', () => {
  expect(mongoose.connection.readyState).toBe(1);
  expect(mongoose.connection.name).toBe('kizuna-rail-test');
  expect(getDb().databaseName).toBe('kizuna-rail-test');
});
