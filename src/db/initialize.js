import trips from './seeds/trips.json' with { type: 'json' };
import schedules from './seeds/schedules.json' with { type: 'json' };
import stations from './seeds/stations.json' with { type: 'json' };
import ticketClasses from './seeds/ticket-classes.json' with { type: 'json' };
import trains from './seeds/trains.json' with { type: 'json' };

// Define the initial roles we need for authentication
const roles = [
  { name: 'customer' },
  { name: 'admin' }
];

const starterCollections = [
  ['trips', trips],
  ['schedules', schedules],
  ['stations', stations],
  ['ticketClasses', ticketClasses],
  ['trains', trains],
  ['roles', roles] 
];

const initializeDatabase = async (db) => {
  if (!db) {
    throw new Error('A database connection is required to initialize data.');
  }

  for (const [collectionName, documents] of starterCollections) {
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    await collection.insertMany(documents);
  }

  const confirmations = db.collection('confirmations');
  await confirmations.deleteMany({});
  await confirmations.createIndex({ id: 1 }, { unique: true });
  
  // We also need a unique index on role names
  const rolesCollection = db.collection('roles');
  await rolesCollection.createIndex({ name: 1 }, { unique: true });
};

export { initializeDatabase, starterCollections };