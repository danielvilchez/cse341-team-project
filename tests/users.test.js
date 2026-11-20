import { describe, expect, test } from 'vitest';
import User from '../src/models/schemas/users.js';
import {
    createUser,
    deleteUserById,
    findAllUsers,
    findUserById,
    updateUserById,
    verifyPassword
} from '../src/models/users.js';

const createTestUser = () => createUser(
    'Test User',
    'testuser',
    'test@example.com',
    'InitialPassword123'
);

describe('User model', () => {
    test('updates user fields and returns the populated role without the password hash', async () => {
        const user = await createTestUser();

        const updatedUser = await updateUserById(user._id.toString(), {
            name: 'Updated User',
            username: 'updateduser'
        });

        expect(updatedUser).toMatchObject({
            name: 'Updated User',
            username: 'updateduser'
        });
        expect(updatedUser.role.name).toBe('customer');
        expect(updatedUser.passwordHash).toBeUndefined();
    });

    test('hashes a new password instead of storing it as plain text', async () => {
        const user = await createTestUser();

        const updatedUser = await updateUserById(user._id.toString(), {
            password: 'UpdatedPassword123'
        });
        const storedUser = await User.findById(user._id);

        expect(updatedUser.passwordHash).toBeUndefined();
        await expect(verifyPassword('UpdatedPassword123', storedUser.passwordHash))
            .resolves.toBe(true);
        await expect(verifyPassword('InitialPassword123', storedUser.passwordHash))
            .resolves.toBe(false);
    });

    test('updates the role using its name and returns the populated role', async () => {
        const user = await createTestUser();

        const updatedUser = await updateUserById(user._id.toString(), {
            role: 'admin'
        });

        expect(updatedUser.role.name).toBe('admin');
    });

    test('returns the current user without changing it for an empty update', async () => {
        const user = await createTestUser();

        const unchangedUser = await updateUserById(user._id.toString(), {});

        expect(unchangedUser._id.toString()).toBe(user._id.toString());
        expect(unchangedUser.role.name).toBe('customer');
        expect(unchangedUser.passwordHash).toBeUndefined();
    });

    test('rejects unsupported update fields', async () => {
        const user = await createTestUser();

        await expect(
            updateUserById(user._id.toString(), { passwordHash: 'not-allowed' })
        ).rejects.toThrow('Unsupported user update field');
    });

    test('deletes a user and returns null for a missing user', async () => {
        const user = await createTestUser();

        const deletedUser = await deleteUserById(user._id.toString());

        expect(deletedUser._id.toString()).toBe(user._id.toString());
        expect(deletedUser.passwordHash).toBeUndefined();
        await expect(findUserById(user._id.toString())).resolves.toBeNull();
        await expect(deleteUserById(user._id.toString())).resolves.toBeNull();
    });

    test('lists users with populated roles and without password hashes', async () => {
        await createTestUser();

        const users = await findAllUsers();

        expect(users).toHaveLength(1);
        expect(users[0].role.name).toBe('customer');
        expect(users[0].passwordHash).toBeUndefined();
    });
});
