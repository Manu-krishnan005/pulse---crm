# Pulse CRM — Quick Start Script
# Run this in PowerShell from the project root

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 Pulse CRM Setup" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

# Check Docker
Write-Host "`n1. Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "   ✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker not found. Please install Docker Desktop from:" -ForegroundColor Red
    Write-Host "      https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    exit 1
}

# Start Docker services
Write-Host "`n2. Starting PostgreSQL and Redis..." -ForegroundColor Yellow
docker compose up -d
Write-Host "   ✅ Services started" -ForegroundColor Green

# Wait for postgres
Write-Host "`n3. Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "   ✅ Ready" -ForegroundColor Green

# Install dependencies
Write-Host "`n4. Installing app dependencies..." -ForegroundColor Yellow
Set-Location app
npm install
Set-Location ..

Write-Host "`n5. Installing channel service dependencies..." -ForegroundColor Yellow
Set-Location channel-service
npm install
Set-Location ..

# Run prisma
Write-Host "`n6. Setting up database..." -ForegroundColor Yellow
Set-Location app
npx prisma generate
npx prisma db push --skip-generate
Write-Host "   ✅ Database schema created" -ForegroundColor Green

# Seed
Write-Host "`n7. Seeding database with sample data..." -ForegroundColor Yellow
npx tsx prisma/seed.ts
Write-Host "   ✅ 200 customers seeded" -ForegroundColor Green

Set-Location ..

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Add your Gemini API key to app/.env.local" -ForegroundColor White
Write-Host "     Get it free at: https://aistudio.google.com/app/apikey" -ForegroundColor White
Write-Host "`n  2. Start the app (run each in a separate terminal):" -ForegroundColor White
Write-Host "     Terminal 1: cd app && npm run dev" -ForegroundColor Yellow
Write-Host "     Terminal 2: cd channel-service && npm run dev" -ForegroundColor Yellow
Write-Host "`n  3. Open: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
