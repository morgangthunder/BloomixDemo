# Interaction Types Reference - Complete Specification

**Version:** 1.0  
**Date:** November 2025  
**Status:** Specification for Implementation

---

## Table of Contents
1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Interaction Type Registry](#interaction-type-registry)
4. [Lesson JSON Schema](#lesson-json-schema)
5. [Shared Asset Library](#shared-asset-library)
6. [LLM Generation Strategy](#llm-generation-strategy)
7. [Implementation Priority](#implementation-priority)

---

## Overview

This document defines all interaction types for the Upora AI lessons platform. Each interaction:
- Can be used in **any TEACH stage** (stage mapping is suggestive, not restrictive)
- Has a **JSON schema** for input data validation
- Includes an **LLM generation prompt** for auto-creation from content sources
- Specifies **mobile adaptations** for responsive UX
- Returns a **normalized score (0-100)** for analytics
- Supports **public gallery opt-in** for student-created work

### Key Features
- ✅ **20 Interaction Types** mapped to TEACH methodology
- ✅ **LLM Auto-Generation** from content sources (text, URLs, PDFs, images)
- ✅ **Image Generation** via Grok for missing visuals
- ✅ **Shared Asset Library** for sprites, backgrounds, effects
- ✅ **User-Generated Content** with public gallery and AI moderation
- ✅ **0-100 Scoring** across all interactions for consistency
- ✅ **Mobile-First** design with touch/tap adaptations

---

## Core Principles

### 1. Flexibility Over Rigidity
- **Any interaction can be used in any stage/sub-stage**
- TEACH stage recommendations guide but don't restrict
- Lesson builders (human or AI) choose best fit

### 2. LLM-First Architecture
- **Default:** LLM auto-generates interaction inputs from content sources
- **Fallback:** Manual creation if LLM confidence < 0.7 or content unsuitable
- **Enhancement:** Lesson builders can edit AI-generated outputs

### 3. Progressive Media Strategy
- **Extract from content:** URLs, embedded images, video timestamps
- **AI-generate missing media:** Grok image generation for visualizations
- **Manual upload:** Lesson builders can replace/upload custom images

### 4. Shared Asset Library
- **Generic reusable sprites:** Characters, backgrounds, UI elements, effects
- **Per-interaction customization:** Override defaults with content-specific assets
- **AI-generated supplements:** Grok creates custom sprites if needed

### 5. User-Generated Content (UGC)
- **Default:** Private to student's account
- **Opt-in public gallery:** Students choose to share after creation
- **AI moderation:** Grok scans for inappropriate content → auto-flag/private
- **Community flagging:** Students can report inappropriate public work
- **Tenant isolation:** Gallery filtered by tenant (enterprise) or global (public mode)

### 6. Accessibility & Simplicity
- **One mode per interaction:** No complex accessibility variations (MVP)
- **Simple as possible:** Prioritize clarity over feature richness
- **Touch-first:** All interactions work on mobile/tablet

### 7. Analytics & Scoring
- **Normalized 0-100 score:** Every interaction returns consistent score
- **Performance tracking:** Scores stored per student/interaction/lesson
- **Weakness detection:** Used for adaptive interactions (e.g., Exit Bridge)

---

## TEACH Stage Mapping (Suggestive)

| TEACH Stage | Sub-Stages | Recommended Interaction Types |
|-------------|-----------|-------------------------------|
| **TEASE** | Trigger, Ignite, Evoke | Mystery Reveal, Explosive Poll, Memory Lane Timeline |
| **EXPLORE** | Handle, Uncover, Noodle, Track | Physics Sandbox, Card Clue Peeler, Scratch-Off Explorer, Prediction Branching, Anomaly Hunter |
| **ABSORB** | Interpret, Show, Parallel | Paraphrase Builder, Topic Spinner, True/False Fragment Builder, Concept Checker, Bridge Matcher |
| **CULTIVATE** | Grip, Repurpose, Originate | Skill Drill Arcade, Scenario Remix Sorter, Blank Canvas Creator, Stepping Stones |
| **HONE** | Verify, Evaluate, Target | Retrieval Race, Reflection Blocks, Exit Bridge Maze |

**Total:** 20 unique interaction types

---

*This document continues in INTERACTION_TYPES_DETAILED.md with full JSON schemas for each type.*

