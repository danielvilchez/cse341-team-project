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
import { getDb } from '../src/db/connect.js';
import { migrateUserSearch } from '../src/db/user-search-migration.js';

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
            limit: 10,
            totalItems: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
        });

        const adminResponse = await (await login(admin))
            .get('/api/users')
            .expect(200);
        expect(adminResponse.body.users).toHaveLength(3);
        expect(adminResponse.body.pagination.totalItems).toBe(3);
        expect(adminResponse.body.users.every((user) => !('passwordHash' in user))).toBe(true);
    });

    test('searches and paginates admin results on the server', async () => {
        await User.collection.createIndex({
            name: 'text',
            username: 'text',
            email: 'text'
        });
        const secondMatch = await createAccount('match-second');
        const firstMatch = await createAccount('match-first');
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
            totalItems: 2,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false
        });

        const secondPage = await agent
            .get('/api/users?q=match&page=2&limit=1')
            .expect(200);
        expect(secondPage.body.users).toHaveLength(1);
        expect(firstPage.body.users[0].id).toBe(firstMatch._id.toString());
        expect(secondPage.body.users[0].id).toBe(secondMatch._id.toString());
        expect(secondPage.body.pagination).toMatchObject({
            hasNextPage: false,
            hasPreviousPage: true
        });
        const pageIds = [firstPage.body.users[0].id, secondPage.body.users[0].id];
        expect(new Set(pageIds).size).toBe(2);
        expect(pageIds).toContain(firstMatch._id.toString());
        expect(pageIds).toContain(secondMatch._id.toString());
    });

    test('rejects invalid user search and pagination parameters', async () => {
        const admin = await createAccount('search-admin', 'admin');
        const agent = await login(admin);

        for (const query of [
            'page=0', 'page=abc', 'page=1.5', 'page=1&page=2',
            'limit=0', 'limit=-1', 'limit=51', 'limit=1.5',
            'page=9007199254740991&limit=50'
        ]) {
            await agent.get(`/api/users?${query}`).expect(400);
        }
        await agent.get('/api/users?limit=50').expect(200);
        await agent.get(`/api/users?q=${'a'.repeat(101)}`).expect(400);
    });

    test('combines literal substring search, phrases, role and filtered pagination', async () => {
        const admin = await createAccount('search-admin', 'admin');
        await createUser('João Silva', 'luna-star', 'luna+test@example.com', password);
        await createUser('Jose\u0301 Santos', 'jose', 'jose@example.com', password);
        const agent = await login(admin);
        const check = async (q, expected) => {
            const response = await agent.get('/api/users').query({ q }).expect(200);
            expect(response.body.users.map((user) => user.username)).toEqual(expected);
            expect(response.body.pagination.totalItems).toBe(expected.length);
            expect(response.body.users.every((user) => !('search' in user))).toBe(true);
        };
        await check('JOAO', ['luna-star']);
        await check('SAN', ['jose']);
        await check('star', ['luna-star']);
        await check('+test@', ['luna-star']);
        await check('missing sil', ['luna-star']);
        await check('"joao silva"', ['luna-star']);
        await check('"silva luna"', []);
        await check('$literal', []);
        await check('not-found', []);

        const filtered = await agent.get('/api/users')
            .query({ q: 'a', role: 'customer', page: 2, limit: 1 }).expect(200);
        expect(filtered.body.users.map((user) => user.username)).toEqual(['luna-star']);
        expect(filtered.body.pagination).toMatchObject({ page: 2, totalItems: 2, totalPages: 2 });
        const admins = await agent.get('/api/users').query({ role: 'admin' }).expect(200);
        expect(admins.body.users.map((user) => user.username)).toEqual(['search-admin']);
        const emptyQuotes = await agent.get('/api/users').query({ q: '""' }).expect(200);
        expect(emptyQuotes.body.pagination.totalItems).toBe(3);
    });

    test('searches updated fields and no longer matches their old values', async () => {
        const admin = await createAccount('admin', 'admin');
        const customer = await createAccount('old-user');
        const agent = await login(admin);
        await agent.put(`/api/users/${customer._id}`)
            .send({ name: 'Álvaro Novo', username: 'new-user', email: 'new@example.com', currentPassword: password })
            .expect(200);
        for (const q of ['alvaro', 'new-user', 'new@example']) {
            const response = await agent.get('/api/users').query({ q }).expect(200);
            expect(response.body.users.map((user) => user.username)).toEqual(['new-user']);
        }
        const old = await agent.get('/api/users').query({ q: 'old-user' }).expect(200);
        expect(old.body.users).toEqual([]);
    });

    test('validates role and quote syntax while preserving customer visibility', async () => {
        const customer = await createAccount('customer');
        const admin = await createAccount('admin', 'admin');
        const agent = await login(admin);
        for (const query of [
            'role=owner', 'role=admin&role=customer',
            'q=%22unfinished', 'q=outside%20%22phrase%22', 'q=%22one%22%22two%22'
        ]) {
            await agent.get(`/api/users?${query}`).expect(400);
        }
        const ownAgent = await login(customer);
        const own = await ownAgent.get('/api/users')
            .query({ q: 'not-found', role: 'admin', page: 2 }).expect(200);
        expect(own.body.users.map((user) => user.id)).toEqual([customer._id.toString()]);
        await ownAgent.get('/api/users?role=invalid').expect(400);
    });

    test('fails explicitly when existing users have not been migrated', async () => {
        const admin = await createAccount('admin', 'admin');
        const user = await createAccount('legacy');
        await User.collection.updateOne({ _id: user._id }, { $unset: { search: '' } });
        const agent = await login(admin);
        await agent.get('/api/users?q=legacy').expect(500);
        await agent.get('/api/users').expect(200);
        expect(await migrateUserSearch(getDb())).toBe(1);
        const migrated = await agent.get('/api/users?q=legacy').expect(200);
        expect(migrated.body.users.map((item) => item.username)).toEqual(['legacy']);
    });

    test('orders and paginates users by username with complete metadata', async () => {
        const admin = await createAccount('pagination-admin', 'admin');
        await User.insertMany(Array.from({ length: 12 }, (_, index) => {
            const username = `user${String(11 - index).padStart(2, '0')}`;
            return {
                name: username,
                username,
                email: `${username}@example.com`,
                passwordHash: 'not-returned',
                role: admin.role._id
            };
        }));
        const agent = await login(admin);
        const first = await agent.get('/api/users').expect(200);
        expect(first.body.users.map((user) => user.username)).toEqual([
            'pagination-admin', 'user00', 'user01', 'user02', 'user03',
            'user04', 'user05', 'user06', 'user07', 'user08'
        ]);
        expect(first.body.pagination).toEqual({
            page: 1, limit: 10, totalItems: 13, totalPages: 2,
            hasNextPage: true, hasPreviousPage: false
        });
        const second = await agent.get('/api/users?page=2').expect(200);
        expect(second.body.users.map((user) => user.username))
            .toEqual(['user09', 'user10', 'user11']);
        expect(second.body.pagination).toEqual({
            page: 2, limit: 10, totalItems: 13, totalPages: 2,
            hasNextPage: false, hasPreviousPage: true
        });
        const beyond = await agent.get('/api/users?page=3').expect(200);
        expect(beyond.body.users).toEqual([]);
        expect(beyond.body.pagination).toEqual({
            page: 3, limit: 10, totalItems: 13, totalPages: 2,
            hasNextPage: false, hasPreviousPage: true
        });
    });

    test('returns empty search metadata and preserves customer visibility', async () => {
        await User.collection.createIndex({ name: 'text', username: 'text', email: 'text' });
        const customer = await createAccount('customer');
        const admin = await createAccount('admin', 'admin');
        const empty = await (await login(admin)).get('/api/users?q=unfindable').expect(200);
        expect(empty.body.users).toEqual([]);
        expect(empty.body.pagination).toEqual({
            page: 1, limit: 10, totalItems: 0, totalPages: 0,
            hasNextPage: false, hasPreviousPage: false
        });
        const own = await (await login(customer)).get('/api/users?page=2&q=unfindable').expect(200);
        expect(own.body.users.map((user) => user.id)).toEqual([customer._id.toString()]);
        expect(own.body.pagination).toEqual({
            page: 1, limit: 10, totalItems: 1, totalPages: 1,
            hasNextPage: false, hasPreviousPage: false
        });
    });

    test('allows a customer to update their own account', async () => {
        const customer = await createAccount('customer');
        const agent = await login(customer);

        const response = await agent
            .put(`/api/users/${customer._id}`)
            .send({ name: 'Updated Customer', currentPassword: password })
            .expect(200);

        expect(response.body.user.name).toBe('Updated Customer');
        expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    test('requires the authenticated user password before updating', async () => {
        const customer = await createAccount('customer');
        const agent = await login(customer);
        for (const body of [
            { name: 'Updated' },
            { name: 'Updated', currentPassword: '' },
            { name: 'Updated', currentPassword: false }
        ]) {
            await agent.put(`/api/users/${customer._id}`).send(body).expect(400);
        }
        await agent.put(`/api/users/${customer._id}`)
            .send({ name: 'Updated', currentPassword: 'WrongPassword123' })
            .expect(403);
        expect((await findUserById(customer._id.toString())).name).toBe('customer User');
    });

    test('requires the admin password rather than the target password for an edit', async () => {
        const admin = await createAccount('admin', 'admin');
        const customer = await createAccount('customer');
        const customerWithDifferentPassword = await updateUserById(customer._id.toString(), {
            password: 'TargetPassword123'
        });
        const customerAgent = request.agent(app);
        await customerAgent.post('/login')
            .send({ identifier: customer.email, password: 'TargetPassword123' }).expect(302);
        const agent = await login(admin);
        await agent.put(`/api/users/${customer._id}`)
            .send({ role: 'admin', currentPassword: 'TargetPassword123' }).expect(403);
        expect((await findUserById(customer._id.toString())).role.name).toBe('customer');
        await customerAgent.get('/api/users').expect(200);
        const response = await agent.put(`/api/users/${customer._id}`)
            .send({ name: 'Updated', currentPassword: password }).expect(200);
        expect(response.body.user.name).toBe('Updated');
        expect(response.body.user).not.toHaveProperty('currentPassword');
        expect(customerWithDifferentPassword.passwordHash).toBeUndefined();
    });

    test('changes a password only after confirming the old password', async () => {
        const customer = await createAccount('customer');
        const agent = await login(customer);
        await agent.put(`/api/users/${customer._id}`)
            .send({ password: 'NewPassword123', currentPassword: 'WrongPassword123' }).expect(403);
        const rejectedSession = request.agent(app);
        await rejectedSession.post('/login')
            .send({ identifier: customer.email, password: 'NewPassword123' }).expect(401);
        await agent.put(`/api/users/${customer._id}`)
            .send({ password: 'NewPassword123', currentPassword: password }).expect(200);
        const newSession = request.agent(app);
        await newSession.post('/login')
            .send({ identifier: customer.email, password: 'NewPassword123' }).expect(302);
    });

    test('returns 403 when a customer updates or deletes another account or changes a role', async () => {
        const customer = await createAccount('customer');
        const otherUser = await createAccount('another');
        const agent = await login(customer);

        await agent
            .put(`/api/users/${otherUser._id}`)
            .send({ name: 'Not Allowed', currentPassword: password })
            .expect(403);
        await agent.delete(`/api/users/${otherUser._id}`).expect(403);
        await agent
            .put(`/api/users/${customer._id}`)
            .send({ role: 'admin', currentPassword: password })
            .expect(403);
    });

    test('allows an admin to update and delete another account', async () => {
        const admin = await createAccount('admin', 'admin');
        const customer = await createAccount('customer');
        const agent = await login(admin);

        const updateResponse = await agent
            .put(`/api/users/${customer._id}`)
            .send({ name: 'Updated by Admin', currentPassword: password })
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
            .send({ role: 'admin', currentPassword: password })
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
            .send({ email: 'not-an-email', currentPassword: password })
            .expect(400);
        await agent
            .put(`/api/users/${admin._id}`)
            .send({ name: '   ', currentPassword: password })
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
                .send({ [field]: otherUser[field], currentPassword: password })
                .expect(409);
        }
    );

    test('returns 404 when an admin targets a user that does not exist', async () => {
        const admin = await createAccount('admin', 'admin');
        const agent = await login(admin);
        const missingUserId = new mongoose.Types.ObjectId().toString();

        await agent
            .put(`/api/users/${missingUserId}`)
            .send({ name: 'Missing User', currentPassword: password })
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
