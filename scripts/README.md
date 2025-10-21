# Upora Helper Scripts

PowerShell scripts to manage the Upora development environment.

## 📝 Available Scripts

### `docker-dev.ps1` - Docker Management

Main script for managing Docker containers.

**Usage:**
```powershell
.\scripts\docker-dev.ps1 <command>
```

**Commands:**

| Command | Description |
|---------|-------------|
| `start` | Start all services (default) |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `logs` | View logs (follow mode) |
| `status` | Show service status |
| `clean` | Remove all containers and volumes |
| `rebuild` | Rebuild and restart all containers |
| `db` | Connect to PostgreSQL database |

**Examples:**

```powershell
# Start all services
.\scripts\docker-dev.ps1 start

# View logs
.\scripts\docker-dev.ps1 logs

# Connect to database
.\scripts\docker-dev.ps1 db

# Clean everything and start fresh
.\scripts\docker-dev.ps1 clean
.\scripts\docker-dev.ps1 start
```

### `test-api.ps1` - API Testing

Test API endpoints to verify backend is working.

**Usage:**
```powershell
.\scripts\test-api.ps1
```

Tests:
- Health check endpoint
- Users endpoint
- Lessons endpoint (approved)
- Specific lesson retrieval

**Example Output:**
```
🧪 Testing Upora API Endpoints
==============================

Testing: Health Check
URL: http://localhost:3000/api/health
✅ SUCCESS - Status: 200

Testing: Get Users
URL: http://localhost:3000/api/users
✅ SUCCESS - Status: 200

...
```

## 🚀 Quick Start Workflow

### First Time Setup

1. **Start Docker Desktop**

2. **Start all services:**
   ```powershell
   .\scripts\docker-dev.ps1 start
   ```

3. **Wait for services to initialize** (about 30 seconds)

4. **Test the API:**
   ```powershell
   .\scripts\test-api.ps1
   ```

5. **Open the frontend:**
   - Browser: http://localhost:8100

### Daily Development

```powershell
# Start the stack
.\scripts\docker-dev.ps1 start

# View logs while developing
.\scripts\docker-dev.ps1 logs

# When done for the day
.\scripts\docker-dev.ps1 stop
```

### Troubleshooting

```powershell
# Check service status
.\scripts\docker-dev.ps1 status

# Restart everything
.\scripts\docker-dev.ps1 restart

# Full reset (clears database)
.\scripts\docker-dev.ps1 clean
.\scripts\docker-dev.ps1 start
```

## 🗄️ Database Access

### Connect via Script

```powershell
.\scripts\docker-dev.ps1 db
```

### Useful SQL Queries

```sql
-- View all tables
\dt

-- Get approved lessons
SELECT id, title, status FROM lessons WHERE status = 'approved';

-- Get all users
SELECT id, email, role FROM users;

-- Get lesson usage stats
SELECT * FROM user_earnings;

-- Exit
\q
```

## 📦 Service URLs

After starting with `docker-dev.ps1 start`:

- **Frontend**: http://localhost:8100
- **Backend API**: http://localhost:3000/api
- **Backend Health**: http://localhost:3000/api/health
- **PostgreSQL**: localhost:5432
  - Database: `upora_dev`
  - User: `upora_user`
  - Password: `upora_password`
- **Redis**: localhost:6379
- **MinIO Console**: http://localhost:9001
  - User: `minioadmin`
  - Password: `minioadmin`
- **n8n**: http://localhost:5678
  - User: `admin`
  - Password: `admin123`

## 🔧 Advanced Usage

### View Specific Service Logs

```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Restart Single Service

```powershell
docker-compose restart backend
```

### Execute Commands in Containers

```powershell
# Backend shell
docker exec -it upora-backend sh

# Frontend shell
docker exec -it upora-frontend sh

# Database shell
docker exec -it upora-postgres sh
```

### Check Container Health

```powershell
docker ps
docker inspect upora-backend
```

## 🐛 Common Issues

### Port Already in Use

```powershell
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change the port in docker-compose.yml
```

### Database Connection Failed

```powershell
# Check if PostgreSQL is healthy
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart backend after PostgreSQL is ready
docker-compose restart backend
```

### Services Not Starting

```powershell
# Check Docker Desktop is running
docker ps

# View all logs
docker-compose logs

# Rebuild everything
.\scripts\docker-dev.ps1 rebuild
```

### Clear Everything and Start Fresh

```powershell
# This will delete all data!
.\scripts\docker-dev.ps1 clean
.\scripts\docker-dev.ps1 start
```

## 📚 Additional Resources

- [Docker Setup README](../docker/README.md)
- [Main Project README](../Upora/README.md)
- [Backend README](../Upora/backend/README.md)
- [Frontend README](../Upora/frontend/README.md)

## 🤝 Contributing

When creating new scripts:

1. Use PowerShell for Windows compatibility
2. Add error handling
3. Provide clear output messages
4. Document in this README
5. Test on a clean system

