import { getDb } from '../db/connect.js';

const SESSION_COLLECTION_NAME = 'sessions';

const invalidateUserSessions = async (userId, exceptSessionId) => {
    const sessionsCollection = getDb().collection(SESSION_COLLECTION_NAME);
    const storedSessions = await sessionsCollection
        .find({}, { projection: { _id: 1, session: 1 } })
        .toArray();
    const sessionIds = [];

    for (const storedSession of storedSessions) {
        let sessionData = storedSession.session;
        if (typeof sessionData === 'string') {
            try {
                sessionData = JSON.parse(sessionData);
            } catch (error) {
                throw new Error('Unable to read a stored session while invalidating user sessions.', {
                    cause: error
                });
            }
        }

        if (
            storedSession._id !== exceptSessionId &&
            sessionData?.user?.id === userId
        ) {
            sessionIds.push(storedSession._id);
        }
    }

    if (sessionIds.length === 0) {
        return 0;
    }

    const result = await sessionsCollection.deleteMany({
        _id: { $in: sessionIds }
    });
    return result.deletedCount;
};

export { SESSION_COLLECTION_NAME, invalidateUserSessions };
