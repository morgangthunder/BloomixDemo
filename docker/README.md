# Docker Setup for Upora AI Lessons Platform

This directory contains Docker configuration files for running the full Upora stack locally.

## 📁 Directory Structure

```
/docker
├── /postgres
│   └── /init
│       ├── 01-schema.sql      # Database schema with RLS
│       └── 02-seed-data.sql   # Seed data with test users & lessons
├── /n8n
│   └── /workflows             # n8n workflow JSON files
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** installed and running
- **Git** for version control
- **Node.js 18+** (for local development without Docker)

### Start All Services

From the project root (`BloomixDemo/`):

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Access Services

Once running, access these URLs:

- **Frontend**: http://localhost:8100
- **Backend API**: http://localhost:3000/api
- **PostgreSQL**: localhost:5432
  - Database: `upora_dev`
  - User: `upora_user`
  - Password: `upora_password`
- **Redis**: localhost:6379
- **MinIO (S3)**: http://localhost:9000
  - Console: http://localhost:9001
  - User: `minioadmin`
  - Password: `minioadmin`
- **n8n**: http://localhost:5678
  - User: `admin`
  - Password: `admin123`

### Stop All Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

## 🗄️ Database

### Schema

The database schema is automatically created on first run via:
- `01-schema.sql` - Creates tables, indexes, RLS policies, views, functions
- `02-seed-data.sql` - Inserts test data for development

### Test Accounts

**Tenant 1 (Default Dev Tenant)**
- **Admin**: admin@upora.dev / (no password in dev)
- **Lesson Builder**: builder@upora.dev
- **Interaction Builder**: interaction@upora.dev
- **Students**: student1@upora.dev, student2@upora.dev

**Tenant 2 (Enterprise Client)**
- **Admin**: admin@clientabc.com
- **Teacher**: teacher@clientabc.com

### Connect to Database

```bash
# Using psql
docker exec -it upora-postgres psql -U upora_user -d upora_dev

# View all tables
\dt

# Query approved lessons
SELECT id, title, status FROM lessons WHERE status = 'approved';

# Exit psql
\q
```

### Reset Database

```bash
# Stop services and remove volumes
docker-compose down -v

# Start fresh (will recreate database with seed data)
docker-compose up -d
```

## 🔧 Development Workflow

### Hot Reload

Both frontend and backend have hot reload enabled:

- **Backend**: NestJS watches `/app/src` for changes
- **Frontend**: Angular dev server watches `/app/src` for changes

Changes to your local files will automatically rebuild in the containers.

### Rebuild Containers

If you change dependencies or Dockerfiles:

```bash
# Rebuild and restart
docker-compose up --build

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 📦 Services

### Frontend (Angular + Ionic)

- **Port**: 8100
- **Source**: `./Upora/frontend`
- **Hot reload**: Yes
- **Environment**: Development

### Backend (NestJS)

- **Port**: 3000
- **Source**: `./Upora/backend`
- **Hot reload**: Yes
- **Environment**: Development
- **Health check**: http://localhost:3000/api/health

### PostgreSQL

- **Port**: 5432
- **Database**: upora_dev
- **User**: upora_user
- **Password**: upora_password
- **Data persistence**: Volume `postgres-data`

### Redis

- **Port**: 6379
- **Purpose**: Caching and queues
- **Data persistence**: Volume `redis-data`

### MinIO (Local S3)

- **API Port**: 9000
- **Console Port**: 9001
- **Access Key**: minioadmin
- **Secret Key**: minioadmin
- **Bucket**: upora-uploads (auto-created)
- **Data persistence**: Volume `minio-data`

### n8n (Workflow Automation)

- **Port**: 5678
- **User**: admin
- **Password**: admin123
- **Purpose**: Content processing workflows
- **Data persistence**: Volume `n8n-data`

## 🧪 Testing

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Get approved lessons (requires tenant header)
curl -H "x-tenant-id: 00000000-0000-0000-0000-000000000001" \
     http://localhost:3000/api/lessons?status=approved

# Get all users
curl -H "x-tenant-id: 00000000-0000-0000-0000-000000000001" \
     http://localhost:3000/api/users
```

### Test Frontend

Open http://localhost:8100 in your browser

## 🐛 Troubleshooting

### Services won't start

```bash
# Check if ports are already in use
netstat -ano | findstr :3000
netstat -ano | findstr :5432

# Check Docker Desktop is running
docker ps

# Check service status
docker-compose ps
```

### Database connection errors

```bash
# Check if PostgreSQL is ready
docker-compose logs postgres

# Restart backend after PostgreSQL is ready
docker-compose restart backend
```

### Frontend can't connect to backend

Check CORS settings in `backend/src/main.ts` and environment variables.

### Clear all data and start fresh

```bash
docker-compose down -v
docker-compose up -d
```

## 🔐 Security Notes

**⚠️ This is a DEVELOPMENT setup only!**

- Default passwords are used (change in production)
- CORS is wide open for local development
- JWT secret is hardcoded (use proper secrets in production)
- Database synchronize is enabled (don't use in production)
- MinIO has public bucket access (for development ease)

**For Production:**
- Use AWS Cognito for authentication
- Use AWS RDS for PostgreSQL
- Use AWS S3 for storage
- Use proper secrets management (AWS Secrets Manager)
- Enable proper CORS restrictions
- Disable database synchronize
- Use proper SSL/TLS certificates

## 📚 Next Steps

1. **Start the stack**: `docker-compose up -d`
2. **Check logs**: `docker-compose logs -f`
3. **Access frontend**: http://localhost:8100
4. **Test API**: http://localhost:3000/api/health
5. **View database**: Connect with psql or pgAdmin
6. **Create n8n workflows**: http://localhost:5678

## 🔗 Related Documentation

- [Main README](../Upora/README.md)
- [Backend README](../Upora/backend/README.md)
- [Frontend README](../Upora/frontend/README.md)
- [PostgreSQL Schema](./postgres/init/01-schema.sql)
- [Seed Data](./postgres/init/02-seed-data.sql)

## 📝 Environment Variables

See `.env.example` in the project root for all configuration options.

Key variables:
- `DATABASE_HOST` - PostgreSQL host
- `DATABASE_USER` - Database user
- `DATABASE_PASSWORD` - Database password
- `S3_ENDPOINT` - MinIO/S3 endpoint
- `N8N_WEBHOOK_URL` - n8n webhook base URL
- `JWT_SECRET` - JWT signing secret
- `GROK_API_KEY` - xAI Grok API key

## 🤝 Contributing

When making changes to Docker configuration:

1. Test locally with `docker-compose up --build`
2. Verify all services start successfully
3. Test frontend-backend communication
4. Check database migrations apply correctly
5. Update this README if needed

