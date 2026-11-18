import { createUser, findUserByEmail, verifyPassword } from '../models/users.js';

export const renderRegisterPage = (req, res) => {
  return res.render('auth/register', { title: 'Register' });
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).render('auth/register', { 
        title: 'Register', 
        error: 'All fields are required.' 
      });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).render('auth/register', { 
        title: 'Register', 
        error: 'Email is already registered.' 
      });
    }

    await createUser(name, email, password);
    return res.redirect('/login');
  } catch (error) {
    return next(error);
  }
};

export const renderLoginPage = (req, res) => {
  return res.render('auth/login', { title: 'Login' });
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render('auth/login', { 
        title: 'Login', 
        error: 'Email and password are required.' 
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).render('auth/login', { 
        title: 'Login', 
        error: 'Invalid email or password.' 
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).render('auth/login', { 
        title: 'Login', 
        error: 'Invalid email or password.' 
      });
    }

    // Set the session
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      role: user.role.name
    };

    
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/dashboard');
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    return res.redirect('/');
  });
};