const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Sample data
const users = [
  {
    id: uuidv4(),
    email: 'admin@stake.com',
    password: bcrypt.hashSync('admin123', 10),
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    email: 'investor@stake.com',
    password: bcrypt.hashSync('investor123', 10),
    name: 'Demo Investor',
    role: 'investor',
    createdAt: new Date().toISOString()
  }
];

const listings = [
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
  },
  {
    id: 'nuwara-eliya-tea-1',
    title: 'Nuwara Eliya Tea Estate Resort',
    city: 'Nuwara Eliya',
    category: 'Hospitality',
    status: 'Coming Soon',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
    minInvestment: 1000000,
    roi: 18,
    targetAmount: 100000000,
    totalRaised: 0,
    durationMonths: 48,
    createdAt: new Date().toISOString()
  },
  {
    id: 'trincomalee-marina-1',
    title: 'Trincomalee Marina Complex',
    city: 'Trincomalee',
    category: 'Commercial',
    status: 'Active',
    image: 'https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop',
    minInvestment: 800000,
    roi: 14,
    targetAmount: 80000000,
    totalRaised: 35000000,
    durationMonths: 42,
    createdAt: new Date().toISOString()
  }
];

const investments = [];
const teamInvites = {};

// Create data directory if it doesn't exist
const dataDir = 'data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Save data to files
try {
  fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
  fs.writeFileSync('data/listings.json', JSON.stringify(listings, null, 2));
  fs.writeFileSync('data/investments.json', JSON.stringify(investments, null, 2));
  fs.writeFileSync('data/teamInvites.json', JSON.stringify(teamInvites, null, 2));
  
  console.log('✅ Database seeded successfully!');
  console.log(`📊 Created ${users.length} users`);
  console.log(`🏠 Created ${listings.length} listings`);
  console.log(`💰 Created ${investments.length} investments`);
  console.log(`👥 Created ${Object.keys(teamInvites).length} team invite groups`);
  console.log('\n🔑 Demo Accounts:');
  console.log('   Admin: admin@stake.com / admin123');
  console.log('   Investor: investor@stake.com / investor123');
} catch (error) {
  console.error('❌ Error seeding database:', error);
}

