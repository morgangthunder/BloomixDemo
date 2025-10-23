# Context for AI Lessons App Development

## Overview
You are assisting in building an AI lessons app with a focus on a minimal viable product (MVP) skeleton that proves end-to-end functionality. The app is a cross-platform, educational platform with a Netflix-style interface for students to take lessons, incorporating Pixi.js interactions and AI chat powered by xAI’s Grok API, and interfaces for lesson-builders and interaction-builders to create content. The goal is to create a modular, JSON-centric system that tracks Grok token usage, supports commissions for creators, processes content via n8n workflows, and supports enterprise clients with secure, private instances using multi-tenancy and Angular Elements-based web components. A public instance (`PUBLIC_MODE=true`) shows all approved lessons from all creators. All lessons, interaction types, n8n workflows, and source content require an approval process with submission statuses (`pending`, `approved`, `rejected`). The app includes a Lesson-Builder tool for ingesting data from URLs and files (e.g., PDFs, images), processing them into JSON, and indexing summaries in Weaviate for semantic queries by Grok. The app must work locally using Docker Desktop and Coolify, deploying from GitHub, with a focus on separate component development and cross-platform deployment (browser, iOS via TestFlight, Android) using Ionic with Angular. The cloud provider is AWS, with Amazon Cognito for authentication, Amazon S3 for file storage, and PostgreSQL with Row-Level Security (RLS) for multi-tenancy. Weaviate is used locally and in production for vector storage, replacing Pinecone for the MVP.

## App Features

### User Profiles and Authentication
- **Account Types**: Students (take lessons), lesson-builders (create lessons), interaction-builders (create Pixi.js interaction types and n8n workflows). Additional admin role per tenant for approving content.
- **Authentication**: Default to Amazon Cognito with JWT-based auth and role-based access control (RBAC) to enforce permissions (e.g., lesson-builders can’t access others’ earnings, admins approve content). Support external authentication (e.g., company SSO via OAuth2, SAML, or custom JWTs) via `AUTH_PROVIDER=external`, validating tokens and extracting `tenant_id` and `account_id`. For public instances (`PUBLIC_MODE=true`), support guest access with `AUTH_PROVIDER=none`.
- **Profile Pages**: Show usage metrics, commission earnings, and submission statuses (e.g., pending lessons/workflows) for builders, tenant-isolated.
- **Token Tracking**: Track Grok API usage (e.g., AI teacher chat, content processing, coding assistance) per user, with warnings for approaching limits via WebSockets or in-app notifications.

### Lesson Experience
- **Interface**: Netflix-style Lesson Browser for students to view only approved lessons, configurable via environment variables (`ACCOUNT_ID`, `TENANT_ID`, `PUBLIC_MODE`). In public mode (`PUBLIC_MODE=true`), show all approved lessons from all creators.
- **Lesson Structure**: JSON files defining stages, substages, source data links, processed data, Grok prompts for AI teachers, and interaction type configurations.
- **Interactions**: Include Pixi.js interactions (e.g., drag-and-drop games) and real-time AI chat via WebSockets, powered by Grok API. Grok queries lesson JSON and Weaviate (source data summaries) for contextual answers.
- **Student Actions**: Support interactions like raise hand, pause, with real-time updates.

### Lesson-Builder Interface
- **Functionality**: Interface to structure lessons as JSON, including stages, substages, data links, Grok prompts for AI teachers, and approved interaction type selections. Includes a tool to ingest data from URLs (e.g., web pages, APIs) and files (e.g., PDFs, images) stored in S3, submitted for approval.
- **Data Ingestion**: Upload files or enter URLs, trigger approved n8n workflows to process data (e.g., extract text, summarize with Grok API), store JSON in PostgreSQL (`lessons` table, JSONB), and index summaries/key entities in Weaviate for semantic queries by Grok during lesson creation and student interactions.
- **Workflow Integration**: Supports selecting approved n8n workflows to process source content.
- **Approval**: Includes a “Submit for Approval” button, with status display (`pending`, `approved`, `rejected`).
- **Payments**: Possible payment for premium interaction types.

