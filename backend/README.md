# PropVest Backend API

A robust Node.js/Express backend for the PropVest Sri Lanka real estate investment platform.

## 🚀 Features

- **JWT Authentication** - Secure user authentication and authorization
- **Role-based Access Control** - Admin and investor roles with different permissions
- **File Upload Support** - Image uploads for property listings
- **Data Persistence** - JSON file-based storage (can be easily migrated to database)
- **Input Validation** - Comprehensive request validation and sanitization
- **Security Features** - Helmet, rate limiting, CORS protection
- **RESTful API** - Clean, consistent API endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **File Upload**: Multer
- **Security**: Helmet, express-rate-limit
- **Storage**: JSON files (easily migratable to MongoDB/PostgreSQL)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the backend directory:

```env
PORT=4000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-login
SMTP_PASS=your-brevo-smtp-key
MAIL_FROM=no-reply@propvest.lk
APP_NAME=PropVest Sri Lanka
```

### 3. Seed the Database

```bash
npm run seed
```

This will create:
- Demo admin account: `admin@stake.com` / `admin123`
- Demo investor account: `investor@stake.com` / `investor123`
- Sample property listings
- Empty investments and team invites

### 4. Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:4000`

## 📚 API Documentation

### Base URL
```
http://localhost:4000/api
```

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Verify OTP
```http
POST /api/auth/verify
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "123456"
}
```

#### Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "investor",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token-here"
}
```

### Properties

#### Get All Listings
```http
GET /api/listings
```

#### Get Single Listing
```http
GET /api/listings/:id
```

#### Create/Update Listing (Admin Only)
```http
POST /api/listings
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Property Title",
  "city": "Colombo",
  "category": "Residential",
  "status": "Active",
  "minInvestment": 500000,
  "roi": 12,
  "targetAmount": 50000000,
  "totalRaised": 25000000,
  "durationMonths": 24
}
```

#### Delete Listing (Admin Only)
```http
DELETE /api/listings/:id
Authorization: Bearer <jwt-token>
```

### Investments

#### Get Investments
```http
GET /api/investments
Authorization: Bearer <jwt-token>
```

**Note:** Admins see all investments, investors see only their own.

#### Create Investment (Investor Only)
```http
POST /api/investments
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "listingId": "property-id",
  "amount": 1000000
}
```

### Team Invites

#### Get Team Invites for a Property
```http
GET /api/teams/:listingId
Authorization: Bearer <jwt-token>
```

#### Send Team Invite (Investor Only)
```http
POST /api/teams/:listingId/invite
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "email": "teammate@example.com"
}
```

#### Accept Team Invite (Investor Only)
```http
POST /api/teams/:listingId/accept
Authorization: Bearer <jwt-token>
```

### File Upload

#### Upload Image
```http
POST /api/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

image: [file]
```

**Response:**
```json
{
  "imageUrl": "/uploads/filename.jpg"
}
```

## 🔐 Authentication & Authorization

### JWT Token Usage
Include the JWT token in the Authorization header:
```http
Authorization: Bearer <your-jwt-token>
```

### Role-based Access
- **Admin**: Full access to all endpoints
- **Investor**: Limited access (can't manage properties, can invest)

### Protected Routes
Most routes require authentication. Unprotected routes:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`

## 📁 Data Storage

The backend uses JSON files for data persistence:

- `data/users.json` - User accounts
- `data/listings.json` - Property listings
- `data/investments.json` - Investment records
- `data/teamInvites.json` - Team invitation data

**Note:** This is suitable for development and small-scale production. For production, consider migrating to:
- **MongoDB** (NoSQL)
- **PostgreSQL** (SQL)
- **Redis** (caching)

## 🚀 Deployment

### Environment Variables
Set these in production:
```env
PORT=4000
JWT_SECRET=very-long-random-secret-key
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

### PM2 (Recommended for production)
```bash
npm install -g pm2
pm2 start server.js --name "propvest-backend"
pm2 startup
pm2 save
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

## 🔧 Development

### Project Structure
```
backend/
├── server.js          # Main server file
├── seed.js            # Database seeding script
├── package.json       # Dependencies
├── data/              # JSON data files
├── uploads/           # File uploads
└── README.md          # This file
```

### Adding New Routes
1. Define the route in `server.js`
2. Add validation middleware if needed
3. Implement the handler function
4. Add to appropriate role-based access control

### Testing
```bash
# Test the API endpoints
curl http://localhost:4000/api/health
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@stake.com","password":"admin123"}'
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port 4000
   lsof -i :4000
   # Kill the process
   kill -9 <PID>
   ```

2. **Permission denied on uploads folder**
   ```bash
   chmod 755 uploads/
   ```

3. **JWT token expired**
   - Re-login to get a new token
   - Tokens expire after 24 hours

### Logs
Check the console output for detailed error messages and debugging information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub

---

**Built with ❤️ for PropVest Sri Lanka**
