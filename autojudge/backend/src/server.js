require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');
const testRoutes = require('./routes/tests');
const reportRoutes = require('./routes/reports');
const practiceRoutes = require('./routes/practice');
const notificationRoutes = require('./routes/notifications');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

require('./config/passport');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join-room', (userId) => { socket.join(userId); logger.info(`User ${userId} joined socket room`); });
  socket.on('disconnect', () => {});
});

connectDB();

// CORS configuration with better origin handling
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [corsOrigin, 'http://localhost:3000', 'http://localhost:3001'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in production for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 15 });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false, saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24*60*60*1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), version: '2.0.0' }));

// Public platform stats (no auth required)
app.get('/api/stats', async (req, res) => {
  try {
    const User = require('./models/User');
    const Submission = require('./models/Submission');
    const Practice = require('./models/Practice');
    const [students, submissions, problems, languages] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Submission.countDocuments(),
      Practice.countDocuments(),
      Submission.distinct('language')
    ]);
    res.json({ success: true, stats: { students, submissions, problems, languages: languages.length } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`AutoJudge v2 running on port ${PORT}`));
module.exports = { app, io };
