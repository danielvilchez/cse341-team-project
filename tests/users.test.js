import { describe, expect, test } from 'vitest';
import User from '../src/models/schemas/users.js';
import { getDb } from '../src/db/connect.js';
import { migrateUserSearch } from '../src/db/user-search-migration.js';
import {
    createUser,
    deleteUserById,
    findAllUsers,
    findUserByEmail,
    findUserById,
    findUserByUsername,
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
    test('finds a user by email and populates the role', async () => {
        await createTestUser();

        const user = await findUserByEmail('test@example.com');

        expect(user.email).toBe('test@example.com');
        expect(user.role.name).toBe('customer');
        expect(user.passwordHash).toBeTruthy();
    });

    test('returns null when no user has the requested email', async () => {
        await expect(findUserByEmail('missing@example.com')).resolves.toBeNull();
    });

    test('finds a user by username and populates the role', async () => {
        await createTestUser();

        const user = await findUserByUsername('testuser');

        expect(user.username).toBe('testuser');
        expect(user.role.name).toBe('customer');
    });

    test('returns null when no user has the requested username', async () => {
        await expect(findUserByUsername('missinguser')).resolves.toBeNull();
    });

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

    test('keeps normalized search values aligned across concurrent partial updates', async () => {
        const user = await createTestUser();
        await Promise.all([
            updateUserById(user._id.toString(), { name: 'João Silva' }),
            updateUserById(user._id.toString(), { email: 'new@example.com' })
        ]);
        const stored = await User.collection.findOne({ _id: user._id });
        expect(stored.search).toEqual(['joao silva', 'testuser', 'new@example.com']);
    });

    test('migrates existing search data idempotently and repairs stale entries', async () => {
        const user = await createTestUser();
        await User.collection.updateOne({ _id: user._id }, { $unset: { search: '' } });
        expect(await migrateUserSearch(getDb())).toBe(1);
        expect((await User.collection.findOne({ _id: user._id })).search)
            .toEqual(['test user', 'testuser', 'test@example.com']);
        expect(await migrateUserSearch(getDb())).toBe(0);
        await User.collection.updateOne({ _id: user._id }, { $set: { search: ['stale'] } });
        expect(await migrateUserSearch(getDb())).toBe(1);
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
