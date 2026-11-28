import bcrypt from 'bcrypt';
import User from './schemas/users.js';
import Role from './schemas/roles.js';
import { userSearchValues } from './user-search.js';

const hashPasswordAux = async(password) => {
    return bcrypt.hash(password, 12);
}

const createUser = async (name, username, email, password) => {
    const customerRole = await Role.findOne({ name: 'customer' });
    if (!customerRole) throw new Error('Default customer role not found');

    const passwordHash = await hashPasswordAux(password);
    
    const newUser = await User.create({
        name,
        username,
        email,
        search: userSearchValues({ name, username, email }),
        passwordHash,
        role: customerRole._id
    });

    return newUser;
};

const verifyPassword = async (password, passwordHash) => {
    return bcrypt.compare(password, passwordHash);
};

const findUserByEmail = async (email) => {
    return User.findOne({ email }).populate('role');
};

const findUserByUsername = async (username) => {
    return User.findOne({ username }).populate('role');
}

const findUserById = async (userID) => {
    return User.findById(userID)
        .select('-passwordHash')
        .populate('role')
        .exec();
}

const findAllUsers = async () => {
    return User.find()
        .select('-passwordHash')
        .populate('role')
        .exec();
}

const createUsersFilter = async ({ terms, role }) => {
    const filter = {};
    if (role) {
        const matchingRole = await Role.findOne({ name: role });
        if (!matchingRole) throw new Error(`Role "${role}" not found.`);
        filter.role = matchingRole._id;
    }
    if (terms.length) {
        const unprepared = await User.collection.findOne(
            { search: { $not: { $size: 3 } } },
            { projection: { _id: 1 } }
        );
        if (unprepared) {
            throw new Error('User search data is incomplete. Run the user search migration.');
        }
        filter.$expr = {
            $anyElementTrue: [{
                $map: {
                    input: '$search',
                    as: 'field',
                    in: {
                        $or: terms.map((term) => ({
                            $gte: [{ $indexOfCP: ['$$field', { $literal: term }] }, 0]
                        }))
                    }
                }
            }]
        };
    }
    return filter;
};

const findUsersPage = async ({ filter, page, limit }) => {
    return User.find(filter)
        .select('-passwordHash')
        .populate('role')
        .sort({ username: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
}

const countUsers = async (filter) => {
    return User.countDocuments(filter).exec();
}

const findUserPasswordHashById = async (userID) => {
    const user = await User.findById(userID).select('passwordHash').exec();
    return user ? user.passwordHash : null;
}

const updateUserById = async (userID, updates) => {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        throw new TypeError('User updates must be an object.');
    }

    const allowedFields = ['name', 'username', 'email', 'password', 'role'];
    const unsupportedFields = Object.keys(updates)
        .filter((field) => !allowedFields.includes(field));

    if (unsupportedFields.length > 0) {
        throw new TypeError(`Unsupported user update field(s): ${unsupportedFields.join(', ')}`);
    }

    const updateFields = {};
    for (const field of ['name', 'username', 'email']) {
        if (Object.prototype.hasOwnProperty.call(updates, field)) {
            updateFields[field] = updates[field];
        }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'password')) {
        updateFields.passwordHash = await hashPasswordAux(updates.password);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
        const role = await Role.findOne({ name: updates.role });
        if (!role) {
            throw new Error(`Role "${updates.role}" not found.`);
        }
        updateFields.role = role._id;
    }

    if (Object.keys(updateFields).length === 0) {
        return findUserById(userID);
    }

    const searchFieldsChanged = ['name', 'username', 'email']
        .some((field) => Object.prototype.hasOwnProperty.call(updateFields, field));
    if (!searchFieldsChanged) {
        return User.findByIdAndUpdate(
            userID,
            { $set: updateFields },
            { returnDocument: 'after', runValidators: true }
        )
            .select('-passwordHash')
            .populate('role')
            .exec();
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        const current = await User.findById(userID).select('name username email').lean();
        if (!current) return null;
        const search = userSearchValues({
            name: updateFields.name ?? current.name,
            username: updateFields.username ?? current.username,
            email: updateFields.email ?? current.email
        });
        const updated = await User.findOneAndUpdate(
            { _id: userID, name: current.name, username: current.username, email: current.email },
            { $set: { ...updateFields, search } },
            { returnDocument: 'after', runValidators: true }
        )
            .select('-passwordHash')
            .populate('role')
            .exec();
        if (updated) return updated;
    }
    throw new Error('User changed repeatedly while updating search data.');
}

const deleteUserById = async (userID) => {
    return User.findByIdAndDelete(userID)
        .select('-passwordHash')
        .populate('role')
        .exec();
}

export {
    createUser,
    verifyPassword,
    findUserByEmail,
    findUserById,
    findUserByUsername,
    findAllUsers,
    createUsersFilter,
    findUsersPage,
    countUsers,
    findUserPasswordHashById,
    updateUserById,
    deleteUserById
}
