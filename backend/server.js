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

// Data storage (in production, use a real database)
let users = [];
let listings = [];
let investments = [];
let teamInvites = {};
let pendingOtps = {}; // email -> { code, expiresAt }

// Load data from files if they exist
const dataDir = 'data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadData() {
  try {
    if (fs.existsSync('data/users.json')) {
      users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));
    }
    if (fs.existsSync('data/listings.json')) {
      listings = JSON.parse(fs.readFileSync('data/listings.json', 'utf8'));
    }
    if (fs.existsSync('data/investments.json')) {
      investments = JSON.parse(fs.readFileSync('data/investments.json', 'utf8'));
    }
    if (fs.existsSync('data/teamInvites.json')) {
      teamInvites = JSON.parse(fs.readFileSync('data/teamInvites.json', 'utf8'));
    }
    if (fs.existsSync('data/pendingOtps.json')) {
      pendingOtps = JSON.parse(fs.readFileSync('data/pendingOtps.json', 'utf8'));
    }
  } catch (error) {
    console.log('No existing data found, starting fresh');
  }
}

function saveData() {
  try {
    fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
    fs.writeFileSync('data/listings.json', JSON.stringify(listings, null, 2));
    fs.writeFileSync('data/investments.json', JSON.stringify(investments, null, 2));
    fs.writeFileSync('data/teamInvites.json', JSON.stringify(teamInvites, null, 2));
    fs.writeFileSync('data/pendingOtps.json', JSON.stringify(pendingOtps, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Seed initial data
function seedData() {
  if (users.length === 0) {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    const investorPassword = bcrypt.hashSync('investor123', 10);
    
    users = [
      {
        id: uuidv4(),
        email: 'admin@stake.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        isVerified: true,
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        email: 'investor@stake.com',
        password: investorPassword,
        name: 'Demo Investor',
        role: 'investor',
        isVerified: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  if (listings.length === 0) {
    listings = [
      {
        id: 'colombo-sky-1',
        title: 'Colombo Sky Residences',
        city: 'Colombo',
        category: 'Residential',
        status: 'Active',
        image: 'https://images.unsplash.com/photo-1600585154340-1e9a27f926c3?q=80&w=1200&auto=format&fit=crop',
        minInvestment: 500000,
        roi: 12,
        targetAmount: 50000000,
        totalRaised: 25000000,
        durationMonths: 24,
        createdAt: new Date().toISOString()
      },
      {
        id: 'galle-heritage-1',
        title: 'Galle Heritage Hotel',
        city: 'Galle',
        category: 'Hospitality',
        status: 'Active',
        image: 'https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop',
        minInvestment: 750000,
        roi: 15,
        targetAmount: 75000000,
        totalRaised: 45000000,
        durationMonths: 36,
        createdAt: new Date().toISOString()
      },
      {
        id: 'kandy-hills-1',
        title: 'Kandy Hills Apartments',
        city: 'Kandy',
        category: 'Residential',
        status: 'Funding',
        image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',
        minInvestment: 600000,
        roi: 11,
        targetAmount: 60000000,
        totalRaised: 30000000,
        durationMonths: 30,
        createdAt: new Date().toISOString()
      }
    ];
  }

  saveData();
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
], validateRegistration, (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create unverified user
    const user = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role: 'investor',
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Generate and send OTP
    const code = generateOtp();
    pendingOtps[email] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    saveData();

    sendOtpEmail(email, code)
      .then(() => {
        const payload = { message: 'Registration successful. Please verify your email with the OTP sent.' };
        if (!SMTP_CONFIGURED) payload.devOtp = code;
        res.status(201).json(payload);
      })
      .catch((err) => {
        console.error('Failed to send OTP email:', err);
        const payload = { message: 'Registration successful. Failed to send OTP email. Please use resend endpoint.' };
        if (!SMTP_CONFIGURED) payload.devOtp = code;
        res.status(201).json(payload);
      });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], validateRegistration, (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified. Please verify with OTP.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify', [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 })
], validateRegistration, (req, res) => {
  try {
    const { email, code } = req.body;
    const pending = pendingOtps[email];
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!pending) {
      return res.status(400).json({ error: 'No OTP found. Please request a new code.' });
    }
    if (pending.expiresAt < Date.now()) {
      delete pendingOtps[email];
      saveData();
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }
    if (pending.code !== code) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }
    user.isVerified = true;
    delete pendingOtps[email];
    saveData();

    const { password: _, ...userResponse } = user;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ message: 'Email verified successfully', user: userResponse, token });
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
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: 'User already verified' });
    }
    const code = generateOtp();
    pendingOtps[email] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    saveData();
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
app.get('/api/listings', (req, res) => {
  try {
    res.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/listings/:id', (req, res) => {
  try {
    const listing = listings.find(l => l.id === req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
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
], validateRegistration, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const listing = {
      id: req.body.id || uuidv4(),
      ...req.body,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    const existingIndex = listings.findIndex(l => l.id === listing.id);
    if (existingIndex >= 0) {
      listings[existingIndex] = listing;
    } else {
      listings.push(listing);
    }

    saveData();
    res.json(listing);
  } catch (error) {
    console.error('Error saving listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/listings/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const index = listings.findIndex(l => l.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    listings.splice(index, 1);
    saveData();
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Investments routes
app.get('/api/investments', authenticateToken, (req, res) => {
  try {
    if (req.user.role === 'admin') {
      res.json(investments);
    } else {
      const userInvestments = investments.filter(i => i.userEmail === req.user.email);
      res.json(userInvestments);
    }
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/investments', authenticateToken, requireRole('investor'), [
  body('listingId').notEmpty().withMessage('Listing ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
], validateRegistration, (req, res) => {
  try {
    const { listingId, amount } = req.body;

    // Find listing
    const listing = listings.find(l => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'Active') {
      return res.status(400).json({ error: 'Can only invest in active listings' });
    }

    if (amount < listing.minInvestment) {
      return res.status(400).json({ error: 'Amount below minimum investment' });
    }

    if (listing.totalRaised + amount > listing.targetAmount) {
      return res.status(400).json({ error: 'Amount exceeds remaining target' });
    }

    // Create investment
    const investment = {
      id: uuidv4(),
      listingId,
      amount,
      userEmail: req.user.email,
      date: new Date().toISOString()
    };

    investments.push(investment);

    // Update listing
    listing.totalRaised += amount;
    if (listing.totalRaised >= listing.targetAmount) {
      listing.status = 'Funding';
    }

    saveData();
    res.status(201).json(investment);
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Team invites routes
app.get('/api/teams/:listingId', authenticateToken, (req, res) => {
  try {
    const invites = teamInvites[req.params.listingId] || [];
    res.json(invites);
  } catch (error) {
    console.error('Error fetching team invites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/teams/:listingId/invite', authenticateToken, requireRole('investor'), [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required')
], validateRegistration, (req, res) => {
  try {
    const { listingId } = req.params;
    const { email } = req.body;

    // Check if listing exists
    const listing = listings.find(l => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Initialize team invites for this listing if not exists
    if (!teamInvites[listingId]) {
      teamInvites[listingId] = [];
    }

    // Check if invite already exists
    if (teamInvites[listingId].find(i => i.email === email)) {
      return res.status(400).json({ error: 'Invite already sent to this email' });
    }

    const invite = {
      id: uuidv4(),
      email,
      status: 'Pending',
      date: new Date().toISOString()
    };

    teamInvites[listingId].push(invite);
    saveData();

    res.status(201).json(invite);
  } catch (error) {
    console.error('Error sending team invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/teams/:listingId/accept', authenticateToken, requireRole('investor'), (req, res) => {
  try {
    const { listingId } = req.params;
    const invites = teamInvites[listingId] || [];
    const invite = invites.find(i => i.email === req.user.email);

    if (!invite) {
      return res.status(404).json({ error: 'No invite found for this user' });
    }

    invite.status = 'Accepted';
    saveData();

    res.json(invite);
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
loadData();
seedData();

app.listen(PORT, () => {
  console.log(`🚀 PropVest Backend running on port ${PORT}`);
  console.log(`📊 Loaded ${users.length} users, ${listings.length} listings`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 Data directory: ${path.resolve(dataDir)}`);
});


