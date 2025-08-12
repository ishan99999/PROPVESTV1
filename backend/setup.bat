@echo off
echo 🚀 Setting up PropVest Backend...
echo.

echo 📦 Installing dependencies...
call npm install

echo.
echo 🌱 Seeding database...
call npm run seed

echo.
echo ✅ Setup complete!
echo.
echo 🔑 Demo accounts created:
echo    Admin: admin@stake.com / admin123
echo    Investor: investor@stake.com / investor123
echo.
echo 🚀 Start the server with: npm run dev
echo 🌐 Server will run on: http://localhost:4000
echo 📊 Health check: http://localhost:4000/api/health
echo.
pause

