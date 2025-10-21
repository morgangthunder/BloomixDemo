# BloomixDemo - Upora AI Lessons Platform

**Cross-platform educational platform with Netflix-style interface, Pixi.js interactions, and AI-powered lessons using xAI's Grok API.**

---

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** (required)
- **Node.js 18+** (for local development)
- **Git**

### Start the Full Stack

```powershell
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd BloomixDemo

# 2. Start all services with Docker
.\scripts\docker-dev.ps1 start

# 3. Wait 30-60 seconds for initialization

# 4. Access the application
# Frontend: http://localhost:8100
# Backend API: http://localhost:3000/api
```

### Test the Setup

```powershell
# Test API endpoints
.\scripts\test-api.ps1

# View logs
.\scripts\docker-dev.ps1 logs

# Check service status
.\scripts\docker-dev.ps1 status
```

---

## 📁 Project Structure

```
BloomixDemo/
├── Upora/                      # Main application
│   ├── frontend/               # Angular + Ionic (port 8100)
│   ├── backend/                # NestJS API (port 3000)
│   └── README.md               # Detailed app documentation
├── docker/                     # Docker configuration
│   ├── postgres/init/          # Database schema & seed data
│   ├── n8n/workflows/          # n8n workflow JSONs
│   └── README.md               # Docker setup guide
├── scripts/                    # Helper scripts
│   ├── docker-dev.ps1          # Docker management
│   ├── test-api.ps1            # API testing
│   └── README.md               # Scripts documentation
├── docker-compose.yml          # Full stack orchestration
├── .gitignore                  # Git ignore rules
├── DOCKER_SETUP_COMPLETE.md    # Docker setup summary
└── README.md                   # This file
```

---

## 🎯 What is Upora?

Upora is an **AI-powered lessons platform** that enables:

### For Students
- 📚 Browse and take interactive lessons (Netflix-style UI)
- 🎮 Engage with Pixi.js-based interactions (drag-drop, quizzes, games)
- 🤖 Chat with AI teachers powered by xAI's Grok API
- 📊 Track progress and achievements

### For Lesson Builders
- ✏️ Create lessons with stages, substages, and AI prompts
- 🎨 Choose from approved interaction types
- 📤 Submit lessons for approval
- 💰 Earn commissions based on usage

### For Interaction Builders
- 🛠️ Build Pixi.js interaction types
- ⚙️ Create n8n workflows for content processing
- 📤 Submit interactions for approval
- 💰 Earn commissions when others use your interactions

### For Enterprises
- 🔒 Private, isolated instances with multi-tenancy
- 🌐 Embeddable via Angular Elements web components
- 🔐 SSO integration (OAuth, SAML, custom JWT)
- 📈 Analytics and compliance (GDPR/CCPA)

---

## 🏗️ Architecture

### Frontend
- **Framework**: Angular 19 + Ionic 8
- **Styling**: Tailwind CSS
- **Interactions**: Pixi.js for 2D graphics
- **Real-time**: Socket.io for AI chat
- **State Management**: RxJS

### Backend
- **Framework**: NestJS (Node.js)
- **ORM**: TypeORM
- **Real-time**: Socket.io gateway
- **Authentication**: Amazon Cognito (JWT)
- **API**: RESTful with auto-documentation

### Database
- **Type**: PostgreSQL 15
- **Features**: Row-Level Security (RLS) for multi-tenancy
- **Storage**: JSONB for flexible lesson data
- **Indexing**: Optimized for fast queries

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Caching**: Redis
- **File Storage**: MinIO (local S3) / AWS S3 (prod)
- **Workflows**: n8n for content processing
- **Cloud**: AWS (ECS, RDS, S3, Cognito)

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Angular 19, Ionic 8, Tailwind CSS, Pixi.js, Socket.io Client, RxJS |
| **Backend** | NestJS, TypeORM, Socket.io, Passport JWT |
| **Database** | PostgreSQL 15, Redis 7 |
| **Storage** | MinIO (local), AWS S3 (prod) |
| **Workflows** | n8n |
| **AI** | xAI Grok API |
| **DevOps** | Docker, Docker Compose, GitHub Actions (planned), AWS |
| **Testing** | Jest, Mocha/Chai, Cypress |

