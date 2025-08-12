# 🚀 PropVest Deployment Guide

Complete guide to deploy your PropVest application to various hosting platforms.

## 🌐 GitHub Pages (Frontend Only)

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon → "New repository"
3. Name it `propvestv1` (or your preferred name)
4. Make it **Public** (required for free GitHub Pages)
5. Don't initialize with README (we already have one)
6. Click "Create repository"

### Step 2: Upload Your Code

**Option A: Using GitHub Desktop (Recommended for beginners)**
1. Download [GitHub Desktop](https://desktop.github.com/)
2. Clone your repository
3. Copy all your project files to the cloned folder
4. Commit and push changes

**Option B: Using Git commands**
```bash
# Initialize git (if not already done)
git init

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/propvestv1.git

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: PropVest real estate platform"

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch
6. Click **Save**

Your app will be available at: `https://yourusername.github.io/propvestv1`

### Step 4: Update Frontend for Backend Integration

Since GitHub Pages only hosts static files, you'll need to update your frontend to connect to your backend:

1. **Update `assets/js/app.js`**:
   ```javascript
   // Change this line:
   const API_BASE = 'http://localhost:4000';
   
   // To your backend URL:
   const API_BASE = 'https://your-backend-domain.com';
   ```

2. **Deploy your backend** (see backend deployment section below)

## 🖥️ Backend Deployment Options

### Option 1: Railway (Recommended - Free Tier)

1. Go to [Railway](https://railway.app/)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your backend repository
5. Railway will automatically detect Node.js and deploy
6. Get your deployment URL from the project dashboard

### Option 2: Render (Free Tier)

1. Go to [Render](https://render.com/)
2. Sign in with GitHub
3. Click "New" → "Web Service"
4. Connect your backend repository
5. Configure:
   - **Name**: `propvest-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click "Create Web Service"

### Option 3: Heroku (Paid)

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Create `Procfile` in backend folder:
   ```
   web: node server.js
   ```
3. Deploy:
   ```bash
   cd backend
   heroku create your-app-name
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Create account and add payment method
3. Go to "Apps" → "Create App"
4. Connect your GitHub repository
5. Select backend folder
6. Configure environment variables
7. Deploy

## 🔧 Environment Configuration

### Backend Environment Variables

Create a `.env` file in your backend folder:

```env
# Production
PORT=4000
JWT_SECRET=your-super-long-random-secret-key-here
FRONTEND_URL=https://yourusername.github.io
NODE_ENV=production

# Development
# PORT=4000
# JWT_SECRET=dev-secret-key
# FRONTEND_URL=http://localhost:3000
# NODE_ENV=development
```

### Frontend Configuration

Update your frontend to use the production backend URL:

```javascript
// In assets/js/app.js
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.com' 
  : 'http://localhost:4000';
```

## 🌍 Custom Domain Setup

### GitHub Pages with Custom Domain

1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. In your GitHub repository:
   - Go to Settings → Pages
   - Add your custom domain
   - Check "Enforce HTTPS"
3. Configure DNS with your domain provider:
   ```
   Type: CNAME
   Name: @
   Value: yourusername.github.io
   ```

### Backend with Custom Domain

1. Point your domain's A record to your backend server IP
2. Or use a subdomain (e.g., `api.yourdomain.com`)
3. Update your frontend `API_BASE` accordingly

## 📱 Mobile App Deployment

### Progressive Web App (PWA)

1. Create `manifest.json`:
   ```json
   {
     "name": "PropVest Sri Lanka",
     "short_name": "PropVest",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#059669",
     "icons": [
       {
         "src": "assets/icon-192.png",
         "sizes": "192x192",
         "type": "image/png"
       }
     ]
   }
   ```

2. Add to your HTML:
   ```html
   <link rel="manifest" href="manifest.json">
   <meta name="theme-color" content="#059669">
   ```

### React Native (Future Enhancement)

Convert your web app to React Native for mobile deployment to App Store and Google Play.

## 🔒 Security Considerations

### Production Checklist

- [ ] Change default JWT secret
- [ ] Enable HTTPS everywhere
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Set up monitoring and logging
- [ ] Regular security updates

### SSL/HTTPS

- **GitHub Pages**: Automatic HTTPS
- **Railway/Render**: Automatic HTTPS
- **Heroku**: Automatic HTTPS
- **DigitalOcean**: Manual SSL setup with Let's Encrypt

## 📊 Monitoring & Analytics

### Backend Monitoring

1. **Uptime Monitoring**: UptimeRobot, Pingdom
2. **Error Tracking**: Sentry, LogRocket
3. **Performance**: New Relic, DataDog

### Frontend Analytics

1. **Google Analytics**: Track user behavior
2. **Hotjar**: Heatmaps and user recordings
3. **Google Search Console**: SEO monitoring

## 🚀 Performance Optimization

### Frontend

1. **Image Optimization**: Use WebP format, lazy loading
2. **Code Splitting**: Load only necessary JavaScript
3. **Caching**: Set proper cache headers
4. **CDN**: Use Cloudflare or similar

### Backend

1. **Database Indexing**: If using real database
2. **Caching**: Redis for frequently accessed data
3. **Compression**: Enable gzip compression
4. **Load Balancing**: For high traffic

## 🔄 Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: .
```

### Auto-deploy Backend

Configure your hosting platform to auto-deploy on push to main branch.

## 📈 Scaling Considerations

### When to Scale

- **Users**: 100+ concurrent users
- **Data**: 10,000+ properties
- **Traffic**: 10,000+ daily requests

### Scaling Options

1. **Vertical Scaling**: Upgrade server resources
2. **Horizontal Scaling**: Add more servers
3. **Database Scaling**: Master-slave replication
4. **CDN**: Global content distribution

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**: Check backend CORS configuration
2. **JWT Issues**: Verify token expiration and secret
3. **File Uploads**: Check file size limits and permissions
4. **Database Errors**: Verify data file permissions

### Getting Help

1. Check platform-specific documentation
2. Review error logs
3. Test locally first
4. Use platform support channels

## 🎯 Next Steps

After successful deployment:

1. **Test thoroughly** on production
2. **Set up monitoring** and alerts
3. **Configure backups** for data
4. **Plan for scaling** as you grow
5. **Consider database migration** for production use

---

**Happy Deploying! 🚀**

Your PropVest platform will be live and accessible to users worldwide!

