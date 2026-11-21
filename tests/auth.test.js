import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { loginUser } from '../src/controllers/auth.js';
import { createUser } from '../src/models/users.js';
import { requireUserOwnerOrAdmin } from '../src/middleware/auth.js';

const loginView = readFileSync(new URL('../src/views/auth/login.ejs', import.meta.url), 'utf8');

const createLoginRequest = (identifier) => ({
    body: {
        identifier,
        password: 'InitialPassword123'
    },
    session: {
        regenerate(callback) {
            callback(null);
        }
    }
});

const createLoginResponse = () => {
    const response = {
        redirect: vi.fn(),
        render: vi.fn(),
        status: vi.fn()
    };
    response.status.mockReturnValue(response);
    response.render.mockReturnValue(response);
    return response;
};

describe('Login with email or username', () => {
    test('uses a single email-or-username field in the login view', () => {
        expect(loginView).toContain('Email or username:');
        expect(loginView).toContain('name="identifier"');
        expect(loginView).toContain('type="text"');
    });

    test.each(['test@example.com', 'testuser'])(
        'authenticates using %s',
        async (identifier) => {
            await createUser(
                'Test User',
                'testuser',
                'test@example.com',
                'InitialPassword123'
            );
            const req = createLoginRequest(identifier);
            const res = createLoginResponse();
            const next = vi.fn();

            await loginUser(req, res, next);

            expect(res.redirect).toHaveBeenCalledWith('/dashboard');
            expect(req.session.user).toMatchObject({
                name: 'Test User',
                role: 'customer'
            });
            expect(next).not.toHaveBeenCalled();
        }
    );

    test('normalizes the email or username before lookup', async () => {
        await createUser(
            'Test User',
            'testuser',
            'test@example.com',
            'InitialPassword123'
        );
        const req = createLoginRequest('  TESTUSER  ');
        const res = createLoginResponse();

        await loginUser(req, res, vi.fn());

        expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    test('rejects a missing identifier', async () => {
        const req = createLoginRequest('   ');
        const res = createLoginResponse();

        await loginUser(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith('auth/login', expect.objectContaining({
            error: 'Email or username and password are required.'
        }));
    });
});

describe('User owner/admin authorization middleware', () => {
    const createResponse = () => {
        const res = {
            status: vi.fn(),
            json: vi.fn()
        };
        res.status.mockReturnValue(res);
        return res;
    };

    test('allows a customer to manage their own user record', () => {
        const req = {
            user: { id: 'user-id', role: 'customer' },
            params: { userId: 'user-id' }
        };
        const res = createResponse();
        const next = vi.fn();

        requireUserOwnerOrAdmin(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('rejects a customer attempting to manage another user', () => {
        const req = {
            user: { id: 'customer-id', role: 'customer' },
            params: { userId: 'other-user-id' }
        };
        const res = createResponse();

        requireUserOwnerOrAdmin(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    test('allows an admin to manage another user', () => {
        const req = {
            user: { id: 'admin-id', role: 'admin' },
            params: { userId: 'other-user-id' }
        };
        const next = vi.fn();

        requireUserOwnerOrAdmin(req, createResponse(), next);

        expect(next).toHaveBeenCalledOnce();
    });

    test('returns 401 when the request is unauthenticated', () => {
        const req = { user: null, params: { userId: 'user-id' } };
        const res = createResponse();

        requireUserOwnerOrAdmin(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
    });
});