---

## 📚 Documentation

- **[Upora Application README](Upora/README.md)** - Detailed app features and architecture
- **[Docker Setup Guide](docker/README.md)** - Complete Docker documentation
- **[Helper Scripts Guide](scripts/README.md)** - PowerShell scripts usage
- **[Docker Setup Complete](DOCKER_SETUP_COMPLETE.md)** - Setup summary and validation
- **[Backend README](Upora/backend/README.md)** - NestJS API documentation
- **[Frontend README](Upora/frontend/README.md)** - Angular/Ionic documentation

---

## 🎓 Development Workflow

### Daily Development

```powershell
# Morning - Start Docker services
.\scripts\docker-dev.ps1 start

# Develop with hot reload (changes auto-apply)
# - Edit Upora/frontend/src/* for frontend
# - Edit Upora/backend/src/* for backend

# View logs during development
.\scripts\docker-dev.ps1 logs

# Evening - Stop services
.\scripts\docker-dev.ps1 stop
```

### Frontend Only (without Docker)

```bash
cd Upora/frontend
npm install
npm start

# Visit: http://localhost:4200
# Uses mock data (no backend required)
```

### Backend Only (with local PostgreSQL)

```bash
cd Upora/backend
npm install
npm run start:dev

# Requires PostgreSQL running locally
# API: http://localhost:3000/api
```

---

## 🗄️ Database

### Access Database

```powershell
# Connect via helper script
.\scripts\docker-dev.ps1 db

# Or directly with psql
docker exec -it upora-postgres psql -U upora_user -d upora_dev
```

### Test Accounts

**Default Dev Tenant** (`00000000-0000-0000-0000-000000000001`):
- **Admin**: admin@upora.dev
- **Lesson Builder**: builder@upora.dev
- **Interaction Builder**: interaction@upora.dev
- **Students**: student1@upora.dev, student2@upora.dev

**Enterprise Client** (`00000000-0000-0000-0000-000000000002`):
- **Admin**: admin@clientabc.com
- **Teacher**: teacher@clientabc.com

### Sample Data

- ✅ 2 approved lessons (Python, JavaScript)
- ✅ 1 pending lesson (React)
- ✅ 1 rejected lesson (Incomplete)
- ✅ 1 approved interaction type (Drag & Drop)
- ✅ 1 pending interaction type (Quiz)
- ✅ 1 approved n8n workflow (PDF Extractor)

---

## 🧪 Testing

### Test API Endpoints

```powershell
.\scripts\test-api.ps1
```

### Run Unit Tests

```bash
# Frontend tests
cd Upora/frontend
npm test

# Backend tests
cd Upora/backend
npm test
```

### Run E2E Tests

```bash
cd Upora/frontend
npm run test:e2e
```

---

## 🚢 Deployment

### Local Development (Docker)

```powershell
.\scripts\docker-dev.ps1 start
```

### Local Development (Coolify)

- Push to GitHub
- Configure Coolify to deploy from repository
- Set environment variables in Coolify

### Production (AWS)

**Services**:
- **Frontend**: S3 + CloudFront
- **Backend**: ECS (Fargate)
- **Database**: RDS PostgreSQL
- **Storage**: S3
- **Auth**: Cognito
- **Real-time**: API Gateway WebSockets
- **Caching**: ElastiCache (Redis)

See [deployment guide](docs/DEPLOYMENT.md) (coming soon) for details.

---

## 📋 Implementation Status

### ✅ Phase 1: Docker Setup (COMPLETE)

- [x] Create docker-compose.yml
- [x] Set up PostgreSQL with RLS
- [x] Create database schema
- [x] Add seed data
- [x] Configure all services (frontend, backend, redis, minio, n8n)
- [x] Create helper scripts
- [x] Write documentation

