# Upora Backend - NestJS API

Backend API server for the Upora AI Lessons platform.

## Features

- **User Management**: CRUD operations with role-based access
- **Lesson Management**: Create, approve, and track lessons with multi-tenancy
- **Approval Workflow**: Submit, approve, reject lessons/interactions/workflows
- **Commission Tracking**: Track usage and calculate earnings
- **Token Management**: Monitor Grok API usage per user
- **Multi-Tenancy**: Row-Level Security with tenant isolation

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment** (create `.env` from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env` with your database credentials.

3. **Run PostgreSQL** (or use Docker - see docker-compose.yml in root):
```bash
# If using Docker
docker run -d \
  --name upora-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=upora_dev \
  -p 5432:5432 \
  postgres:15
```

4. **Start the development server**:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api`

## API Endpoints

### Users
- `GET /api/users` - Get all users (tenant-filtered)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/tokens` - Increment token usage

### Lessons
- `GET /api/lessons` - Get all lessons (tenant-filtered, ?approved=true for approved only)
- `GET /api/lessons/:id` - Get lesson by ID
- `POST /api/lessons` - Create new lesson
- `PATCH /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson
- `POST /api/lessons/:id/submit` - Submit for approval
- `POST /api/lessons/:id/approve` - Approve lesson (admin only)
- `POST /api/lessons/:id/reject` - Reject lesson (admin only)
- `POST /api/lessons/:id/view` - Track lesson view
- `POST /api/lessons/:id/complete` - Mark lesson completion

## Headers

All requests should include:
- `x-tenant-id`: UUID of the tenant (for multi-tenancy)
- `x-user-id`: UUID of the current user (for ownership checks)

## Database Entities

- **User**: User accounts with roles (student, lesson-builder, interaction-builder, admin)
- **Lesson**: Lesson data with JSONB for stages/prompts and approval status
- **InteractionType**: Pixi.js interaction configurations
- **Workflow**: n8n workflow definitions
- **Usage**: Tracking for views, completions, and commissions

## Development

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Run tests
npm run test

# E2E tests
npm run test:e2e
```

## Architecture

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Validation**: class-validator
- **Multi-tenancy**: Tenant ID in headers + RLS policies
- **Authentication**: JWT (Cognito integration coming)
- **Real-time**: Socket.io (WebSocket gateway coming)

## Next Steps

- [ ] Add JWT authentication with Cognito
- [ ] Implement WebSocket gateway for real-time features
- [ ] Add RLS database policies
- [ ] Create interaction-types and workflows modules
- [ ] Add Swagger documentation
- [ ] Implement rate limiting
- [ ] Add comprehensive tests