import { describe, expect, test } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import {
    createUser,
    findUserById,
    updateUserById
} from '../src/models/users.js';
import User from '../src/models/schemas/users.js';

const password = 'TestPassword123';

const createAccount = async (username, role = 'customer') => {
    const user = await createUser(
        `${username} User`,
        username,
        `${username}@example.com`,
        password
    );
    if (role === 'admin') {
        return updateUserById(user._id.toString(), { role });
    }
    return user;
};

const login = async (user) => {
    const agent = request.agent(app);
    const response = await agent
        .post('/login')
        .send({ identifier: user.email, password });

    expect(response.status).toBe(302);
    return agent;
};

describe('User API routes', () => {
    test('returns 401 for unauthenticated list, update, and delete requests', async () => {
        const user = await createAccount('customer');
        const userId = user._id.toString();

        await request(app).get('/api/users').expect(401);
        await request(app)
            .put(`/api/users/${userId}`)
            .send({ name: 'Updated Name' })
            .expect(401);
        await request(app).delete(`/api/users/${userId}`).expect(401);
    });

    test.each(['put', 'delete'])(
        'returns a JSON 400 response for malformed JSON on user %s requests',
        async (method) => {
            const user = await createAccount('malformed-json');
            const agent = await login(user);

            const response = await agent[method](`/api/users/${user._id}`)
                .set('Content-Type', 'application/json')
                .send('{"name":');

            expect(response.status).toBe(400);
            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(response.body).toEqual({ message: 'Invalid user data.' });
        }
    );

    test('returns only the current user to a customer and all users to an admin', async () => {
        const customer = await createAccount('customer');
        await createAccount('another');
        const admin = await createAccount('admin', 'admin');

        const customerResponse = await (await login(customer))
            .get('/api/users')
            .expect(200);
        expect(customerResponse.body.users).toHaveLength(1);
        expect(customerResponse.body.users[0].id).toBe(customer._id.toString());
        expect(customerResponse.body.pagination).toEqual({
            page: 1,
            limit: 25,
            total: 1,
            totalPages: 1
        });

        const adminResponse = await (await login(admin))
            .get('/api/users')
            .expect(200);
        expect(adminResponse.body.users).toHaveLength(3);
        expect(adminResponse.body.pagination.total).toBe(3);
        expect(adminResponse.body.users.every((user) => !('passwordHash' in user))).toBe(true);
    });

    test('searches and paginates admin results on the server', async () => {
        await User.collection.createIndex({
            name: 'text',
            username: 'text',
            email: 'text'
        });
        const firstMatch = await createAccount('match-first');
        const secondMatch = await createAccount('match-second');
        await createAccount('unrelated-person');
        const admin = await createAccount('search-admin', 'admin');
        const agent = await login(admin);

        const firstPage = await agent
            .get('/api/users?q=match&page=1&limit=1')
            .expect(200);
        expect(firstPage.body.users).toHaveLength(1);
        expect(firstPage.body.pagination).toEqual({
            page: 1,
            limit: 1,
            total: 2,
            totalPages: 2
        });

        const secondPage = await agent
            .get('/api/users?q=match&page=2&limit=1')
            .expect(200);
        expect(secondPage.body.users).toHaveLength(1);
        const pageIds = [firstPage.body.users[0].id, secondPage.body.users[0].id];
        expect(new Set(pageIds).size).toBe(2);
        expect(pageIds).toContain(firstMatch._id.toString());
        expect(pageIds).toContain(secondMatch._id.toString());
    });

    test('rejects invalid user search and pagination parameters', async () => {
        const admin = await createAccount('search-admin', 'admin');
        const agent = await login(admin);

        await agent.get('/api/users?page=0').expect(400);
        await agent.get('/api/users?limit=101').expect(400);
        await agent.get(`/api/users?q=${'a'.repeat(101)}`).expect(400);
    });

    test('allows a customer to update their own account', async () => {
        const customer = await createAccount('customer');
        const agent = await login(customer);

        const response = await agent
            .put(`/api/users/${customer._id}`)
            .send({ name: 'Updated Customer' })
            .expect(200);

        expect(response.body.user.name).toBe('Updated Customer');
        expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('returns 403 when a customer updates or deletes another account or changes a role', async () => {
        const customer = await createAccount('customer');
        const otherUser = await createAccount('another');
        const agent = await login(customer);

        await agent
            .put(`/api/users/${otherUser._id}`)
            .send({ name: 'Not Allowed' })
            .expect(403);
        await agent.delete(`/api/users/${otherUser._id}`).expect(403);
        await agent
            .put(`/api/users/${customer._id}`)
            .send({ role: 'admin' })
            .expect(403);
    });

    test('allows an admin to update and delete another account', async () => {
        const admin = await createAccount('admin', 'admin');
        const customer = await createAccount('customer');
        const agent = await login(admin);

        const updateResponse = await agent
            .put(`/api/users/${customer._id}`)
            .send({ name: 'Updated by Admin' })
            .expect(200);
        expect(updateResponse.body.user.name).toBe('Updated by Admin');

        await agent
            .delete(`/api/users/${customer._id}`)
            .send({ password })
            .expect(204);
    });

    test('invalidates the target user sessions when an admin changes their role', async () => {
        const customer = await createAccount('customer');
        const customerAgent = await login(customer);
        const admin = await createAccount('admin', 'admin');
        const adminAgent = await login(admin);

        await adminAgent
            .put(`/api/users/${customer._id}`)
            .send({ role: 'admin' })
            .expect(200);

        await customerAgent.get('/api/users').expect(401);
        await adminAgent.get('/api/users').expect(200);
    });

    test('invalidates all deleted user sessions without affecting other users', async () => {
        const customer = await createAccount('customer');
        const customerAgent = await login(customer);
        const secondCustomerAgent = await login(customer);
        const otherUser = await createAccount('other');
        const otherAgent = await login(otherUser);
        const admin = await createAccount('admin', 'admin');
        const adminAgent = await login(admin);

        await adminAgent
            .delete(`/api/users/${customer._id}`)
            .send({ password: 'WrongPassword123' })
            .expect(403);
        await customerAgent.get('/api/users').expect(200);
        await secondCustomerAgent.get('/api/users').expect(200);

        await adminAgent
            .delete(`/api/users/${customer._id}`)
            .send({ password })
            .expect(204);

        await customerAgent.get('/api/users').expect(401);
        await secondCustomerAgent.get('/users-admin').expect(302).expect('Location', '/login');
        await adminAgent.get('/api/users').expect(200);
        await otherAgent.get('/api/users').expect(200);
        await expect(findUserById(customer._id.toString())).resolves.toBeNull();
    });

    test('returns 400 for invalid IDs and invalid update data', async () => {
        const admin = await createAccount('admin', 'admin');
        const agent = await login(admin);

        await agent
            .put('/api/users/not-a-valid-id')
            .send({ name: 'Updated Name' })
            .expect(400);
        await agent
            .delete('/api/users/not-a-valid-id')
            .expect(400);
        await agent
            .put(`/api/users/${admin._id}`)
            .send({ email: 'not-an-email' })
            .expect(400);
        await agent
            .put(`/api/users/${admin._id}`)
            .send({ name: '   ' })
            .expect(400);
    });

    test.each(['email', 'username'])(
        "returns 409 when an update duplicates another user's %s",
        async (field) => {
            const customer = await createAccount('customer');
            const otherUser = await createAccount('another');
            const agent = await login(customer);
            await User.collection.createIndex({ [field]: 1 }, { unique: true });

            await agent
                .put(`/api/users/${customer._id}`)
                .send({ [field]: otherUser[field] })
                .expect(409);
        }
    );

    test('returns 404 when an admin targets a user that does not exist', async () => {
        const admin = await createAccount('admin', 'admin');
        const agent = await login(admin);
        const missingUserId = new mongoose.Types.ObjectId().toString();

        await agent
            .put(`/api/users/${missingUserId}`)
            .send({ name: 'Missing User' })
            .expect(404);
        await agent
            .delete(`/api/users/${missingUserId}`)
            .send({ password })
            .expect(404);
    });

    test('requires the current account password and rejects an incorrect password for deletion', async () => {
        const admin = await createAccount('admin', 'admin');
        const customer = await createAccount('customer');
        const agent = await login(admin);

        await agent
            .delete(`/api/users/${customer._id}`)
            .send({ password: '' })
            .expect(400);
        await agent
            .delete(`/api/users/${customer._id}`)
            .send({ password: 'WrongPassword123' })
            .expect(403);
        await expect(findUserById(customer._id.toString())).resolves.not.toBeNull();
    });

    test('returns 204 and destroys the session after self-deletion', async () => {
        const customer = await createAccount('customer');
        const agent = await login(customer);
        const otherSession = await login(customer);

        await agent
            .delete(`/api/users/${customer._id}`)
            .send({ password })
            .expect(204);
        await agent.get('/api/users').expect(401);
        await otherSession.get('/api/users').expect(401);
        await expect(findUserById(customer._id.toString())).resolves.toBeNull();
    });
});
