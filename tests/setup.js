import { afterAll, beforeAll, beforeEach, inject } from 'vitest';
import { closeDb, connectToDb, connectToMongoose, getDb } from '../src/db/connect.js';
import { initializeDatabase } from '../src/db/initialize.js';

const connectionString = inject('MONGODB_TEST_URI');
const databaseName = 'kizuna-rail-test';

beforeAll(async () => {
  await connectToDb({
    connectionString,
    databaseName
  });
  await connectToMongoose({ connectionString, databaseName });
});

beforeEach(async () => {
  const db = getDb();
  await db.dropDatabase();
  await initializeDatabase(db);
});

afterAll(async () => {
  await closeDb();
});