### Interaction-Builder Interface
- **Functionality**: Interface to create Pixi.js interaction types, saved as JSON (defining inputs, events, rendering configs).
- **Coding Support**: Code/preview split-view with Grok API assistance for Pixi.js interactions.
- **Workflows**: For MVP, the app owner creates n8n workflows offline (e.g., localhost:5678) and uploads JSON via a simple file input for approval.
- **Approval**: Interactions and workflows require admin approval, with status display.
- **Sandboxing**: Interactions run in a sandboxed Pixi.js environment, with defined input data structures and event triggers for lesson-builders.

### Content Processing
- **Uploads**: Interface for uploading source content (e.g., text, PDFs, images) to S3, submitted for approval.
- **Workflows**: Approved n8n workflows process content (e.g., extract text, summarize with Grok API, output JSON), storing results in S3 or PostgreSQL (JSONB). Summaries/key entities are indexed in Weaviate for semantic queries.
- **MVP**: Initial n8n workflows created by the app owner, submitted for approval, stored as JSON.

### Monetization
- **Commissions**: Lesson-builders and interaction-builders earn based on usage of approved lessons/interactions/workflows, tracked via database metrics.
- **Payouts**: Aggregated for payouts via Stripe Connect, displayed in earnings dashboards on profile pages.

### Token Tracking
- **Functionality**: Tracks Grok API usage (e.g., AI chat, content processing, coding assistance) per user, stored in DB with tenant isolation.
- **Notifications**: Backend middleware logs usage, pushes warnings via WebSockets/in-app notifications when nearing limits.

### Enterprise Features
- **Private Instances**: Support secure, private instances with multi-tenancy to isolate data (e.g., lessons, content, metrics) per client via `tenant_id`.
- **Angular Elements**: Package frontend as Angular Elements-based web components (JavaScript blob) for embedding in external websites (e.g., `<lesson-viewer tenant="client-abc">`), configurable via environment variables (`ACCOUNT_ID`, `TENANT_ID`, `PUBLIC_MODE`). Show only approved, tenant-specific content (or all approved content in public mode).
- **External Authentication**: Support company SSO (OAuth2, SAML, custom JWTs) via `AUTH_PROVIDER=external`, validating tokens and mapping to `tenant_id` and `account_id`.
- **Compliance**: Ensure GDPR/CCPA compliance through data isolation and secure APIs.

### Approval Process
- **Requirement**: All lessons, interaction types, n8n workflows, and source content require admin approval before use (`pending`, `approved`, `rejected`).
- **Management**: Tenant-specific admins (via Cognito groups) review content. For MVP, app owner manually approves; post-MVP, add admin UI.
- **Enforcement**: Only approved content is accessible, enforced via backend APIs, RLS, and Weaviate class filters.

## App Component Structure

### Frontend
- **Framework**: Ionic with Angular single-page app for browser, iOS (TestFlight), Android (Capacitor). Convertible to Angular Elements for enterprise embedding.
- **Pages**: Login, Profile (earnings, usage, submission statuses), Lesson Browser (Netflix-style, approved lessons), Lesson View (Pixi.js + Grok AI chat with Weaviate queries), Lesson-Builder (JSON editor, data ingestion tool, interaction selection, submit button), Interaction-Builder (code/preview, n8n workflow upload, submit button), Admin (post-MVP).
- **Integrations**: Pixi.js for interactions, Socket.io for real-time AI chat and approval notifications.

### Backend
- **Framework**: NestJS API server.
- **Endpoints**: User management, lesson CRUD (with submit/approve), interaction type CRUD (with submit/approve), workflow CRUD (with submit/approve), content processing triggers (including data ingestion), Grok token tracking, commission calculations, tenant-specific data access, public mode queries (all approved lessons when `PUBLIC_MODE=true`), Weaviate integration for indexing/querying summaries.
- **Webhooks**: For n8n integration (e.g., trigger approved workflows, receive processed data).

### Database
- **Type**: PostgreSQL with JSONB for lessons, interaction types, n8n workflows, and Grok prompts. Hosted on AWS RDS.
- **Multi-Tenancy**: Row-Level Security (RLS) with `tenant_id` for data isolation. Public mode bypasses tenant filtering for approved content.
- **Tables**: `users` (with `tenant_id`, `role`), `lessons` (JSONB, `status` ENUM: `pending/approved/rejected`, Weaviate IDs), `interaction_types` (JSONB, `status`), `interaction_workflows` (JSONB for n8n, `status`), `usages` (metrics/commissions).

