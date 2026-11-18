import express from 'express';
import Path from 'path';
import { fileURLToPath } from 'url';
import pkg from './package.json' with { type: 'json' };
import session from 'express-session'; 
import globalMiddleware from './src/middleware/global.js';
import { loadSessionUser } from './src/middleware/auth.js';
import routes from './src/routes/router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

const app = express();

// Add version info to res.locals
app.use((req, res, next) => {
    res.locals.appVersion = pkg.version;
    next();
});

// Configure static files and EJS templates
app.use(express.static(Path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', Path.join(__dirname, 'src/views'));

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- ADD SESSION MIDDLEWARE HERE ---
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not defined. Add it to your .env file.');
}

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 60 * 60 * 1000 }
}));
// -----------------------------------

app.use(globalMiddleware);
app.use(loadSessionUser);
app.use('/', routes);

// Error handlers (keep your existing ones)
app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    const status = err.status || 500;
    const template = status === 404 ? '404' : '500';
    const context = {
        title: status === 404 ? 'Page Not Found' : 'Server Error',
        error: err.message,
        stack: err.stack
    };
    return res.status(status).render(`errors/${template}`, context);
});

export default app;