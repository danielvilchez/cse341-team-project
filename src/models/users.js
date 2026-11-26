import bcrypt from 'bcrypt';
import User from './schemas/users.js';
import Role from './schemas/roles.js';

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

const findUsersPage = async ({ search, page, limit }) => {
    const filter = search ? { $text: { $search: search } } : {};
    const sort = search
        ? { score: { $meta: 'textScore' }, _id: 1 }
        : { _id: 1 };

    return User.find(filter)
        .select('-passwordHash')
        .populate('role')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
}

const countUsers = async (search) => {
    const filter = search ? { $text: { $search: search } } : {};
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

    return User.findByIdAndUpdate(
        userID,
        { $set: updateFields },
        { returnDocument: 'after', runValidators: true }
    )
        .select('-passwordHash')
        .populate('role')
        .exec();
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
    findUsersPage,
    countUsers,
    findUserPasswordHashById,
    updateUserById,
    deleteUserById
}
