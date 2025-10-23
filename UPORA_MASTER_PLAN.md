# 🎓 Upora - Master Development Plan

## **Vision**
AI-powered interactive lessons platform with adaptive learning paths, real-time AI teaching, and cross-platform delivery (web + mobile).

---

## 📋 **Table of Contents**
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [TEACH Methodology Framework](#teach-methodology-framework)
4. [Development Phases](#development-phases)
5. [Current Status](#current-status)
6. [Technical Stack](#technical-stack)
7. [Feature Roadmap](#feature-roadmap)

---

## 🎯 **Project Overview**

### **Core Features**
- **Lesson Builder** - Create structured lessons using TEACH methodology
- **AI Teacher** - Real-time AI guidance during lessons with script timeline
- **Interactive Elements** - Pixi.js-powered educational interactions
- **Content Processing** - N8N workflows for content transformation
- **Semantic Search** - Weaviate-powered content discovery
- **Multi-tenancy** - SaaS with row-level security
- **Monetization** - Token-based AI usage with subscription tiers
- **Cross-platform** - Web, iOS (TestFlight), Android (internal testing)

### **User Roles**
- **Student** - Takes lessons, interacts with AI teacher
- **Lesson Builder** - Creates and manages lessons
- **Interaction Builder** - Designs custom Pixi.js interactions
- **Content Approver** - Reviews and approves content/workflows
- **Admin** - Platform management, pricing config
- **Super Admin** - System prompts, global settings

---

## 🏗️ **Architecture**

### **Tech Stack**
```
Frontend:
- Angular 19 + Ionic 8
- TypeScript (strict mode)
- RxJS for state management
- Socket.io-client for real-time
- Pixi.js for interactions
- Capacitor for mobile

Backend:
- NestJS (Node 20)
- TypeORM + PostgreSQL
- Redis (caching)
- Socket.io (WebSocket)
- Weaviate (vector DB)

Infrastructure:
- Docker Compose (dev)
- MinIO (S3-compatible storage)
- n8n (workflow automation)
- PostgreSQL RLS (multi-tenancy)

Mobile:
- Capacitor + Ionic
- Fastlane (CI/CD)
- TestFlight (iOS beta)
- Google Play Internal (Android)
```

### **Database Schema**
```
Core Tables:
- users (with RLS)
- lessons (with TEACH stages JSON)
- interaction_types
- interaction_workflows
- content_sources
- processed_content_outputs (NEW)
- script_blocks (NEW)

Token System:
- token_tracking
- token_pricing
- token_topups
- pricing_config

Data Links:
- lesson_data_links (content → lessons)

Session/Usage:
- sessions
- usages
```

---

## 🎓 **TEACH Methodology Framework**

Upora lessons are structured using the TEACH methodology - a pedagogically sound framework based on cognitive science research.

### **Stage Types & Sub-Stage Types**

#### **1. TEASE (Trigger) Stage**
**Goal:** Spark curiosity and activate schemas  
**Research Basis:** Loewenstein's Information Gap Theory (1994) - Creates 20% higher engagement via dopamine spike

**Sub-Stage Types: TIE (Trigger, Ignite, Evoke)**

| Sub-Stage | Purpose | Example | Research Basis |
|-----------|---------|---------|----------------|
| **Trigger** | Pose provocative question/teaser | "What if gravity reversed?" | Creates information gap → spikes dopamine and attention |
| **Ignite** | Present surprising visual/demo | Short GIF, poll, demo | Multisensory hooks leverage dual-coding (Paivio, 1986) |
| **Evoke** | Elicit personal connection | "Share a time you felt weightless" | Activates schemas (Piaget) → 30% better retention |

**Duration:** 2-5 minutes  
**Interaction Types:** Poll, Quick Quiz, Visual Demo, Personal Reflection

---

#### **2. EXPLORE (Explore) Stage**
**Goal:** Foster inquiry and pattern recognition  
**Research Basis:** Inquiry-based learning meta-analyses (Minner et al., 2010) - 18% gains in conceptual understanding

**Sub-Stage Types: HUNT (Handle, Uncover, Noodle, Track)**

| Sub-Stage | Purpose | Example | Research Basis |
|-----------|---------|---------|----------------|
| **Handle** | Interactive manipulation | Drag-and-drop sim, experiment | Embodied cognition (Glenberg, 2010) enhances memory |
| **Uncover** (Probe) | Guided questioning | "What happens if you change X?" | ZPD scaffolding (Vygotsky) for self-directed inquiry |
| **Noodle** | Hypothesis-sharing pause | "Predict the outcome" | Reflection + action = better transfer (spaced practice) |
| **Track** | Identify patterns/anomalies | "What stands out in this data?" | Promotes metacognition, reduces misconceptions |

**Duration:** 5-10 minutes  
**Interaction Types:** Simulations, Drag-and-Drop, Experiments, Pattern Matching

---

#### **3. ABSORB (Absorb) Stage**
**Goal:** Deliver and internalize core content  
**Research Basis:** Mayer's Multimedia Learning (Cambridge Handbook, 2014) - Coherence & signaling principles

**Sub-Stage Types: SIP (Show, Interpret, Parallel)**

| Sub-Stage | Purpose | Example | Research Basis |
|-----------|---------|---------|----------------|
| **Show** | Concise explanation/visual | Animated diagram, video | Chunking reduces cognitive load → 25% better comprehension |
| **Interpret** | Active summarization prompt | "Rephrase in your words" | Generation effect (Slamecka & Graf, 1978) strengthens encoding |
| **Parallel** | Analogy or example tie-back | "Like dividing a pizza..." | Relational mapping (Gentner) aids abstraction |

**Duration:** 5-15 minutes  
**Interaction Types:** Video, Animated Diagrams, Fill-in-the-Blank, Concept Mapping

---

#### **4. CULTIVATE (Cultivate) Stage**
**Goal:** Apply, extend, and iterate  
**Research Basis:** Bjork's Desirable Difficulties (1994) - Varied practice → 40% better long-term retention

**Sub-Stage Types: GROW (Grip, Repurpose, Originate, Work)**

| Sub-Stage | Purpose | Example | Research Basis |
|-----------|---------|---------|----------------|
| **Grip** (Apply) | Basic task using core concepts | Solve standard problem | Builds procedural fluency via repetition with feedback |
| **Repurpose** (Vary) | Twist with new context | Real-world scenario, interleaving | Enhances discrimination and transfer (Rohrer & Taylor, 2007) |
| **Originate** (Extend) | Creative extension | "Design your own example" | Elaboration creates richer neural connections (Craft, 2014) |
| **Work** (Iterate) | Revise based on feedback | "Tweak your solution—why?" | Promotes metacognition via error-based learning (Metcalfe, 2017) |

**Duration:** 10-20 minutes  
**Interaction Types:** Problem Sets, Case Studies, Creative Tasks, Peer Review

---

#### **5. HONE (Hone) Stage**
**Goal:** Assess mastery and reflect  
**Research Basis:** Retrieval Practice (Roediger & Karpicke, 2006) - 50% better retention vs. re-reading

**Sub-Stage Types: VET (Verify, Evaluate, Target)**

| Sub-Stage | Purpose | Example | Research Basis |
|-----------|---------|---------|----------------|
| **Verify** | Low/high-stakes quiz or recall | "List 3 key ideas" | Active recall strengthens memory traces |
| **Evaluate** (Reflect) | Self-assess gaps | "What was tricky and why?" | Metacognition (Flavell, 1979) improves self-regulation |
| **Target** | Forward-looking action | "How will you use this next?" | Goal-setting (Locke & Latham, 2002) bridges to spaced repetition |

**Duration:** 5-10 minutes  
**Interaction Types:** Quizzes, Self-Assessment, Reflection Journal, Goal Setting

---

### **TEACH Structure Rules**

1. **All stages MUST use one of the 5 stage types:**
   - Tease (Trigger)
   - Explore
   - Absorb
   - Cultivate
   - Hone

2. **All sub-stages MUST use the corresponding sub-stage type:**
   - Tease → TIE (Trigger, Ignite, Evoke)
   - Explore → HUNT (Handle, Uncover, Noodle, Track)
   - Absorb → SIP (Show, Interpret, Parallel)
   - Cultivate → GROW (Grip, Repurpose, Originate, Work)
   - Hone → VET (Verify, Evaluate, Target)

3. **Lessons should typically follow TEACH order** (but can skip stages or repeat as needed)

4. **Each sub-stage can have:**
   - Interaction (optional)
   - Processed content output (optional)
   - Script timeline (teacher talk, load interaction, pauses)

---

## 📅 **Development Phases**

### **✅ PHASE 0: Foundation** (COMPLETED)
**Goal:** Basic infrastructure and setup

- ✅ Docker Compose setup (frontend, backend, postgres, redis, minio, n8n, weaviate)
- ✅ NestJS backend with TypeORM
- ✅ Angular 19 + Ionic 8 frontend
- ✅ PostgreSQL with Row-Level Security (RLS)
- ✅ Database schema (8 tables + indexes + triggers)
- ✅ Seed data (2 tenants, 7 users, 5 lessons)
- ✅ Health checks and service orchestration

**Deliverables:**
- All services running in Docker
- Database initialized with schema and seed data
- Frontend/backend communication working
- README with quick start instructions

---

### **✅ PHASE 1: Backend Infrastructure** (COMPLETED)
**Goal:** Core API and database foundation

- ✅ User management (CRUD, token tracking)
- ✅ Lesson management (CRUD, approval workflow)
- ✅ Basic authentication setup
- ✅ TypeORM entities with proper relations
- ✅ API endpoints structure
- ✅ CORS configuration

**Deliverables:**
- Users API (`/api/users`)
- Lessons API (`/api/lessons`)
- Token tracking system
- Multi-tenant support via headers

---

### **✅ PHASE 2: Frontend-Backend Integration** (COMPLETED)
**Goal:** Replace mock data with real API calls

- ✅ API service layer (`ApiService`)
- ✅ Lesson service with API integration
- ✅ Environment configuration (dev/prod)
- ✅ Error handling and fallbacks
- ✅ Backend entity field mapping (camelCase ↔ snake_case)
- ✅ Real data loading on homepage
- ✅ Image handling (Unsplash URLs)

**Deliverables:**
- Homepage showing real lessons from database
- Working navigation between pages
- Proper error handling
- TypeScript type safety

---

### **✅ PHASE 3: Real-time Features** (COMPLETED)
**Goal:** WebSocket chat and AI integration

- ✅ Socket.io WebSocket gateway
- ✅ Chat module with lesson rooms
- ✅ Grok AI service (mocked for MVP)
- ✅ Token tracking for AI usage
- ✅ Real-time message delivery
- ✅ WebSocket service on frontend
- ✅ Chat UI in lesson view

**Deliverables:**
- WebSocket gateway at `/chat`
- AI chat in lesson view
- Token usage tracking
- Connection status indicators

---

### **✅ PHASE 4: Semantic Search & Content** (COMPLETED)
**Goal:** Weaviate integration and content management

- ✅ Weaviate service and schema initialization
- ✅ Content sources table and entity
- ✅ Content approval workflow
- ✅ BM25 semantic search (MVP)
- ✅ Content ingestion and indexing
- ✅ Content linking to lessons
- ✅ Content library UI
- ✅ Content approvals UI
- ✅ Token tracking for content processing

**Deliverables:**
- Content library page (`/content-library`)
- Content approvals page (`/content-approvals`)
- Weaviate search API
- Content-to-lesson linking system

---

### **✅ PHASE 4.5: Lesson Editor V2** (COMPLETED)
**Goal:** Comprehensive lesson building interface

#### **Sub-Phase 4.5.1: Frontend Core** ✅
- ✅ 6-panel tab system (Details, Structure, Script, Content, Preview, AI)
- ✅ Collapsible structure sidebar with stage/substage tree
- ✅ TEACH stage types integration (Tease, Explore, Absorb, Cultivate, Hone)
- ✅ Add/delete stages and substages
- ✅ Responsive design (desktop/tablet/mobile with FAB)
- ✅ Smart auto-tab-switching

**Deliverables:**
- `lesson-editor-v2.component.ts` (1,591 lines)
- Route: `/lesson-editor/:id`
- Header overlay fix for full-page layouts

#### **Sub-Phase 4.5.2: Backend Support** ✅
- ✅ ProcessedContentOutput entity
- ✅ ScriptBlock entity
- ✅ Database tables with indexes and triggers
- ✅ Lesson Editor module (service + controller)
- ✅ 12 API endpoints for CRUD operations

**Deliverables:**
- `/api/lesson-editor/*` endpoints
- `processed_content_outputs` table
- `script_blocks` table
- Full CRUD for outputs and script blocks

#### **Sub-Phase 4.5.3: Data Persistence Integration** (NEXT) ⏳
**Goal:** Connect frontend to backend API for saving/loading

**Tasks:**
- [ ] Load lesson data from API in `loadLesson(id)`
- [ ] Parse lesson.data.stages into Stage[] format
- [ ] Load script blocks from API for each substage
- [ ] Save lesson details on "Save Draft"
- [ ] Update lesson.data.stages on structure changes
- [ ] Create/update/delete script blocks via API
- [ ] Handle errors and loading states
- [ ] Add save indicators (saving..., saved, error)

**Endpoints to Integrate:**
```typescript
// Lesson CRUD (existing)
GET    /api/lessons/:id
PATCH  /api/lessons/:id

// Lesson stages (new)
PATCH  /api/lesson-editor/lessons/:id/stages

// Script blocks (new)
GET    /api/lesson-editor/lessons/:lessonId/script/:substageId
POST   /api/lesson-editor/script-blocks
PATCH  /api/lesson-editor/script-blocks/:id
DELETE /api/lesson-editor/script-blocks/:id
```

**Testing Checklist:**
- [ ] Load existing lesson → sees stages and substages
- [ ] Add stage → saves to database
- [ ] Add substage → saves to database
- [ ] Edit stage/substage properties → updates database
- [ ] Delete stage → removes from database
- [ ] Add script block → persists to script_blocks table
- [ ] Edit script block times/content → updates database
- [ ] Delete script block → removes from database
- [ ] Navigate away and back → data persists

**Estimated Time:** 2-3 hours

---

#### **Sub-Phase 4.5.4: Content Processing Integration** ⏳
**Goal:** Enable content search, workflow execution, and output management

**Tasks:**
- [ ] Build content library search modal
- [ ] Integrate Weaviate search in Content tab
- [ ] Display content source preview
- [ ] List available N8N workflows from database
- [ ] Upload custom N8N workflow JSON
- [ ] Trigger N8N workflow execution
- [ ] Poll for workflow completion status
- [ ] Display processed output preview
- [ ] Save processed output to database
- [ ] List all processed outputs for lesson
- [ ] Link processed output to substage
- [ ] AI refinement of outputs (via Grok)

**Endpoints to Integrate:**
```typescript
// Content sources (existing)
GET    /api/content-sources
GET    /api/content-sources/search
GET    /api/content-sources/:id

// Workflows (existing)
GET    /api/workflows (TODO: create endpoint)
POST   /api/workflows/execute (TODO: create endpoint)

// Processed outputs (new)
GET    /api/lesson-editor/lessons/:lessonId/processed-outputs
POST   /api/lesson-editor/processed-outputs
PATCH  /api/lesson-editor/processed-outputs/:id
DELETE /api/lesson-editor/processed-outputs/:id
```

**UI Components Needed:**
- [ ] ContentLibrarySearchModal component
- [ ] WorkflowSelectorModal component
- [ ] ProcessedOutputPreview component
- [ ] ProcessingStatusIndicator component

**Testing Checklist:**
- [ ] Search content library → sees relevant results
- [ ] Select content source → shows preview
- [ ] Choose N8N workflow → lists available options
- [ ] Upload custom workflow JSON → validates and saves
- [ ] Trigger workflow → shows processing status
- [ ] View processed output → displays formatted data
- [ ] Save output → appears in lesson's outputs list
- [ ] Link output to substage → appears in substage config
- [ ] Delete output → confirms and removes
- [ ] AI refine output → sends to Grok and updates

**Estimated Time:** 3-4 hours

---

#### **Sub-Phase 4.5.5: Interaction Selection** ⏳
**Goal:** Enable selection of interaction types and configuration

**Tasks:**
- [ ] InteractionTypeSelectorModal component
- [ ] List available interaction types from database
- [ ] Show interaction preview/demo
- [ ] Display interaction configuration options
- [ ] Assign interaction to substage
- [ ] Store interaction metadata in substage
- [ ] ContentOutputSelectorModal component
- [ ] List lesson's processed outputs
- [ ] Preview output data
- [ ] Assign to substage for interaction use

**Endpoints to Use:**
```typescript
// Interaction types (existing)
GET    /api/interaction-types

// Update substage (via lesson.data)
PATCH  /api/lesson-editor/lessons/:id/stages
```

**Testing Checklist:**
- [ ] Click "Change" interaction type → opens modal
- [ ] See list of interaction types → can select
- [ ] Preview interaction → shows demo/config
- [ ] Assign to substage → saves in lesson.data
- [ ] Click "Select" content → opens modal
- [ ] See processed outputs → can choose
- [ ] Assign to substage → links properly

**Estimated Time:** 2 hours

---

#### **Sub-Phase 4.5.6: Preview System** ⏳
**Goal:** Render substage as student would experience it

**Tasks:**
- [ ] SubstagePreviewRenderer component
- [ ] Load substage data (interaction, content, script)
- [ ] Render AI teacher message
- [ ] Load and display interaction component
- [ ] Pass processed content data to interaction
- [ ] Timeline playback controls (play/pause/scrub)
- [ ] Script block execution in sequence
- [ ] Handle interaction events/results
- [ ] Fullscreen mode toggle

**Components to Build:**
- [ ] AITeacherMessageDisplay
- [ ] InteractionRenderer (dynamic loader)
- [ ] TimelinePlayer
- [ ] PreviewControls

**Testing Checklist:**
- [ ] Select substage → preview panel updates
- [ ] See AI teacher message from script
- [ ] Interaction loads and is functional
- [ ] Timeline scrubber works
- [ ] Play button executes script sequentially
- [ ] Can pause/resume playback
- [ ] Fullscreen mode works
- [ ] Exit preview returns to editor

**Estimated Time:** 2-3 hours

---

#### **Sub-Phase 4.5.7: AI Assistant Integration** ⏳
**Goal:** Connect AI chat to Grok API with context awareness

**Tasks:**
- [ ] AI chat backend endpoint (if not using WebSocket)
- [ ] System prompt configuration (super admin)
- [ ] Context injection (current lesson, stage, substage)
- [ ] Send message to Grok API
- [ ] Stream response back to frontend
- [ ] Display chat history
- [ ] Quick action buttons (help write script, suggest interaction, etc.)
- [ ] Token usage tracking and display
- [ ] AI content refinement actions
- [ ] Save chat history (optional)

**Context Prompts:**
```typescript
// Lesson Builder Context
`You are an AI assistant helping to build a lesson using the TEACH methodology.
Current context:
- Lesson: ${lesson.title}
- Stage: ${selectedStage?.title} (${selectedStage?.type})
- Substage: ${selectedSubstage?.title} (${selectedSubstage?.type})

Available tools:
- Suggest script content for this substage
- Recommend interaction types
- Refine processed content outputs
- Generate teacher dialogue

How can I help?`
```

**Endpoints:**
```typescript
POST   /api/ai/lesson-assist
POST   /api/ai/refine-content
GET    /api/ai/system-prompts (super admin)
PATCH  /api/ai/system-prompts (super admin)
```

**Testing Checklist:**
- [ ] Send message → Grok responds
- [ ] Context includes current lesson/stage
- [ ] Quick actions work
- [ ] Token usage updates
- [ ] Can refine content outputs
- [ ] Script suggestions are useful
- [ ] Interaction recommendations fit stage type

**Estimated Time:** 2 hours

---

#### **Sub-Phase 4.5.8: TEACH Structure Enforcement** ⏳
**Goal:** Ensure all stages/substages use correct types

**Tasks:**
- [ ] Stage type selector with TEACH options
- [ ] Sub-stage type selector based on parent stage
- [ ] Validation: substage type must match stage type
- [ ] Helper text/descriptions for each type
- [ ] Icons for each stage/substage type
- [ ] Tooltips explaining research basis
- [ ] Prevent invalid combinations

**Stage Type Mappings:**
```typescript
const STAGE_SUBSTAGE_MAP = {
  'tease': ['trigger', 'ignite', 'evoke'], // TIE
  'explore': ['handle', 'uncover', 'noodle', 'track'], // HUNT
  'absorb': ['show', 'interpret', 'parallel'], // SIP
  'cultivate': ['grip', 'repurpose', 'originate', 'work'], // GROW
  'hone': ['verify', 'evaluate', 'target'] // VET
};
```

**UI Updates:**
- [ ] Stage selector shows: "Tease (Trigger) - Spark curiosity"
- [ ] Sub-stage selector dynamically filters by parent stage
- [ ] Description cards for each type with research basis
- [ ] Visual acronym display (TIE, HUNT, SIP, GROW, VET)

**Testing Checklist:**
- [ ] Add Tease stage → can only add TIE substages
- [ ] Add Explore stage → can only add HUNT substages
- [ ] Try to add wrong substage type → prevented
- [ ] Tooltips show research explanations
- [ ] Icons match stage types

**Estimated Time:** 1-2 hours

---

### **PHASE 5: Interactive Elements & Pixi.js** (UPCOMING)
**Goal:** Build interaction builder and runtime

**Sub-Phases:**

#### **5.1: Pixi.js Integration**
- [ ] Pixi.js setup in Angular
- [ ] Base interaction component
- [ ] Interaction renderer service
- [ ] Canvas lifecycle management

#### **5.2: Built-in Interaction Types**
- [ ] Drag & Drop
- [ ] Multiple Choice
- [ ] Fill in the Blank
- [ ] Matching Game
- [ ] Timeline Slider
- [ ] Hotspot Image
- [ ] Sorting Exercise

#### **5.3: Media Interaction Types**
- [ ] Slideshow (image carousel with annotations)
- [ ] Video Player (with timestamps, pauses, questions)
- [ ] Audio Player (with transcripts, interactive elements)

#### **5.4: AI Image Generation**
- [ ] DALL-E 3 integration
- [ ] Image generation from text prompts
- [ ] Store generated images in MinIO
- [ ] Link images to lessons/interactions
- [ ] Prompt library and templates

#### **5.5: Interaction Builder**
- [ ] Drag-and-drop builder UI
- [ ] Property inspector
- [ ] Asset management (images, audio)
- [ ] Preview mode
- [ ] Save/load interactions
- [ ] Export as reusable component

**Estimated Time:** 15-20 hours

---

### **PHASE 6: N8N Workflow Integration** (UPCOMING)
**Goal:** Content processing automation

#### **6.1: Workflow Management**
- [ ] Workflow CRUD API
- [ ] Workflow approval system
- [ ] N8N webhook integration
- [ ] Execution status tracking
- [ ] Error handling and retry

#### **6.2: Built-in Workflows**
- [ ] Extract Q&A Pairs
- [ ] Summarize Content
- [ ] Extract Key Facts
- [ ] Generate Quiz Questions
- [ ] Vectorize Content
- [ ] Content Chunking
- [ ] Identify Concepts & Skills

#### **6.3: Custom Workflows**
- [ ] Upload N8N JSON
- [ ] Validate workflow structure
- [ ] Test execution
- [ ] Share workflows across tenants

**Estimated Time:** 8-10 hours

---

### **PHASE 7: Monetization & Token System** (PARTIALLY COMPLETE)
**Goal:** Complete AI usage tracking and payment

**Current Status:**
- ✅ Database tables (token_pricing, token_topups, pricing_config)
- ✅ Basic token tracking
- ✅ Seed data with pricing tiers

**Remaining:**

#### **7.1: Token Tracking UI**
- [ ] Token usage indicator in header
- [ ] Detailed usage breakdown page
- [ ] Historical usage charts
- [ ] Per-lesson usage stats

#### **7.2: Pricing & Subscriptions**
- [ ] Pricing tiers page
- [ ] Subscription management
- [ ] Token top-up purchase
- [ ] Payment integration (Stripe)
- [ ] Invoice generation

#### **7.3: Admin Configuration**
- [ ] Pricing config UI (super admin)
- [ ] Margin multiplier adjustment
- [ ] Per-provider pricing
- [ ] Token allowance by tier

**Estimated Time:** 10-12 hours

---

### **PHASE 7.5: Mobile Deployment** (NEW)
**Goal:** Deploy to iOS TestFlight and Android internal testing

#### **7.5.1: Capacitor Setup**
- [ ] Add Capacitor to project
- [ ] Configure iOS target
- [ ] Configure Android target
- [ ] Test native plugins (if needed)
- [ ] Handle platform-specific UI

#### **7.5.2: iOS Deployment**
- [ ] Create Apple Developer account
- [ ] Configure app signing
- [ ] Set up Fastlane for iOS
- [ ] Build IPA
- [ ] Upload to TestFlight
- [ ] Invite beta testers

#### **7.5.3: Android Deployment**
- [ ] Create Google Play Developer account
- [ ] Configure app signing
- [ ] Set up Fastlane for Android
- [ ] Build APK/AAB
- [ ] Upload to Google Play Internal Testing
- [ ] Invite beta testers

#### **7.5.4: Mobile-Specific Features**
- [ ] Push notifications setup
- [ ] Offline mode (optional)
- [ ] Native sharing
- [ ] Deep linking

**Estimated Time:** 8-12 hours

---

### **PHASE 8: Voice Features (TTS/STT)** (NEW)
**Goal:** Text-to-Speech for script delivery and Speech-to-Text for voice input

#### **8.1: TTS Integration (Script Delivery)**
**Purpose:** AI teacher delivers script blocks via voice

**Options:**
- **Option A: Browser Web Speech API** (Free, no backend)
  - Pros: Built-in, no cost, works offline
  - Cons: Limited voices, no fine control, browser-dependent
  
- **Option B: ElevenLabs API** (Premium quality)
  - Pros: Natural-sounding voices, emotion control, multilingual
  - Cons: Cost per character (~$0.18/1K chars)
  - Integration: REST API
  
- **Option C: Google Cloud Text-to-Speech** (Balanced)
  - Pros: Good quality, many voices, WaveNet options
  - Cons: Cost per character (~$4/1M chars)
  - Integration: REST API
  
- **Option D: Azure Cognitive Services** (Enterprise)
  - Pros: Neural voices, SSML support, many languages
  - Cons: Cost per character (~$4/1M chars)
  - Integration: REST API

**Recommendation:** Start with Option A (Web Speech API) for MVP, add Option B (ElevenLabs) for premium feature.

**Implementation:**
```typescript
// Frontend service
class TTSService {
  speak(text: string, voice?: string): Promise<void> {
    if (environment.ttsProvider === 'browser') {
      return this.browserSpeak(text, voice);
    } else if (environment.ttsProvider === 'elevenlabs') {
      return this.elevenLabsSpeak(text, voice);
    }
  }
  
  browserSpeak(text: string, voice?: string): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = this.getVoice(voice);
    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }
  
  async elevenLabsSpeak(text: string, voiceId: string): Promise<void> {
    const audio = await this.apiService.post('/api/tts/generate', {
      text, voiceId
    });
    return this.playAudio(audio);
  }
}
```

**Tasks:**
- [ ] TTSService in frontend
- [ ] Backend TTS proxy endpoint (for premium APIs)
- [ ] Voice selection UI
- [ ] Play/pause/stop controls during lesson
- [ ] Auto-play script blocks at timeline positions
- [ ] Sync timeline with audio playback
- [ ] Store audio files in MinIO (cache)
- [ ] Token usage tracking for premium TTS

**Settings:**
- [ ] Enable/disable TTS globally
- [ ] Choose TTS provider (user preference)
- [ ] Select voice (male/female, accent, language)
- [ ] Adjust speech rate
- [ ] Adjust pitch

**Testing:**
- [ ] Script block plays via TTS when timeline reaches it
- [ ] User can pause/resume
- [ ] Voice selection works
- [ ] Premium voices work (ElevenLabs)
- [ ] Token usage tracked

**Estimated Time:** 4-6 hours

---

#### **8.2: STT Integration (Voice Input for AI Chat)**
**Purpose:** Users can speak input to AI assistant instead of typing

**Options:**
- **Option A: Browser Web Speech API** (Free, no backend)
  - Pros: Built-in, no cost, real-time
  - Cons: Accuracy varies, requires internet, privacy concerns
  
- **Option B: Whisper API (OpenAI)** (High accuracy)
  - Pros: Excellent accuracy, punctuation, multilingual
  - Cons: Cost per minute (~$0.006/min)
  - Integration: REST API (send audio file)
  
- **Option C: Google Cloud Speech-to-Text** (Enterprise)
  - Pros: Streaming support, high accuracy, speaker diarization
  - Cons: Cost per minute (~$0.016/min standard, $0.048/min enhanced)
  - Integration: gRPC or REST
  
- **Option D: Azure Speech Services** (Enterprise)
  - Pros: Real-time streaming, custom models, multilingual
  - Cons: Cost per hour (~$1/hour standard, $2.50/hour custom)
  - Integration: SDK or REST

**Recommendation:** Start with Option A (Web Speech API) for MVP, add Option B (Whisper) for accuracy.

**Implementation:**
```typescript
// Frontend service
class STTService {
  private recognition: any;
  
  startListening(callback: (text: string) => void): void {
    if (environment.sttProvider === 'browser') {
      this.browserListen(callback);
    } else if (environment.sttProvider === 'whisper') {
      this.whisperListen(callback);
    }
  }
  
  browserListen(callback: (text: string) => void): void {
    this.recognition = new (window as any).webkitSpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    
    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      callback(transcript);
    };
    
    this.recognition.start();
  }
  
  async whisperListen(callback: (text: string) => void): Promise<void> {
    // Record audio from mic
    const audioBlob = await this.recordAudio();
    
    // Send to backend
    const text = await this.apiService.post('/api/stt/transcribe', {
      audio: audioBlob
    });
    
    callback(text);
  }
  
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}
```

**Tasks:**
- [ ] STTService in frontend
- [ ] Backend STT proxy endpoint (for Whisper API)
- [ ] Microphone permission handling
- [ ] Record audio from browser
- [ ] Visual feedback (listening indicator, waveform)
- [ ] Stop/cancel recording
- [ ] Transcription display (interim results)
- [ ] Send transcribed text to AI chat
- [ ] Token usage tracking for premium STT
- [ ] Error handling (mic not available, network issues)

**UI Components:**
- [ ] 🎤 Microphone button in AI chat input
- [ ] Listening indicator (pulsing animation)
- [ ] Interim transcript display
- [ ] Cancel button while recording
- [ ] Voice language selector

**Settings:**
- [ ] Enable/disable STT
- [ ] Choose STT provider
- [ ] Select input language
- [ ] Adjust sensitivity

**Testing:**
- [ ] Click mic button → starts recording
- [ ] Speak → sees interim transcript
- [ ] Stop → final transcript sent to AI chat
- [ ] AI responds to voice input
- [ ] Works in lesson view and lesson builder
- [ ] Token usage tracked

**Estimated Time:** 4-6 hours

---

#### **8.3: Combined Voice Experience**
**Integration of TTS + STT for natural conversation**

**Features:**
- [ ] Voice-only lesson mode (hands-free)
- [ ] AI teacher speaks, student responds via voice
- [ ] Wake word detection (optional, "Hey Teacher")
- [ ] Conversation flow management
- [ ] Interrupt handling (stop TTS when user speaks)
- [ ] Voice-activated commands ("Next", "Repeat", "Skip")

**Testing:**
- [ ] Full lesson via voice (TTS + STT)
- [ ] Natural conversation flow
- [ ] Commands work reliably
- [ ] Interrupts handled gracefully

**Estimated Time:** 2-3 hours

---

### **PHASE 9: Enterprise Features** (FUTURE)
**Goal:** Scale to enterprise customers

#### **9.1: Team Management**
- [ ] Organization/team structure
- [ ] Role-based permissions
- [ ] Invite team members
- [ ] Shared lesson libraries

#### **9.2: Analytics & Reporting**
- [ ] Lesson completion rates
- [ ] Time spent per stage
- [ ] Interaction success rates
- [ ] AI chat engagement metrics
- [ ] Export reports

#### **9.3: White-label**
- [ ] Custom branding
- [ ] Custom domain
- [ ] Logo/color customization

**Estimated Time:** 20-30 hours

---

## 📊 **Current Status**

### **Completed Phases**
- ✅ Phase 0: Foundation
- ✅ Phase 1: Backend Infrastructure
- ✅ Phase 2: Frontend-Backend Integration
- ✅ Phase 3: Real-time Features (WebSocket + AI Chat)
- ✅ Phase 4: Semantic Search & Content Management
- ✅ Phase 4.5.1: Lesson Editor Frontend Core
- ✅ Phase 4.5.2: Lesson Editor Backend Support

### **Current Work**
- ⏳ Phase 4.5.3: Data Persistence Integration (NEXT)

### **Services Status**
```
✅ Frontend: http://localhost:8100 (compiled successfully)
✅ Backend: http://localhost:3000/api (all endpoints running)
✅ Database: PostgreSQL with all tables
✅ Redis: Caching layer ready
✅ MinIO: S3-compatible storage ready
✅ N8N: Workflow automation ready
✅ Weaviate: Vector database initialized
✅ Git: All changes committed and pushed
```

### **Code Statistics**
```
Total Lines Written: ~15,000
- Frontend: ~8,000 lines
- Backend: ~5,000 lines
- Database: ~2,000 lines (SQL)
- Documentation: ~3,000 lines

Components: 25+
Services: 15+
Entities: 12
API Endpoints: 50+
Database Tables: 14
```

---

## 🎯 **Feature Roadmap**

### **Q1 2025 (MVP)**
- [x] Docker infrastructure
- [x] Basic lesson viewing
- [x] Real-time AI chat
- [x] Content management
- [x] Lesson builder core
- [ ] Data persistence (in progress)
- [ ] Content processing
- [ ] Basic interactions

### **Q2 2025 (Beta)**
- [ ] Full Pixi.js interactions
- [ ] N8N workflow integration
- [ ] Token system complete
- [ ] Mobile apps (TestFlight/Internal)
- [ ] TTS/STT MVP (browser-based)

### **Q3 2025 (Launch)**
- [ ] Premium TTS (ElevenLabs)
- [ ] Premium STT (Whisper)
- [ ] Payment integration
- [ ] Analytics dashboard
- [ ] Public launch

### **Q4 2025 (Scale)**
- [ ] Enterprise features
- [ ] White-label options
- [ ] Advanced analytics
- [ ] International expansion

---

## 🔧 **Technical Decisions**

### **Why TEACH Methodology?**
- Research-backed framework
- Clear stage progression
- Cognitive science foundation
- Measurable learning outcomes
- Adaptable to any subject

### **Why Angular + Ionic?**
- Single codebase for web + mobile
- Strong TypeScript support
- Mature ecosystem
- Good performance
- Active community

### **Why NestJS?**
- TypeScript throughout stack
- Clean architecture (modules, services, controllers)
- Excellent TypeORM integration
- Built-in WebSocket support
- Easy to scale

### **Why Weaviate?**
- Native vector search
- GraphQL-like queries
- Fast and scalable
- Good TypeScript client
- Hybrid search (BM25 + vector)

### **Why PostgreSQL RLS?**
- Built-in multi-tenancy
- Database-level security
- No application-level filtering needed
- Performant at scale
- Easy to audit

---

## 📚 **Documentation**

### **Key Documents**
- `README.md` - Quick start guide
- `LESSON_EDITOR_REDESIGN.md` - Detailed lesson editor design
- `LESSON_EDITOR_V2_COMPLETE.md` - Implementation summary
- `UPORA_MASTER_PLAN.md` - This document
- `docker-compose.yml` - Service orchestration
- `package.json` files - Dependencies

### **API Documentation** (TODO)
- Swagger/OpenAPI spec
- Postman collection
- Example requests/responses

---

## 🚀 **Getting Started**

### **Prerequisites**
- Docker & Docker Compose
- Node.js 20+
- Git

### **Quick Start**
```bash
# Clone repository
git clone https://github.com/morgangthunder/BloomixDemo.git
cd BloomixDemo

# Start all services
docker-compose up -d

# Wait for services to be healthy (~60 seconds)

# Access applications
Frontend: http://localhost:8100
Backend: http://localhost:3000/api
N8N: http://localhost:5678
MinIO: http://localhost:9001
```

### **Development Workflow**
```bash
# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Restart service
docker-compose restart frontend

# Rebuild service
docker-compose up -d --build frontend

# Stop all
docker-compose down

# Full reset (removes volumes)
docker-compose down -v
```

---

## 📞 **Support & Contact**

### **Project Owner**
- GitHub: @morgangthunder
- Repository: https://github.com/morgangthunder/BloomixDemo

### **Issue Tracking**
- GitHub Issues for bugs
- GitHub Discussions for features
- Pull requests welcome

---

## 📝 **License**
[Add your license here]

---

## 🎉 **Summary**

Upora is a comprehensive AI-powered learning platform built on solid pedagogical principles (TEACH methodology) with modern tech stack (Angular, NestJS, PostgreSQL, Weaviate) and cross-platform delivery (web + mobile).

**Current Status:** Phase 4.5.3 (Data Persistence Integration)

**Next Milestone:** Complete Lesson Editor with full data persistence and content processing (8-10 hours remaining)

**Long-term Vision:** Enterprise-ready platform with voice interactions, mobile apps, and advanced analytics

---

**Last Updated:** October 23, 2025  
**Version:** 1.0  
**Status:** Phase 4.5.3 In Progress

