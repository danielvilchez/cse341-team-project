import mongoose from 'mongoose';
import {
    countUsers,
    createUsersFilter,
    findUserPasswordHashById,
    findUserById,
    findUsersPage,
    updateUserById,
    deleteUserById,
    verifyPassword
} from '../models/users.js';
import { invalidateUserSessions } from '../db/sessions.js';
import { parseUserSearch } from '../models/user-search.js';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;

const toSafeUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role.name
});

const parsePositiveInteger = (value) => {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        return null;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
};

const paginationMetadata = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    return {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
};

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
        const searchValue = req.query.q ?? '';
        const role = req.query.role;
        const pageValue = req.query.page;
        const limitValue = req.query.limit;
        const page = pageValue === undefined ? 1 : parsePositiveInteger(pageValue);
        const limit = limitValue === undefined
            ? DEFAULT_PAGE_SIZE
            : parsePositiveInteger(limitValue);

        if (
            typeof searchValue !== 'string' ||
            searchValue.length > MAX_SEARCH_LENGTH ||
            (role !== undefined && !['admin', 'customer'].includes(role)) ||
            page === null ||
            limit === null ||
            limit > MAX_PAGE_SIZE ||
            (page !== null && limit !== null && !Number.isSafeInteger((page - 1) * limit))
        ) {
            return res.status(400).json({ message: 'Invalid user search or pagination parameters.' });
        }

        const terms = parseUserSearch(searchValue);
        if (terms === null) {
            return res.status(400).json({ message: 'Invalid user search or pagination parameters.' });
        }
        if (req.user.role === 'admin') {
            const filter = await createUsersFilter({ terms, role });
            const [users, totalItems] = await Promise.all([
                findUsersPage({ filter, page, limit }),
                countUsers(filter)
            ]);

            return res.status(200).json({
                users: users.map(toSafeUser),
                pagination: paginationMetadata(page, limit, totalItems)
            });
        }

        if (req.user.role === 'customer') {
            const user = await findUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json({
                users: [toSafeUser(user)],
                pagination: paginationMetadata(1, limit, 1)
            });
        }

        return res.status(403).json({ message: 'Forbidden' });
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

    const body = req.body ?? {};
    if (
        typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).some((field) => field !== 'password') ||
        typeof body.password !== 'string' ||
        !body.password
    ) {
        return res.status(400).json({ message: 'Current password is required.' });
    }

    try {
        const passwordHash = await findUserPasswordHashById(req.user.id);
        if (!passwordHash) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const passwordMatches = await verifyPassword(body.password, passwordHash);
        if (!passwordMatches) {
            return res.status(403).json({ message: 'Current password is incorrect.' });
        }

        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await invalidateUserSessions(userId);

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
