import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { 
    connectDB, 
    initializeDatabase,
    fetchRandomWatches,
    getAllWatches,
    getWatchById,
    getManufacturers,
    findUserByEmail,
    createUser,
    verifyUser,
    updateWatch,
} from "./database";
import { User, AppLocals } from "./interface";

dotenv.config();

const app: Express = express();

// Type declaratie voor res.locals
declare module 'express' {
    interface Locals extends AppLocals {}
}

declare module 'express-session' {
    interface SessionData {
        user?: User;
    }
}

// Express configuratie
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    }
}));

const publicPaths = [
  '/login',
  '/login',
  '/login',
  '/register',
  '/register'
];
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/js') || req.path.startsWith('/css') || req.path.startsWith('/images')) {
    return next();
  }

  if (publicPaths.includes(req.path)) {
    return next();
  }

  if (!req.session.user) {
    return res.redirect('/login');
  }

  next();
});

// res.locals.currentUser invullen
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user
        ? { 
            _id: req.session.user._id,
            name: req.session.user.name,
            email: req.session.user.email,
            role: req.session.user.role,
            loggedIn: true 
          }
        : null;
    next();
});

// --- Middleware voor beveiliging ---
function ensureLoggedIn(req: Request, res: Response, next: NextFunction) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

function ensureAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.session.user?.role !== 'ADMIN') {
        return res.status(403).render('error', {
            currentUser: res.locals.currentUser,
            message: 'Toegang geweigerd',
            errorDetails: 'Alleen admins mogen deze pagina zien'
        });
    }
    next();
}

// --- Routes ---

// Home (nu beschermd: verplicht inloggen)
app.get('/', ensureLoggedIn, async (req, res) => {
    try {
        const randomWatches = await fetchRandomWatches();
        res.render('index', { watches: randomWatches });
    } catch (error) {
        handleError(res, error, 'Kon horloges niet laden');
    }
});

// Collectie (public)
app.get('/collection', async (req, res) => {
    try {
        const allWatches = await getAllWatches();
        res.render('collection', { watches: allWatches });
    } catch (error) {
        handleError(res, error, 'Kon collectie niet laden');
    }
});

// Details (public)
app.get('/details/:id', async (req, res) => {
    try {
        const watchId = parseInt(req.params.id, 10);
        const watch = await getWatchById(watchId);
        if (!watch) {
            return res.status(404).render('error', {
                currentUser: res.locals.currentUser,
                message: 'Horloge niet gevonden',
                errorDetails: `Geen horloge met id ${watchId}`
            });
        }
        res.render('details', { watch });
    } catch (error) {
        handleError(res, error, 'Kon details niet laden');
    }
});

// Merken (public)
app.get('/brands', async (req, res) => {
    try {
        const brands = await getManufacturers();
        res.render('brands', { brands });
    } catch (error) {
        handleError(res, error, 'Kon merken niet laden');
    }
});

// Dashboard (beschermd)
app.get('/dashboard', ensureLoggedIn, async (req, res) => {
    try {
        const allWatches = await getAllWatches();
        res.render('collection', { watches: allWatches });
    } catch (error) {
        handleError(res, error, 'Kon dashboard niet laden');
    }
});

// EDIT: GET-form (ADMIN-only)
app.get(
    '/dashboard/edit/:id',
    ensureLoggedIn,
    ensureAdmin,
    async (req: Request, res: Response) => {
        try {
            const watchId = parseInt(req.params.id, 10);
            const watch = await getWatchById(watchId);
            if (!watch) {
                return res.status(404).render('error', {
                    currentUser: res.locals.currentUser,
                    message: 'Horloge niet gevonden',
                    errorDetails: `Geen horloge met id ${watchId}`
                });
            }
            const brands = await getManufacturers();
            res.render('edit', { watch, brands });
        } catch (error) {
            handleError(res, error, 'Kon edit-form niet laden');
        }
    }
);

// EDIT: POST-handler (ADMIN-only)
app.post(
  '/dashboard/edit/:id',
  ensureLoggedIn,
  ensureAdmin,
  async (req, res) => {
    try {
      const watchId = parseInt(req.params.id, 10);
      const {
        name,
        description,
        price,
        manufacturerId,
        isWaterResistant,
        watchType,
        features
      } = req.body;

      const brands = await getManufacturers();
      const manufacturer = brands.find(b => b.id === +manufacturerId);
      if (!manufacturer) throw new Error('Merk niet gevonden');

      await updateWatch(watchId, {
        name,
        description,
        price: parseFloat(price),
        manufacturer,
        isWaterResistant: Boolean(isWaterResistant),
        watchType,
        features: (features as string).split(',').map(f => f.trim())
      });

      res.redirect('/');
    } catch (error) {
      handleError(res, error, 'Kon wijzigingen niet opslaan');
    }
  }
);

// --- Auth Routes ---

// Login page (voor niet-ingelogden)
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { error: null, success: null, showRegister: false });
});

// Login form submission (nu redirect naar /)
app.post('/login', async (req, res) => {
    try {
        const user = await verifyUser(req.body.email, req.body.password);
        if (!user) {
            return res.render('login', { error: 'Ongeldige inloggegevens', success: null, showRegister: false });
        }
        req.session.user = user;
        res.redirect('/');
    } catch (error) {
        handleError(res, error, 'Login mislukt');
    }
});

// Register page (voor niet-ingelogden)
app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { error: null, success: null, showRegister: true });
});

// Register form submission
app.post('/register', async (req, res) => {
    try {
        const existing = await findUserByEmail(req.body.email);
        if (existing) {
            return res.render('login', {
                error: 'Email is al geregistreerd',
                success: null,
                showRegister: true
            });
        }
        await createUser({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: 'USER'
        });
        res.render('login', {
            error: null,
            success: 'Registratie gelukt! Je kunt nu inloggen',
            showRegister: false
        });
    } catch (error) {
        handleError(res, error, 'Registratie mislukt');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Error handler
function handleError(res: Response, error: unknown, message: string) {
    console.error('Error:', error);
    res.status(500).render('error', {
        currentUser: res.locals.currentUser,
        message,
        errorDetails: error instanceof Error ? error.message : String(error)
    });
}

// Server start & DB init
async function startServer() {
    try {
        await connectDB();
        await initializeDatabase();
        app.listen(process.env.PORT ?? 3000, () => {
            console.log(`🚀 Server gestart op http://localhost:${process.env.PORT ?? 3000}`);
        });
    } catch (error) {
        console.error('❌ Server initialisatie mislukt:', error);
        process.exit(1);
    }
}

startServer();