### Vector Database
- **Type**: Weaviate for indexing processed content summaries and key entities (e.g., topics, keywords) for semantic search and Grok queries, tenant-isolated using class names or properties. Runs in Docker locally for MVP, with plans to transition to Pinecone in production.

### File Storage
- **Type**: Amazon S3 with tenant-specific buckets/prefixes for source files and processed outputs. Mocked with MinIO locally.

### Workflow Automation
- **Tool**: n8n for content processing (e.g., URL/PDF ingestion, Grok summarization) and custom workflows, stored as JSON, submitted for approval, triggered via API/webhooks.

### Real-Time Features
- **Tool**: Socket.io for Grok-powered AI chat, lesson interactions, token warnings, and approval status updates, with tenant-namespaced rooms. Hosted via AWS API Gateway WebSockets.

### Authentication
- **Default**: Amazon Cognito with JWT-based auth, RBAC (e.g., tenant-admin group), tenant claims.
- **External**: Support OAuth2, SAML, or custom JWTs via `AUTH_PROVIDER=external`. Guest access via `AUTH_PROVIDER=none` for public mode.

### Payment Integration
- **Tool**: Stripe Connect for commission payouts and potential interaction type payments.

### Caching/Queuing
- **Tool**: Redis for caching lesson JSONs and queuing tasks (e.g., commissions, approval workflows). Tenant-aware caching. Hosted on AWS ElastiCache.

### Monitoring/Logging
- **Tools**: Sentry for errors, Prometheus/Grafana for metrics, AWS CloudWatch for tenant-specific logs.

### Testing
- **Tools**: Jest for frontend unit tests, Mocha/Chai for backend unit tests, Cypress for E2E browser tests. Validate JSON schemas, tenant isolation, approval flows, data ingestion, Weaviate integration.

