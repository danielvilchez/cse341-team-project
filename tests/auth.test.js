import { readFileSync } from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { loginUser } from '../src/controllers/auth.js';
import { createUser } from '../src/models/users.js';

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
