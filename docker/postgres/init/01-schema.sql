-- Upora AI Lessons Platform - Database Schema
-- PostgreSQL 15+ with Row-Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM ('student', 'lesson-builder', 'interaction-builder', 'admin');

-- Approval status for content
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Authentication providers
CREATE TYPE auth_provider AS ENUM ('cognito', 'external', 'none');

-- =====================================================
-- TABLES
-- =====================================================

-- Users table with multi-tenancy
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    auth_provider auth_provider DEFAULT 'cognito',
    external_user_id VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    token_limit INTEGER DEFAULT 10000,
    token_usage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lessons table with approval workflow
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category VARCHAR(100),
    difficulty VARCHAR(50),
    duration_minutes INTEGER,
    data JSONB NOT NULL, -- Stages, substages, prompts, interaction configs
    status approval_status DEFAULT 'pending',
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    view_count INTEGER DEFAULT 0,
    completion_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Interaction Types table (Pixi.js configs)
CREATE TABLE interaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    config JSONB NOT NULL, -- Pixi.js configuration, inputs, events
    status approval_status DEFAULT 'pending',
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    usage_count INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    price_cents INTEGER DEFAULT 0,
    version VARCHAR(20) DEFAULT '1.0.0',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- n8n Workflows table
CREATE TABLE interaction_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    interaction_type_id UUID REFERENCES interaction_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_json JSONB NOT NULL, -- n8n workflow definition
    input_format JSONB NOT NULL, -- Expected input schema
    output_format JSONB NOT NULL, -- Expected output schema
    status approval_status DEFAULT 'pending',
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP,
    webhook_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for commissions
CREATE TABLE usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'lesson', 'interaction_type', 'workflow'
    resource_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'view', 'complete', 'interaction', 'workflow_execution'
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    commission_cents INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Token tracking for Grok API
CREATE TABLE token_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    usage_type VARCHAR(50) NOT NULL, -- 'ai_chat', 'content_processing', 'code_assistance'
    resource_type VARCHAR(50), -- 'lesson', 'workflow', etc.
    resource_id UUID,
    tokens_used INTEGER NOT NULL,
    cost_cents INTEGER DEFAULT 0,
    request_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User session tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    progress JSONB DEFAULT '{}', -- Current stage, substage, etc.
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Commission payouts
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_cents INTEGER NOT NULL,
    stripe_payout_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
    paid_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Lessons indexes
CREATE INDEX idx_lessons_tenant_id ON lessons(tenant_id);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_lessons_created_by ON lessons(created_by);
CREATE INDEX idx_lessons_category ON lessons(category);
CREATE INDEX idx_lessons_tags ON lessons USING GIN(tags);
CREATE INDEX idx_lessons_created_at ON lessons(created_at DESC);

-- Interaction types indexes
CREATE INDEX idx_interaction_types_tenant_id ON interaction_types(tenant_id);
CREATE INDEX idx_interaction_types_status ON interaction_types(status);
CREATE INDEX idx_interaction_types_created_by ON interaction_types(created_by);

-- Workflows indexes
CREATE INDEX idx_workflows_tenant_id ON interaction_workflows(tenant_id);
CREATE INDEX idx_workflows_status ON interaction_workflows(status);
CREATE INDEX idx_workflows_interaction_type_id ON interaction_workflows(interaction_type_id);

-- Usages indexes
CREATE INDEX idx_usages_tenant_id ON usages(tenant_id);
CREATE INDEX idx_usages_user_id ON usages(user_id);
CREATE INDEX idx_usages_creator_id ON usages(creator_id);
CREATE INDEX idx_usages_resource ON usages(resource_type, resource_id);
CREATE INDEX idx_usages_created_at ON usages(created_at DESC);

-- Token tracking indexes
CREATE INDEX idx_token_tracking_tenant_id ON token_tracking(tenant_id);
CREATE INDEX idx_token_tracking_user_id ON token_tracking(user_id);
CREATE INDEX idx_token_tracking_created_at ON token_tracking(created_at DESC);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY tenant_isolation_users ON users
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- RLS Policies for lessons table
CREATE POLICY tenant_isolation_lessons ON lessons
    FOR ALL
    USING (
        tenant_id = current_setting('app.tenant_id', true)::uuid
        OR current_setting('app.public_mode', true)::boolean = true
    );

-- RLS Policies for interaction_types table
CREATE POLICY tenant_isolation_interaction_types ON interaction_types
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- RLS Policies for workflows table
CREATE POLICY tenant_isolation_workflows ON interaction_workflows
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- RLS Policies for usages table
CREATE POLICY tenant_isolation_usages ON usages
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- RLS Policies for token_tracking table
CREATE POLICY tenant_isolation_token_tracking ON token_tracking
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- RLS Policies for user_sessions table
CREATE POLICY tenant_isolation_sessions ON user_sessions
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- RLS Policies for payouts table
CREATE POLICY tenant_isolation_payouts ON payouts
    FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interaction_types_updated_at BEFORE UPDATE ON interaction_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON interaction_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update token usage
CREATE OR REPLACE FUNCTION update_token_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET token_usage = token_usage + NEW.tokens_used
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_token_usage AFTER INSERT ON token_tracking
    FOR EACH ROW EXECUTE FUNCTION update_token_usage();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for approved lessons (public mode)
CREATE VIEW approved_lessons AS
SELECT 
    l.*,
    u.first_name || ' ' || u.last_name AS creator_name,
    u.avatar_url AS creator_avatar
FROM lessons l
LEFT JOIN users u ON l.created_by = u.id
WHERE l.status = 'approved';

-- View for user earnings
CREATE VIEW user_earnings AS
SELECT 
    creator_id,
    tenant_id,
    COUNT(*) AS total_usages,
    SUM(commission_cents) AS total_earnings_cents,
    DATE_TRUNC('month', created_at) AS month
FROM usages
WHERE creator_id IS NOT NULL
GROUP BY creator_id, tenant_id, DATE_TRUNC('month', created_at);

-- View for token usage summary
CREATE VIEW token_usage_summary AS
SELECT 
    user_id,
    tenant_id,
    usage_type,
    COUNT(*) AS request_count,
    SUM(tokens_used) AS total_tokens,
    SUM(cost_cents) AS total_cost_cents,
    DATE_TRUNC('day', created_at) AS day
FROM token_tracking
GROUP BY user_id, tenant_id, usage_type, DATE_TRUNC('day', created_at);

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant permissions (adjust as needed for your app user)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO upora_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO upora_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO upora_user;

