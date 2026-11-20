import mongoose from 'mongoose';
import {
    findAllUsers,
    findUserById,
    updateUserById,
    deleteUserById
} from '../models/users.js';
import { invalidateUserSessions } from '../db/sessions.js';

const toSafeUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role.name
});

const handleUserError = (error, res, operation) => {
    if (error.code === 11000) {
        return res.status(409).json({
            message: 'The request conflicts with existing data.'
        });
    }

    if (
        error instanceof TypeError ||
        error.name === 'ValidationError' ||
        error.name === 'CastError'
    ) {
        return res.status(400).json({ message: 'Invalid user data.' });
    }

    console.error(`Error ${operation}:`, error);
    return res.status(500).json({ message: 'Internal Server Error' });
};

const getUsersHandler = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        let users;
        if (req.user.role === 'admin') {
            users = await findAllUsers();
        } else if (req.user.role === 'customer') {
            const user = await findUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            users = [user];
        } else {
            return res.status(403).json({ message: 'Forbidden' });
        }

        return res.status(200).json({ users: users.map(toSafeUser) });
    } catch (error) {
        return handleUserError(error, res, 'fetching users');
    }
};

const updateUserHandler = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user data.' });
    }

    const updates = req.body ?? {};
    if (typeof updates !== 'object' || Array.isArray(updates)) {
        return res.status(400).json({ message: 'Invalid user data.' });
    }

    const allowedFields = ['name', 'username', 'email', 'password', 'role'];
    if (Object.keys(updates).some((field) => !allowedFields.includes(field))) {
        return res.status(400).json({ message: 'Invalid user data.' });
    }

    if (
        Object.prototype.hasOwnProperty.call(updates, 'role') &&
        req.user.role !== 'admin'
    ) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const normalizedUpdates = {};
    for (const field of ['name', 'username', 'email']) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
            if (typeof updates[field] !== 'string' || !updates[field].trim()) {
                return res.status(400).json({ message: 'Invalid user data.' });
            }
            normalizedUpdates[field] = updates[field].trim();
        }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'username')) {
        normalizedUpdates.username = normalizedUpdates.username.toLowerCase();
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'email')) {
        normalizedUpdates.email = normalizedUpdates.email.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedUpdates.email)) {
            return res.status(400).json({ message: 'Invalid user data.' });
        }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'password')) {
        if (typeof updates.password !== 'string' || !updates.password) {
            return res.status(400).json({ message: 'Invalid user data.' });
        }
        normalizedUpdates.password = updates.password;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
        if (!['customer', 'admin'].includes(updates.role)) {
            return res.status(400).json({ message: 'Invalid user data.' });
        }
        normalizedUpdates.role = updates.role;
    }

    try {
        const roleIsBeingChanged = Object.prototype.hasOwnProperty.call(
            normalizedUpdates,
            'role'
        );
        if (roleIsBeingChanged) {
            const currentUser = await findUserById(userId);
            if (!currentUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (currentUser.role.name !== normalizedUpdates.role) {
                const exceptSessionId = req.user.id === userId
                    ? req.sessionID
                    : undefined;
                await invalidateUserSessions(userId, exceptSessionId);
            }
        }

        const user = await updateUserById(userId, normalizedUpdates);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.user.id === userId && req.session && req.session.user) {
            req.session.user.name = user.name;
            req.session.user.role = user.role.name;
        }

        return res.status(200).json({ user: toSafeUser(user) });
    } catch (error) {
        return handleUserError(error, res, 'updating user');
    }
};

const deleteUserHandler = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user data.' });
    }

    try {
        const deletedUser = await deleteUserById(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.user.id === userId && req.session) {
            return req.session.destroy((error) => {
                if (error) {
                    console.error('Error destroying deleted user session:', error);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }
                return res.status(204).end();
            });
        }

        return res.status(204).end();
    } catch (error) {
        return handleUserError(error, res, 'deleting user');
    }
};

export {
    getUsersHandler,
    updateUserHandler,
    deleteUserHandler
};
