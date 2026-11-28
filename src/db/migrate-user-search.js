import { closeDb, connectToDb } from './connect.js';
import { migrateUserSearch } from './user-search-migration.js';

try {
    const db = await connectToDb();
    const updated = await migrateUserSearch(db);
    console.log(`User search migration complete. Updated ${updated} users.`);
} finally {
    await closeDb();
}
