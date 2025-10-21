# Upora - AI-Powered Lessons Platform

Cross-platform educational platform with Netflix-style interface, Pixi.js interactions, and AI-powered lessons using xAI's Grok API.

## 🏗️ Project Structure

```
/Upora
├── /frontend          # Angular + Ionic web/mobile app
├── /backend           # NestJS API server
├── /shared (coming)   # Shared TypeScript types
├── docker-compose.yml # Full stack orchestration
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop
- Git

### Run Frontend Only (with mock data)
```bash
cd frontend
npm install
npm start
```
Visit: http://localhost:4200

### Run Full Stack (with backend + database)

**Using Docker Helper Script (Recommended):**
```powershell
# Start all services
.\scripts\docker-dev.ps1 start

# View logs
.\scripts\docker-dev.ps1 logs

# Stop services
.\scripts\docker-dev.ps1 stop
```

**Using Docker Compose Directly:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:8100
- Backend: http://localhost:3000/api
- PostgreSQL: localhost:5432
- MinIO Console: http://localhost:9001
- n8n: http://localhost:5678

See [Docker Setup Guide](../docker/README.md) for more details.

## 📱 Frontend (Angular + Ionic)

**Technology**: Angular 19, Ionic 8, Tailwind CSS

**Features**:
- Netflix-style lesson browser
- Lesson viewer with Pixi.js interactions
- AI chat interface (Grok-powered)
- Lesson Builder with approval workflow
- Interaction Builder with code editor
- User profiles with earnings tracking
- Cross-platform (Browser, iOS, Android)

**Development**:
```bash
cd frontend
npm install
npm start              # Development server
npm run build          # Production build
npm run test           # Run tests
```

**Platforms**:
- **Browser**: `npm start` → http://localhost:4200
- **iOS**: `ionic cap run ios` (requires Xcode)
- **Android**: `ionic cap run android` (requires Android Studio)

## 🔧 Backend (NestJS)

**Technology**: NestJS, TypeORM, PostgreSQL, Socket.io

**Features**:
- RESTful API with multi-tenancy
- Lesson CRUD with approval workflow
- User management with roles (student/builder/admin)
- Commission tracking and earnings
- Grok token usage monitoring
- WebSocket for real-time chat
- n8n workflow integration

**Development**:
```bash
cd backend
npm install
npm run start:dev      # Development with hot-reload
npm run test           # Run tests
```

**API**: http://localhost:3000/api

**Health Check**: http://localhost:3000/api/health

## 🗄️ Database Schema

**PostgreSQL with TypeORM**

**Tables**:
- `users` - User accounts with roles and tenant isolation
- `lessons` - Lesson data (JSONB) with approval status
- `interaction_types` - Pixi.js interaction configs
- `interaction_workflows` - n8n workflow definitions
- `usages` - Usage tracking for commissions

**Multi-tenancy**: Row-Level Security (RLS) with `tenant_id`

## 🐳 Docker Setup

**Services**:
- `frontend` - Angular + Ionic (port 8100)
- `backend` - NestJS API (port 3000)
- `postgres` - PostgreSQL database (port 5432)
- `redis` - Caching layer (port 6379)
- `minio` - Local S3 storage (port 9000)
- `n8n` - Workflow automation (port 5678)

**Commands**:
```bash
docker-compose up -d              # Start all services
docker-compose logs -f backend    # View backend logs
docker-compose down               # Stop all services
docker-compose ps                 # Check service status
```

## 🔐 Authentication

**Amazon Cognito** (JWT-based)

**Roles**:
- **Student**: View and take approved lessons
- **Lesson Builder**: Create lessons, earn commissions
- **Interaction Builder**: Create Pixi.js interactions, n8n workflows
- **Admin**: Approve content per tenant

**Mock Auth** (for local development): JWT with hardcoded tenant/user IDs

## 📋 API Endpoints

### Users
- `GET /api/users` - List users (tenant-filtered)
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user

### Lessons
- `GET /api/lessons?approved=true` - Get approved lessons
- `POST /api/lessons` - Create lesson
- `POST /api/lessons/:id/submit` - Submit for approval
- `POST /api/lessons/:id/approve` - Approve (admin only)
- `POST /api/lessons/:id/view` - Track view
- `POST /api/lessons/:id/complete` - Mark completion

**Headers Required**:
- `x-tenant-id`: UUID (for multi-tenancy)
- `x-user-id`: UUID (for ownership)

## 🎨 Features

### For Students
- Browse approved lessons
- Interactive Pixi.js lessons
- Real-time AI teacher chat
- Progress tracking

### For Lesson Builders
- Visual lesson editor
- Submit for approval
- Track earnings and usage
- Manage AI prompts

### For Interaction Builders
- Code Pixi.js interactions
- Upload n8n workflows
- Test and preview
- Submit for approval

### For Admins
- Approve/reject content
- View tenant metrics
- Manage users

## 🧪 Testing

```bash
# Frontend
cd frontend
npm run test           # Unit tests
npm run test:e2e       # E2E tests

# Backend
cd backend
npm run test           # Unit tests
npm run test:e2e       # Integration tests
```

## 📦 Deployment

### Local (Docker + Coolify)
```bash
docker-compose up --build
```

### AWS (Production)
- **Frontend**: S3 + CloudFront
- **Backend**: ECS (Fargate)
- **Database**: RDS PostgreSQL
- **Storage**: S3
- **Auth**: Cognito
- **Real-time**: API Gateway WebSockets

## 🔄 Approval Workflow

All content requires approval:

1. **Create** → Status: `pending`
2. **Submit** → Notification sent to admin
3. **Admin Review** → Approve or Reject
4. **Status Update** → `approved` or `rejected`
5. **Visibility** → Only approved content shown to students

## 💰 Monetization

- Track usage (views, completions, interactions)
- Calculate commissions
- Payout via Stripe Connect
- Earnings dashboard for creators

## 🌐 Enterprise Features

- **Multi-tenancy**: Complete data isolation per client
- **Angular Elements**: Embeddable web components
- **Private Instances**: Tenant-specific deployments
- **SSO Integration**: OAuth/SAML support
- **GDPR/CCPA Compliant**: Secure data handling

## 📚 Development Workflow

1. **Start frontend** (with mock data):
   ```bash
   cd frontend && npm start
   ```

2. **Start backend** (requires PostgreSQL):
   ```bash
   cd backend && npm run start:dev
   ```

3. **Full stack** (Docker):
   ```bash
   docker-compose up
   ```

## 🛠️ Tech Stack

**Frontend**:
- Angular 19
- Ionic 8
- Tailwind CSS
- Pixi.js
- Socket.io Client
- RxJS

**Backend**:
- NestJS
- TypeORM
- PostgreSQL
- Socket.io
- JWT Authentication
- Redis

**DevOps**:
- Docker & Docker Compose
- GitHub Actions (coming)
- AWS (production)

## 📖 Next Steps

- [x] Create docker-compose.yml
- [x] Set up PostgreSQL with seed data
- [ ] Connect frontend to backend API
- [ ] Implement WebSocket chat
- [ ] Add Pixi.js renderer
- [ ] Integrate n8n workflows
- [ ] Add Cognito authentication
- [ ] Build for iOS/Android
- [ ] Deploy to AWS

## 📄 License

Proprietary - All rights reserved

## 👥 Contributors

Built for the Upora AI Lessons platform.