## Technical Setup
- **Development Environment**: Local development with Docker Desktop and Coolify for deployment from GitHub. Production on AWS (ECS for NestJS, RDS for PostgreSQL).
- **Monorepo**: Nx with folders: `/frontend` (Ionic/Angular, Angular Elements), `/backend` (NestJS), `/n8n` (workflows), `/shared` (types, schemas).
- **Docker Compose**: Services for frontend (port 8100), backend (port 3000), PostgreSQL, n8n (port 5678), Weaviate (port 8080), Redis, MinIO. Environment variables: `ACCOUNT_ID`, `TENANT_ID`, `PUBLIC_MODE`, `AUTH_PROVIDER`, `WEAVIATE_URL`.
- **Cross-Platform**: Ionic with Capacitor for browser, iOS (Xcode, TestFlight), Android (Android Studio). Angular Elements for enterprise embedding.
- **AI Assistance**: xAI Grok API (via https://x.ai/api) for AI teacher chat, content processing (e.g., URL/PDF summarization), and code generation. Mock locally with static responses for MVP.
- **Security**: Validate n8n workflows (restrict nodes, enforce schemas). Sanitize uploads, secure APIs with Cognito/external JWTs and CORS for enterprise domains. Use AWS IAM for S3, AWS Secrets Manager for tenant-specific Grok API keys. Use Weaviate class filters for tenant isolation.

## MVP Goals
- **Objective**: Prove end-to-end flows:
  - **Student**: Browse mock approved lesson, view lesson with Pixi.js interaction (e.g., draggable sprite) and mock Grok-powered AI chat querying Weaviate for source data context.
  - **Lesson-Builder**: Create lesson JSON with stages, data links (from URL/PDF ingestion), interaction type, optional n8n workflow, Grok prompts, submit for approval.
  - **Interaction-Builder**: Create interaction type JSON (Pixi.js config), upload app owner’s n8n workflow JSON, submit for approval.
  - **Content Processing**: Upload file/URL → Submit for approval → Trigger n8n webhook with approved workflow → Process with Grok API → Store JSON in PostgreSQL, index summaries in Weaviate.
  - **Enterprise Prep**: Basic multi-tenancy (`tenant_id`), Angular Element proof-of-concept for lesson viewing with Cognito/external auth, public mode for all approved lessons.
- **Deliverables**:
  - Lesson JSON rendering with Pixi.js interaction and Grok prompts (approved only).
  - Interaction type JSON with mock approved n8n workflow feeding Pixi.js.
  - n8n flow for URL/PDF ingestion, triggered by webhook, returning processed JSON and Weaviate-indexed summaries.
  - Basic auth (mock Cognito/external JWTs with `tenant_id`, `account_id`, admin role), Grok token tracking (console logs), commission metrics (mock DB queries), tenant-aware/public queries.
  - Cross-platform: Browser and iOS TestFlight, Angular Elements proof-of-concept.
- **Testing**: Unit tests (Jest, Mocha/Chai) for JSON parsing, API endpoints, workflow validation, tenant isolation, approval status, data ingestion, Weaviate integration. E2E tests (Cypress) for login → lesson submission → approval → interaction flow.
- **Modularity**: Develop components separately (frontend with mock API, backend with Postman). Use MSW for frontend API mocking.
- **Deployment**: Coolify deploys from GitHub to local Docker. Ensure services communicate (frontend → API → n8n → Weaviate).

## Constraints
- **Non-Experienced Coder**: Prioritize simple, AI-generated code with clear structure. Use Ionic/Angular and NestJS for beginner-friendly conventions.
- **JSON-Centric**: Lessons, interaction types, n8n workflows, and Grok prompts are JSON, validated with schemas.
- **Local-First**: All services (including Weaviate) run in Docker locally, movable to AWS (with Pinecone option post-MVP).
- **Cross-Platform**: Ionic for browser and native builds. Angular Elements for enterprise embedding. TestFlight for iOS.
- **Security**: Validate user inputs (uploads, workflow JSON). Limit n8n workflows to safe nodes. Use tenant-aware RLS and Weaviate class filters. Ensure only approved content is accessible.
- **Performance**: Lazy-load lessons, cache in Redis, offload heavy tasks (e.g., Grok API calls, Weaviate indexing) to backend. Plan for low-latency STT/TTS (future) with streaming WebSockets.

## Critical Analysis Requirement
- **Instruction**: Critically evaluate all requests before implementation. If a request may cause issues (e.g., performance, security, compatibility, scalability, maintainability) or deviates from the app’s architecture, goals, or constraints:
  - Identify issues (e.g., “Overloads n8n with complex workflows” or “Conflicts with Ionic mobile rendering”).
  - Explain why, referencing the stack, MVP goals, or constraints.
  - Suggest alternatives aligning with Ionic/Angular, Angular Elements, NestJS, PostgreSQL, n8n, Pixi.js, Redis, Weaviate, AWS Cognito, S3, and Grok API, prioritizing simplicity, security, approval processes, and cross-platform compatibility.
  - If sound, confirm fit and implement with tests and JSON-centric design.

## Specific Notes
- **n8n Workflows**: For MVP, app owner creates workflows offline (localhost:5678), uploads JSON via Interaction-Builder (file input) for approval. Stored in PostgreSQL (JSONB) with fields: `id`, `interaction_type_id`, `workflow_json`, `created_by`, `input_format`, `output_format`, `tenant_id`, `status` (`pending/approved/rejected`). Triggered via n8n API/webhooks if approved, validated for security. Include workflows for URL/PDF ingestion (text extraction, Grok summarization).
- **Pixi.js Interactions**: Run in sandboxed environment. JSON defines inputs (e.g., n8n-processed data) and events (e.g., drag end triggers Grok chat). Tenant-specific, approval-required.
- **AI Teacher Prompts**: Stored in lesson JSON (JSONB), managed via Lesson-Builder with dedicated prompt section. Require approval.
- **LLM Integration**: Use xAI Grok API (https://x.ai/api) for AI chat, content processing (e.g., URL/PDF summarization), and coding assistance. Mock locally with static responses. Store tenant-specific API keys in AWS Secrets Manager.
- **Data Ingestion**: Lesson-Builder ingests URLs/files, submits for approval, processes via n8n (Grok for summarization), stores JSON in PostgreSQL, indexes summaries in Weaviate for semantic queries by Grok during lesson creation and student interactions.
- **Public Instance**: Use `PUBLIC_MODE=true` to show all approved lessons from all creators, with `AUTH_PROVIDER=none` for guest access or custom auth.
- **Angular Elements**: Package frontend as web components for embedding, configurable via `ACCOUNT_ID`, `TENANT_ID`, `PUBLIC_MODE`.
- **Database**: PostgreSQL for relational data (users, lessons, workflows, metrics, prompts). JSONB for flexibility. RLS for multi-tenancy. Weaviate for semantic search of approved content summaries.