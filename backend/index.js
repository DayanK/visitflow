const express = require('express');
const path = require('path');
const cors = require('cors');
const graphRoutes = require('./routes/graphRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { initializeTables } = require('./services/tableStorageService');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;


const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://visitflow-sand.vercel.app',
    /https:\/\/visitflow-[a-z0-9]+-mckemajou-4370s-projects\.vercel\.app/,
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // same-origin / curl
        const ok = allowedOrigins.some(o =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        cb(ok ? null : new Error('CORS: origin not allowed'), ok);
    },
    methods: "GET, HEAD, PUT, PATCH, POST, DELETE",
    credentials: true,
}));


app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public/build')));

// Serve auth-start.html and auth-end.html
app.get('/auth-start', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auth/auth-start.html'));
});

app.get('/auth-end', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auth/auth-end.html'));
});

app.get('/auth-start-dynamics.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auth/auth-start-dynamics.html'));
});

app.get('/auth-end-dynamics.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auth/auth-end-dynamics.html'));
});


// Initialize Azure Table Storage tables on startup
initializeTables().catch((err) => console.error('Table Storage init failed:', err.message));

// API Routes
app.use('/', graphRoutes);
app.use('/api', apiRoutes);

app.get('/api/hello', (req, res) => {
    console.log("Get API running...");
    res.json({ message: 'GET api running' });
});


//Handle 404 for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
