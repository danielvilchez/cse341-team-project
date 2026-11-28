import { userSearchValues } from '../models/user-search.js';

const sameValues = (actual, expected) => Array.isArray(actual)
    && actual.length === expected.length
    && expected.every((value, index) => actual[index] === value);

const migrateUserSearch = async (db) => {
    const users = db.collection('users');
    let updated = 0;
    for await (const user of users.find({}, { projection: { name: 1, username: 1, email: 1, search: 1 } })) {
        if ([user.name, user.username, user.email].some((value) => typeof value !== 'string')) {
            throw new Error(`User ${user._id} has invalid searchable fields.`);
        }
        const search = userSearchValues(user);
        if (sameValues(user.search, search)) continue;
        const result = await users.updateOne(
            { _id: user._id, name: user.name, username: user.username, email: user.email },
            { $set: { search } }
        );
        if (result.matchedCount !== 1) {
            throw new Error(`User ${user._id} changed during migration. Run it again.`);
        }
        updated++;
    }

    for await (const user of users.find({}, { projection: { name: 1, username: 1, email: 1, search: 1 } })) {
        if ([user.name, user.username, user.email].some((value) => typeof value !== 'string')
            || !sameValues(user.search, userSearchValues(user))) {
            throw new Error(`User ${user._id} has incomplete search data. Run the migration again.`);
        }
    }
    return updated;
};

export { migrateUserSearch };