### 🚧 Phase 2: Frontend-Backend Connection (NEXT)

- [ ] Update Angular services to use real API
- [ ] Replace mock data with HTTP calls
- [ ] Add error handling and loading states
- [ ] Test end-to-end data flow
- [ ] Implement authentication guards

### 📅 Phase 3: Real-time Features

- [ ] Set up Socket.io gateway
- [ ] Integrate Grok API
- [ ] Implement AI chat
- [ ] Add token usage tracking
- [ ] Real-time notifications

### 📅 Phase 4: Pixi.js Interactions

- [ ] Create Pixi.js renderer component
- [ ] JSON schema validator
- [ ] Sandboxed execution
- [ ] Drag-and-drop example
- [ ] Interaction-builder interface

### 📅 Phase 5: n8n Workflow Integration

- [ ] Workflow upload interface
- [ ] Webhook endpoints
- [ ] Content processing pipeline
- [ ] Workflow validation

### 📅 Phase 6: Authentication

- [ ] Amazon Cognito integration
- [ ] Login/signup pages
- [ ] JWT validation
- [ ] Role-based access control
- [ ] Auth guards

---

## 🔑 Key Features

✅ **Multi-tenancy** - Complete data isolation per client  
✅ **Approval Workflow** - All content requires admin approval  
✅ **Commission Tracking** - Usage-based earnings for creators  
✅ **Token Management** - Track Grok API usage per user  
✅ **Real-time Chat** - WebSocket-based AI teacher  
✅ **Interactive Lessons** - Pixi.js-based interactions  
✅ **Content Processing** - n8n workflow automation  
✅ **Cross-platform** - Browser, iOS, Android via Ionic  
✅ **Embeddable** - Angular Elements for enterprise  
✅ **Secure** - JWT auth, RLS, data isolation  

---

## 🐛 Troubleshooting

### Services won't start

```powershell
# Check Docker Desktop is running
docker ps

# Check service status
.\scripts\docker-dev.ps1 status

# View logs
.\scripts\docker-dev.ps1 logs
```

### Database connection errors

```powershell
# Restart backend after PostgreSQL is ready
docker-compose restart backend

# Check PostgreSQL logs
docker-compose logs postgres
```

### Full reset (clears all data)

```powershell
.\scripts\docker-dev.ps1 clean
.\scripts\docker-dev.ps1 start
```

### Port conflicts

```powershell
# Check what's using a port (e.g., 3000)
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

---

## 🔐 Security Notes

**⚠️ This is a DEVELOPMENT setup!**

- Default passwords are used (never in production!)
- JWT secret is hardcoded (use AWS Secrets Manager in prod)
- CORS is wide open (restrict in production)
- Database auto-sync enabled (disable in production)

**For Production:**
- Use proper secrets management
- Enable SSL/TLS
- Configure proper CORS
- Use AWS Cognito for auth
- Enable database migrations (no auto-sync)
- Implement rate limiting
- Add comprehensive logging (CloudWatch)

---

## 📞 Support & Resources

- **Main Documentation**: [Upora/README.md](Upora/README.md)
- **Docker Guide**: [docker/README.md](docker/README.md)
- **Scripts Guide**: [scripts/README.md](scripts/README.md)
- **Database Schema**: [docker/postgres/init/01-schema.sql](docker/postgres/init/01-schema.sql)

---

## 🤝 Contributing

1. Create a feature branch
2. Make changes with hot reload
3. Test locally with `.\scripts\test-api.ps1`
4. Run unit tests
5. Submit pull request

---

## 📄 License

Proprietary - All rights reserved

---

## 🎉 You're All Set!

Your Docker environment is ready. Start developing:

```powershell
# Start the stack
.\scripts\docker-dev.ps1 start

# Open frontend
start http://localhost:8100

# Test API
.\scripts\test-api.ps1
```

**Happy coding! 🚀**

