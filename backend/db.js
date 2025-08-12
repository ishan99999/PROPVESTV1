const mysql = require('mysql2/promise');

const {
  MYSQL_HOST = 'localhost',
  MYSQL_PORT = '3306',
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = '',
  MYSQL_DATABASE = 'propvest'
} = process.env;

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  connectionLimit: 10,
  dateStrings: true
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function ensureSchema() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin','investor') NOT NULL DEFAULT 'investor',
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL
  )`);
  await query(`CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    status ENUM('Active','Funding','Coming Soon') NOT NULL,
    image TEXT NOT NULL,
    min_investment BIGINT NOT NULL,
    roi DECIMAL(5,2) NOT NULL,
    target_amount BIGINT NOT NULL,
    total_raised BIGINT NOT NULL,
    duration_months INT NOT NULL,
    created_at DATETIME NOT NULL
  )`);
  await query(`CREATE TABLE IF NOT EXISTS investments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(64) NOT NULL,
    amount BIGINT NOT NULL,
    date DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
  )`);
  await query(`CREATE TABLE IF NOT EXISTS team_invites (
    id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('Pending','Accepted') NOT NULL DEFAULT 'Pending',
    date DATETIME NOT NULL,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
  )`);
  await query(`CREATE TABLE IF NOT EXISTS pending_otps (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    expires_at BIGINT NOT NULL
  )`);
}

async function seedIfEmpty({ uuid, bcrypt }) {
  const users = await query('SELECT COUNT(*) as c FROM users');
  if (users[0].c === 0) {
    const adminId = uuid();
    const investorId = uuid();
    await query('INSERT INTO users (id,email,password_hash,name,role,is_verified,created_at) VALUES (?,?,?,?,?,?,?)', [
      adminId, 'admin@stake.com', bcrypt.hashSync('admin123', 10), 'Admin User', 'admin', 1, new Date()
    ]);
    await query('INSERT INTO users (id,email,password_hash,name,role,is_verified,created_at) VALUES (?,?,?,?,?,?,?)', [
      investorId, 'investor@stake.com', bcrypt.hashSync('investor123', 10), 'Demo Investor', 'investor', 1, new Date()
    ]);
  }
  const listings = await query('SELECT COUNT(*) as c FROM listings');
  if (listings[0].c === 0) {
    const now = new Date();
    await query('INSERT INTO listings (id,title,city,category,status,image,min_investment,roi,target_amount,total_raised,duration_months,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
      'colombo-sky-1','Colombo Sky Residences','Colombo','Residential','Active','https://images.unsplash.com/photo-1600585154340-1e9a27f926c3?q=80&w=1200&auto=format&fit=crop',500000,12,50000000,25000000,24, now
    ]);
    await query('INSERT INTO listings (id,title,city,category,status,image,min_investment,roi,target_amount,total_raised,duration_months,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
      'galle-heritage-1','Galle Heritage Hotel','Galle','Hospitality','Active','https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop',750000,15,75000000,45000000,36, now
    ]);
    await query('INSERT INTO listings (id,title,city,category,status,image,min_investment,roi,target_amount,total_raised,duration_months,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
      'kandy-hills-1','Kandy Hills Apartments','Kandy','Residential','Funding','https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',600000,11,60000000,30000000,30, now
    ]);
  }
}

// Users
async function getUserByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE email=?', [email]);
  return rows[0] || null;
}
async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id=?', [id]);
  return rows[0] || null;
}
async function createUser({ id, email, passwordHash, name, role = 'investor', isVerified = 0 }) {
  await query('INSERT INTO users (id,email,password_hash,name,role,is_verified,created_at) VALUES (?,?,?,?,?,?,?)', [
    id, email, passwordHash, name, role, isVerified ? 1 : 0, new Date()
  ]);
  return getUserById(id);
}
async function setUserVerified(email) {
  await query('UPDATE users SET is_verified=1 WHERE email=?', [email]);
}

// OTPs
async function saveOtp(email, code, expiresAt) {
  await query('REPLACE INTO pending_otps (email, code, expires_at) VALUES (?,?,?)', [email, code, expiresAt]);
}
async function getOtp(email) {
  const rows = await query('SELECT * FROM pending_otps WHERE email=?', [email]);
  return rows[0] || null;
}
async function deleteOtp(email) {
  await query('DELETE FROM pending_otps WHERE email=?', [email]);
}

// Listings
async function getListings() { return query('SELECT * FROM listings ORDER BY created_at DESC'); }
async function getListingById(id) {
  const rows = await query('SELECT * FROM listings WHERE id=?', [id]);
  return rows[0] || null;
}
async function upsertListing(l) {
  await query(`REPLACE INTO listings (id,title,city,category,status,image,min_investment,roi,target_amount,total_raised,duration_months,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [
    l.id, l.title, l.city, l.category, l.status, l.image, l.minInvestment, l.roi, l.targetAmount, l.totalRaised, l.durationMonths, l.createdAt || new Date()
  ]);
}
async function deleteListing(id) { await query('DELETE FROM listings WHERE id=?', [id]); }
async function incrementListingRaised(id, amount) { await query('UPDATE listings SET total_raised = total_raised + ? WHERE id=?', [amount, id]); }

// Investments
async function getInvestmentsForUser(user, isAdmin) {
  if (isAdmin) return query('SELECT * FROM investments ORDER BY date DESC');
  return query('SELECT * FROM investments WHERE user_id=? ORDER BY date DESC', [user.id]);
}
async function createInvestment({ id, userId, listingId, amount, date }) {
  await query('INSERT INTO investments (id,user_id,listing_id,amount,date) VALUES (?,?,?,?,?)', [id, userId, listingId, amount, date]);
}

// Team invites
async function getTeamInvites(listingId) { return query('SELECT * FROM team_invites WHERE listing_id=? ORDER BY date DESC', [listingId]); }
async function addTeamInvite({ id, listingId, email, status, date }) {
  await query('INSERT INTO team_invites (id,listing_id,email,status,date) VALUES (?,?,?,?,?)', [id, listingId, email, status, date]);
}
async function acceptTeamInvite(listingId, email) {
  await query('UPDATE team_invites SET status="Accepted" WHERE listing_id=? AND email=?', [listingId, email]);
}

module.exports = {
  pool, query, ensureSchema, seedIfEmpty,
  getUserByEmail, getUserById, createUser, setUserVerified,
  saveOtp, getOtp, deleteOtp,
  getListings, getListingById, upsertListing, deleteListing, incrementListingRaised,
  getInvestmentsForUser, createInvestment,
  getTeamInvites, addTeamInvite, acceptTeamInvite
};