import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createUser, updateUserById } from '../src/models/users.js';

const createAccount = async (username, role = 'customer') => {
    const user = await createUser(
        `${username} User`,
        username,
        `${username}@example.com`,
        'TestPassword123'
    );
    return role === 'admin'
        ? updateUserById(user._id.toString(), { role })
        : user;
};

const login = async (user) => {
    const agent = request.agent(app);
    await agent
        .post('/login')
        .send({ identifier: user.email, password: 'TestPassword123' })
        .expect(302);
    return agent;
};

describe('Admin Dashboard', () => {
    test('allows an admin to follow the user administration link', async () => {
        const admin = await createAccount('dashboard-admin', 'admin');
        const agent = await login(admin);
        const dashboard = await agent.get('/admin/dashboard').expect(200);

        expect(dashboard.text).toContain('<a href="/users-admin">User Administration</a>');
        await agent.get('/users-admin').expect(200);
    });

    test('protects the dashboard and linked page', async () => {
        await request(app)
            .get('/admin/dashboard')
            .expect(302)
            .expect('Location', '/login');
        await request(app)
            .get('/users-admin')
            .expect(302)
            .expect('Location', '/login');

        const customer = await createAccount('dashboard-customer');
        await (await login(customer)).get('/admin/dashboard').expect(403);
    });
});
