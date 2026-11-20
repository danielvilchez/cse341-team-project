import { describe, expect, test, vi } from 'vitest';
import {
    createUser,
    findUserById
} from '../src/models/users.js';
import {
    deleteUserHandler,
    getUsersHandler,
    updateUserHandler
} from '../src/controllers/users.js';

const createResponse = () => {
    const res = {
        status: vi.fn(),
        json: vi.fn(),
        end: vi.fn()
    };
    res.status.mockReturnValue(res);
    return res;
};

const createTestUser = (username, email) => createUser(
    `${username} User`,
    username,
    email,
    'InitialPassword123'
);

describe('User API controllers', () => {
    test('returns only the authenticated customer from the user list', async () => {
        const user = await createTestUser('customer', 'customer@example.com');
        await createTestUser('another', 'another@example.com');
        const req = {
            user: { id: user._id.toString(), role: 'customer' }
        };
        const res = createResponse();

        await getUsersHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            users: [{
                id: user._id.toString(),
                name: 'customer User',
                username: 'customer',
                email: 'customer@example.com',
                role: 'customer'
            }]
        });
    });

    test('returns all users to an admin', async () => {
        await createTestUser('customer', 'customer@example.com');
        await createTestUser('another', 'another@example.com');
        const req = { user: { id: 'admin-id', role: 'admin' } };
        const res = createResponse();

        await getUsersHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].users).toHaveLength(2);
        expect(res.json.mock.calls[0][0].users[0]).not.toHaveProperty('passwordHash');
    });

    test('updates a user and refreshes the current session display name', async () => {
        const user = await createTestUser('customer', 'customer@example.com');
        const req = {
            user: { id: user._id.toString(), role: 'customer' },
            params: { userId: user._id.toString() },
            body: { name: 'Updated Customer' },
            session: { user: { id: user._id.toString(), name: 'customer User', role: 'customer' } }
        };
        const res = createResponse();

        await updateUserHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].user.name).toBe('Updated Customer');
        expect(res.json.mock.calls[0][0].user).not.toHaveProperty('passwordHash');
        expect(req.session.user.name).toBe('Updated Customer');
    });

    test('rejects a customer role change', async () => {
        const user = await createTestUser('customer', 'customer@example.com');
        const req = {
            user: { id: user._id.toString(), role: 'customer' },
            params: { userId: user._id.toString() },
            body: { role: 'admin' }
        };
        const res = createResponse();

        await updateUserHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    test('returns 400 for an empty name update', async () => {
        const user = await createTestUser('customer', 'customer@example.com');
        const req = {
            user: { id: user._id.toString(), role: 'customer' },
            params: { userId: user._id.toString() },
            body: { name: '  ' }
        };
        const res = createResponse();

        await updateUserHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user data.' });
    });

    test("deletes the authenticated user's account and destroys the session", async () => {
        const user = await createTestUser('customer', 'customer@example.com');
        const req = {
            user: { id: user._id.toString(), role: 'customer' },
            params: { userId: user._id.toString() },
            session: {
                destroy(callback) {
                    callback(null);
                }
            }
        };
        const res = createResponse();

        await deleteUserHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
        await expect(findUserById(user._id.toString())).resolves.toBeNull();
    });
});
