import bcrypt from 'bcrypt';
import User from './schemas/users.js';
import Role from './schemas/roles.js';

export const createUser = async (name, email, password) => {
  const customerRole = await Role.findOne({ name: 'customer' });
  if (!customerRole) throw new Error('Default customer role not found');

  const passwordHash = await bcrypt.hash(password, 12);
  
  const newUser = await User.create({
    name,
    email,
    passwordHash,
    role: customerRole._id
  });

  return newUser;
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email }).populate('role');
};

export const verifyPassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};