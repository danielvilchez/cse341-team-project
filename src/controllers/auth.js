import { 
  createUser,
  verifyPassword,
  findUserByEmail,
  findUserByUsername
} from '../models/users.js';

const renderRegisterPage = (req, res) => {
  return res.render('auth/register', { title: 'Register' });
};

const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;
    
    if (!name || !username || !email || !password) {
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

    await createUser(name, username, email, password);
    return res.redirect('/login');
  } catch (error) {
    return next(error);
  }
};

const renderLoginPage = (req, res) => {
  return res.render('auth/login', { title: 'Login' });
};

const loginUser = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const normalizedIdentifier = typeof identifier === 'string'
      ? identifier.trim().toLowerCase()
      : '';

    if (!normalizedIdentifier || typeof password !== 'string' || !password) {
      return res.status(400).render('auth/login', { 
        title: 'Login', 
        error: 'Email or username and password are required.' 
      });
    }

    let user = await findUserByEmail(normalizedIdentifier);
    if (!user) {
      user = await findUserByUsername(normalizedIdentifier);
    }
    
    if (!user) {
      return res.status(401).render('auth/login', { 
        title: 'Login', 
        error: 'Invalid email or username and password.' 
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).render('auth/login', { 
        title: 'Login', 
        error: 'Invalid email or username and password.' 
      });
    }

    // Regenerate session to prevent fixation
    return req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        role: user.role.name
      };

      // Redirect based on role
      if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
      return res.redirect('/dashboard');
    });
  } catch (error) {
    return next(error);
  }
};

const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    return res.redirect('/');
  });
};

export {
  registerUser,
  loginUser,
  logoutUser,
  renderRegisterPage,
  renderLoginPage
}