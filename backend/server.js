const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// DB-backed helpers
async function getUserSafe(userRow) {
  if (!userRow) return null;
  const { password_hash, ...rest } = userRow;
  return {
    ...rest,
    password: undefined,
    password_hash: undefined,
    isVerified: Boolean(userRow.is_verified),
    createdAt: userRow.created_at
  };
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Validation middleware
function validateRegistration(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- Email + OTP helpers ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-brevo-smtp-login',
    pass: process.env.SMTP_PASS || 'your-brevo-smtp-key'
  }
});

const SMTP_CONFIGURED = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(toEmail, code) {
  const fromEmail = process.env.MAIL_FROM || 'no-reply@propvest.lk';
  const appName = process.env.APP_NAME || 'PropVest Sri Lanka';
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;padding:16px">
      <h2>${appName} - Email Verification</h2>
      <p>Your verification code is:</p>
      <div style="font-size:28px;font-weight:800;letter-spacing:6px;margin:16px 0">${code}</div>
      <p>This code will expire in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  if (!SMTP_CONFIGURED) {
    console.warn('[DEV] SMTP not configured. OTP for', toEmail, 'is', code);
    return; // dev no-op
  }
  await transporter.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: `${appName} - Verify your email`,
    html
  });
}

// Authentication routes
app.post('/api/auth/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    await db.createUser({ id, email, passwordHash: hash, name, role: 'investor', isVerified: 0 });
    const code = generateOtp();
    await db.saveOtp(email, code, Date.now() + 10 * 60 * 1000);
    await sendOtpEmail(email, code);
    const payload = { message: 'Registration successful. Please verify your email with the OTP sent.' };
    if (!SMTP_CONFIGURED) payload.devOtp = code;
    res.status(201).json(payload);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], validateRegistration, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_verified) return res.status(403).json({ error: 'Email not verified. Please verify with OTP.' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: await getUserSafe(user), token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 })
], validateRegistration, async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const pending = await db.getOtp(email);
    if (!pending) return res.status(400).json({ error: 'No OTP found. Please request a new code.' });
    if (pending.expires_at < Date.now()) { await db.deleteOtp(email); return res.status(400).json({ error: 'OTP expired. Please request a new code.' }); }
    if (pending.code !== code) return res.status(400).json({ error: 'Invalid OTP code' });
    await db.setUserVerified(email);
    await db.deleteOtp(email);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Email verified successfully', user: await getUserSafe({ ...user, is_verified: 1 }), token });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP
app.post('/api/auth/resend-otp', [
  body('email').isEmail().normalizeEmail()
], validateRegistration, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_verified) return res.status(400).json({ error: 'User already verified' });
    const code = generateOtp();
    await db.saveOtp(email, code, Date.now() + 10 * 60 * 1000);
    await sendOtpEmail(email, code);
    const payload = { message: 'OTP sent' };
    if (!SMTP_CONFIGURED) payload.devOtp = code;
    res.json(payload);
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Listings routes
app.get('/api/listings', async (req, res) => {
  try {
    const rows = await db.getListings();
    // map to camelCase keys for frontend
    res.json(rows.map(r => ({
      id: r.id, title: r.title, city: r.city, category: r.category, status: r.status,
      image: r.image, minInvestment: Number(r.min_investment), roi: Number(r.roi),
      targetAmount: Number(r.target_amount), totalRaised: Number(r.total_raised), durationMonths: Number(r.duration_months),
      createdAt: r.created_at
    })));
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const r = await db.getListingById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Listing not found' });
    const listing = { id: r.id, title: r.title, city: r.city, category: r.category, status: r.status, image: r.image,
      minInvestment: Number(r.min_investment), roi: Number(r.roi), targetAmount: Number(r.target_amount), totalRaised: Number(r.total_raised), durationMonths: Number(r.duration_months), createdAt: r.created_at };
    res.json(listing);
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/listings', authenticateToken, requireRole('admin'), [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('status').isIn(['Active', 'Funding', 'Coming Soon']).withMessage('Invalid status'),
  body('minInvestment').isNumeric().withMessage('Min investment must be a number'),
  body('roi').isNumeric().withMessage('ROI must be a number'),
  body('targetAmount').isNumeric().withMessage('Target amount must be a number'),
  body('totalRaised').isNumeric().withMessage('Total raised must be a number'),
  body('durationMonths').isNumeric().withMessage('Duration must be a number')
], validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const listing = {
      id: req.body.id || uuidv4(),
      title: req.body.title, city: req.body.city, category: req.body.category, status: req.body.status,
      image: req.body.image || req.body.imageUrl || '', minInvestment: Number(req.body.minInvestment), roi: Number(req.body.roi),
      targetAmount: Number(req.body.targetAmount), totalRaised: Number(req.body.totalRaised), durationMonths: Number(req.body.durationMonths), createdAt: new Date()
    };
    await db.upsertListing(listing);
    res.json(listing);
  } catch (error) {
    console.error('Error saving listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/listings/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.deleteListing(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Investments routes
app.get('/api/investments', authenticateToken, async (req, res) => {
  try {
    const user = { id: req.user.id, email: req.user.email };
    const rows = await db.getInvestmentsForUser(user, req.user.role === 'admin');
    res.json(rows.map(r => ({ id: r.id, listingId: r.listing_id, amount: Number(r.amount), userId: r.user_id, date: r.date })));
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/investments', authenticateToken, requireRole('investor'), [
  body('listingId').notEmpty().withMessage('Listing ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
], validateRegistration, async (req, res) => {
  try {
    const { listingId, amount } = req.body;
    const listing = await db.getListingById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'Active') return res.status(400).json({ error: 'Can only invest in active listings' });
    if (Number(amount) < Number(listing.min_investment)) return res.status(400).json({ error: 'Amount below minimum investment' });
    if (Number(listing.total_raised) + Number(amount) > Number(listing.target_amount)) return res.status(400).json({ error: 'Amount exceeds remaining target' });
    const inv = { id: uuidv4(), userId: req.user.id, listingId, amount: Number(amount), date: new Date() };
    await db.createInvestment(inv);
    await db.incrementListingRaised(listingId, Number(amount));
    res.status(201).json({ id: inv.id, listingId: inv.listingId, amount: inv.amount, userId: inv.userId, date: inv.date });
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Team invites routes
app.get('/api/teams/:listingId', authenticateToken, async (req, res) => {
  try {
    const invites = await db.getTeamInvites(req.params.listingId);
    res.json(invites.map(i => ({ id: i.id, email: i.email, status: i.status, date: i.date })));
  } catch (error) {
    console.error('Error fetching team invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/teams/:listingId/invite', authenticateToken, requireRole('investor'), [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], validateRegistration, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { email } = req.body;
    const listing = await db.getListingById(listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const invite = { id: uuidv4(), listingId, email, status: 'Pending', date: new Date() };
    await db.addTeamInvite(invite);
    res.status(201).json(invite);
  } catch (error) {
    console.error('Error sending team invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/teams/:listingId/accept', authenticateToken, requireRole('investor'), async (req, res) => {
  try {
    const { listingId } = req.params;
    await db.acceptTeamInvite(listingId, req.user.email);
    res.json({ message: 'Invite accepted' });
  } catch (error) {
    console.error('Error accepting team invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File upload route
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize and start server
(async () => {
  try {
    await db.ensureSchema();
    await db.seedIfEmpty({ uuid: uuidv4, bcrypt });
    app.listen(PORT, () => {
      console.log(`🚀 PropVest Backend running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();


