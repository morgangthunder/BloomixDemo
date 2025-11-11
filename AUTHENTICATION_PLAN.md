# Authentication & Authorization Implementation Plan

**Status:** Planning Phase  
**Priority:** High (Required for Production)  
**Estimated Effort:** 5-7 days  
**Target:** Post-MVP, Pre-Production

---

## Current State (MVP)

### **Authentication:**
- ❌ No real authentication
- ⚠️ Mock user ID and tenant ID from `environment.ts`
- ⚠️ Role hardcoded in `environment.userRole`

### **Authorization:**
- ⚠️ Frontend role-based UI hiding (buttons, navigation)
- ❌ Backend endpoints do NOT validate roles
- ❌ No permission checks on content approval, deletion, etc.

### **Security Gaps:**
1. Anyone can call backend endpoints directly (e.g., via Postman)
2. Users can approve their own content by calling the API
3. No session management or token expiration
4. Tenant isolation relies on headers, not authenticated claims

---

## Target State (Production-Ready)

### **Authentication Provider:**
**Primary:** Amazon Cognito (as per master plan)

**Why Cognito:**
- ✅ Managed service (no password storage, account recovery, MFA)
- ✅ JWT-based tokens with standard claims
- ✅ Supports custom attributes (`tenantId`, `role`)
- ✅ Integrates with AWS ecosystem (S3, RDS, API Gateway)
- ✅ Social login support (Google, Facebook, etc.)
- ✅ User pools for multi-tenancy

**Alternative Providers (Extensible):**
- OAuth2 (company SSO for enterprise clients)
- SAML (corporate identity providers)
- Custom JWTs (external auth systems)
- Guest mode (public instances with `AUTH_PROVIDER=none`)

---

## Implementation Phases

### **Phase 1: Backend JWT Validation (2-3 days)**

#### **1.1: Install Dependencies**
```bash
cd Upora/backend
npm install @nestjs/passport passport passport-jwt jwks-rsa
npm install --save-dev @types/passport-jwt
```

#### **1.2: Create Auth Module**
**File:** `backend/src/modules/auth/auth.module.ts`

**Features:**
- JWT strategy using Cognito public keys
- Token validation middleware
- User claims extraction (`userId`, `tenantId`, `role`)

**Example:**
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksClient({
        cache: true,
        rateLimit: true,
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
      }),
      algorithms: ['RS256']
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      tenantId: payload['custom:tenantId'],
      role: payload['custom:role'],
      email: payload.email,
    };
  }
}
```

#### **1.3: Create Role Guards**
**File:** `backend/src/common/guards/roles.guard.ts`

**Guards:**
- `@Roles('admin', 'super-admin')` decorator
- `RolesGuard` to check user role from JWT claims
- Applied to sensitive endpoints (approve, reject, delete, super-admin routes)

**Example:**
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT validation

    return requiredRoles.some(role => user.role === role);
  }
}
```

#### **1.4: Apply Guards to Endpoints**
**Files to Update:**
- `content-sources.controller.ts` → Approve/Reject need admin role
- `lesson-editor.controller.ts` → Approve processed content needs admin
- `super-admin.controller.ts` → All routes need super-admin role
- `llm-providers.controller.ts` → All routes need super-admin role
- `ai-prompts.controller.ts` → All routes need super-admin role

**Example:**
```typescript
@Controller('content-sources')
export class ContentSourcesController {
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super-admin')
  approve(@Param('id') id: string, @Req() req) {
    const approvedBy = req.user.userId; // From validated JWT
    return this.service.approve(id, approvedBy, req.user.tenantId);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super-admin')
  reject(@Param('id') id: string, @Body('reason') reason: string, @Req() req) {
    return this.service.reject(id, reason, req.user.userId, req.user.tenantId);
  }
}
```

#### **1.5: Update Tenant Isolation**
**Current:** Headers (`x-tenant-id`, `x-user-id`) are trusted  
**Target:** Extract from validated JWT claims only

**Changes:**
- Remove header-based `tenantId` and `userId` parameters
- Use `req.user.tenantId` and `req.user.userId` from JWT validation
- Enforce tenant isolation in all database queries

---

### **Phase 2: Frontend Cognito Integration (2-3 days)**

#### **2.1: Install AWS Amplify**
```bash
cd Upora/frontend
npm install @aws-amplify/auth @aws-amplify/core
```

#### **2.2: Create Auth Service**
**File:** `frontend/src/app/core/services/auth.service.ts`

**Features:**
- Login/logout/signup via Cognito
- Token refresh before expiration
- Store JWT in memory (not localStorage for security)
- Emit auth state changes (logged in/out)

**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  async login(email: string, password: string): Promise<User> {
    const cognitoUser = await Auth.signIn(email, password);
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();
    
    const user = this.parseUserFromToken(token);
    this.currentUserSubject.next(user);
    return user;
  }

  async logout(): Promise<void> {
    await Auth.signOut();
    this.currentUserSubject.next(null);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();
      return this.parseUserFromToken(token);
    } catch {
      return null;
    }
  }

  getToken(): Promise<string> {
    return Auth.currentSession()
      .then(session => session.getIdToken().getJwtToken());
  }
}
```

#### **2.3: Update API Service**
**File:** `frontend/src/app/core/services/api.service.ts`

**Changes:**
- Replace hardcoded headers with JWT token
- Inject `AuthService` to get current token
- Add `Authorization: Bearer <token>` header
- Handle 401 (redirect to login) and 403 (show error)

**Example:**
```typescript
private async getHeaders(): Promise<HttpHeaders> {
  let headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  try {
    const token = await this.authService.getToken();
    headers = headers.set('Authorization', `Bearer ${token}`);
  } catch (error) {
    console.warn('[API] No auth token available');
  }

  return headers;
}
```

#### **2.4: Create Auth Guard**
**File:** `frontend/src/app/core/guards/auth.guard.ts`

**Features:**
- Protect routes that require authentication
- Redirect to login if not authenticated
- Check role for admin/super-admin routes

**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const user = await this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    const requiredRoles = route.data['roles'];
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}
```

#### **2.5: Create Login Page**
**File:** `frontend/src/app/features/auth/login.component.ts`

**Features:**
- Email/password form
- "Forgot password" link
- Error handling (wrong credentials, account locked, etc.)
- Redirect to intended route after login

#### **2.6: Apply Guards to Routes**
**File:** `frontend/src/app/app.routes.ts`

**Example:**
```typescript
{
  path: 'lesson-builder',
  canActivate: [AuthGuard],
  data: { roles: ['lesson-builder', 'admin', 'super-admin'] },
  loadComponent: () => import('./features/lesson-builder/...')
},
{
  path: 'super-admin',
  canActivate: [AuthGuard],
  data: { roles: ['super-admin'] },
  loadComponent: () => import('./features/super-admin/...')
},
```

---

### **Phase 3: Cognito User Pool Setup (1 day)**

#### **3.1: Create User Pool**
**AWS Console:**
1. Navigate to Amazon Cognito
2. Create User Pool: `upora-users-prod`
3. Configure:
   - Sign-in: Email
   - MFA: Optional (recommended for admins)
   - Password policy: Strong (min 8 chars, uppercase, lowercase, numbers)
   - Custom attributes:
     - `tenantId` (string, mutable)
     - `role` (string, mutable)
4. Create App Client: `upora-web-app`
   - Enable: Cognito User Pools authentication
   - Token expiration: 1 hour (ID/Access), 30 days (Refresh)

#### **3.2: Create User Groups**
**Groups (map to roles):**
- `super-admins` → Can access everything
- `admins` → Can approve content for their tenant
- `lesson-builders` → Can create lessons
- `interaction-builders` → Can create interaction types
- `students` → Can take lessons only

#### **3.3: Configure Environment Variables**
**File:** `frontend/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.upora.com',
  authProvider: 'cognito',
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_XXXXXXXXX',
    userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxx',
  },
  // Remove mock values:
  // userRole: 'super-admin', ← DELETE
  // defaultUserId: '...', ← DELETE
  // tenantId: '...', ← DELETE
};
```

---

### **Phase 4: Multi-Tenancy & Enterprise Auth (2 days)**

#### **4.1: Tenant-Specific User Pools (Optional)**
**Option A:** Single user pool with `custom:tenantId` attribute  
**Option B:** Separate user pool per enterprise client (more isolated)

**Recommendation:** Option A (simpler, more cost-effective)

#### **4.2: External Authentication Support**
**For Enterprise Clients:**

**OAuth2/SAML Integration:**
```typescript
// Check AUTH_PROVIDER environment variable
if (environment.authProvider === 'external') {
  // Validate external JWT
  // Extract tenantId and userId from custom claims
  // Map to internal user record
}
```

**Example External JWT Claims:**
```json
{
  "sub": "external-user-123",
  "email": "user@company.com",
  "custom:tenantId": "client-abc",
  "custom:role": "lesson-builder",
  "iss": "https://company.com/oauth"
}
```

#### **4.3: Guest Access (Public Mode)**
**For Public Instances:**

```typescript
if (environment.publicMode && environment.authProvider === 'none') {
  // Allow unauthenticated access to approved lessons
  // Track usage with session IDs
  // Disable content creation
}
```

---

## Security Considerations

### **Critical Backend Validations to Add**

#### **1. Content Approval Endpoints**
**File:** `backend/src/modules/content-sources/content-sources.controller.ts`

```typescript
@Post(':id/approve')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super-admin')
async approve(
  @Param('id', ParseUUIDPipe) id: string,
  @Req() req: AuthenticatedRequest,
) {
  const { userId, tenantId, role } = req.user;
  
  // Additional validation: Ensure user can't approve their own content
  const contentSource = await this.service.findOne(id, tenantId);
  
  if (contentSource.createdBy === userId && role !== 'super-admin') {
    throw new ForbiddenException('You cannot approve your own content');
  }
  
  return this.service.approve(id, userId, tenantId);
}

@Post(':id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super-admin')
async reject(
  @Param('id', ParseUUIDPipe) id: string,
  @Body('reason') reason: string,
  @Req() req: AuthenticatedRequest,
) {
  const { userId, tenantId } = req.user;
  return this.service.reject(id, reason, userId, tenantId);
}
```

#### **2. Super-Admin Endpoints**
**File:** `backend/src/modules/super-admin/super-admin.controller.ts`

```typescript
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin') // Apply to entire controller
export class SuperAdminController {
  // All methods automatically protected
}
```

#### **3. LLM Provider Management**
**File:** `backend/src/modules/llm-providers/llm-providers.controller.ts`

```typescript
@Controller('super-admin/llm-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin')
export class LlmProvidersController {
  // Only super-admins can manage LLM credentials
}
```

#### **4. AI Prompts Management**
**File:** `backend/src/modules/ai-prompts/ai-prompts.controller.ts`

```typescript
@Controller('ai-prompts')
export class AiPromptsController {
  @Get()
  @UseGuards(JwtAuthGuard) // Anyone can read
  async findAll() { ... }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super-admin') // Only super-admin can edit
  async updateContent() { ... }
}
```

#### **5. Lesson Creation**
**File:** `backend/src/modules/lessons/lessons.controller.ts`

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('lesson-builder', 'admin', 'super-admin')
async create(@Body() dto: CreateLessonDto, @Req() req: AuthenticatedRequest) {
  return this.service.create({
    ...dto,
    createdBy: req.user.userId, // From JWT, not headers
    tenantId: req.user.tenantId,
  });
}
```

---

## Data Model Updates

### **User Entity Changes**
**File:** `backend/src/entities/user.entity.ts`

**Add Fields:**
```typescript
@Column('varchar', { name: 'cognito_sub', unique: true, nullable: true })
cognitoSub: string; // Cognito user ID (sub claim)

@Column('varchar', { name: 'auth_provider', default: 'cognito' })
authProvider: 'cognito' | 'oauth2' | 'saml' | 'custom'; // Auth source

@Column('jsonb', { nullable: true, name: 'auth_metadata' })
authMetadata: {
  externalUserId?: string;
  idpName?: string; // e.g., "Google", "Okta", "AzureAD"
  lastLoginAt?: string;
  mfaEnabled?: boolean;
}; // Provider-specific data
```

### **Session/Token Management**
**Optional Table:** `user_sessions`

**Purpose:** Track active sessions, revoke tokens, detect anomalies

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  token_jti VARCHAR(255) UNIQUE, -- JWT ID claim
  device_info JSONB, -- Browser, OS, IP
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL
);
```

---

## Testing Plan

### **Unit Tests**
- JWT validation with valid/invalid/expired tokens
- Role guard with different user roles
- Tenant isolation (user A can't access tenant B's data)

### **Integration Tests**
- Login flow → Get token → Call protected endpoint
- Refresh token flow
- Logout → Token invalidation

### **E2E Tests**
- User creates content → Admin approves → User views
- Lesson-builder tries to approve own content → 403 Forbidden
- Non-admin accesses super-admin page → Redirect to login/403

---

## Migration Strategy

### **Step 1: Add Auth Without Breaking Current System**
1. Add JWT validation as **optional** (`@UseGuards(OptionalJwtAuthGuard)`)
2. If no JWT, fall back to headers (for local dev)
3. Log all requests showing auth method used

### **Step 2: Create Admin Accounts in Cognito**
1. Create super-admin user in Cognito
2. Set `custom:tenantId` and `custom:role` attributes
3. Test login and token generation

### **Step 3: Enable Required Auth for Production**
1. Change `OptionalJwtAuthGuard` to `JwtAuthGuard`
2. Remove header fallback
3. Update frontend to always send JWT

### **Step 4: Migrate Existing Users**
**Script:** `backend/src/scripts/migrate-users-to-cognito.ts`

```typescript
async function migrateUsers() {
  const users = await userRepository.find();
  
  for (const user of users) {
    // Create in Cognito
    const cognitoUser = await cognito.adminCreateUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: user.email,
      UserAttributes: [
        { Name: 'email', Value: user.email },
        { Name: 'custom:tenantId', Value: user.tenantId },
        { Name: 'custom:role', Value: user.role },
      ],
      TemporaryPassword: generateSecurePassword(),
    });
    
    // Update local DB with Cognito sub
    user.cognitoSub = cognitoUser.User.Attributes.find(a => a.Name === 'sub').Value;
    await userRepository.save(user);
    
    // Send welcome email with temp password
    await sendWelcomeEmail(user.email, tempPassword);
  }
}
```

---

## Configuration by Deployment Type

### **Local Development**
```env
AUTH_PROVIDER=none
# OR
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=us-east-1_DEVPOOL
COGNITO_CLIENT_ID=xxxxx
```

### **Staging/Production**
```env
AUTH_PROVIDER=cognito
COGNITO_USER_POOL_ID=us-east-1_PRODPOOL
COGNITO_CLIENT_ID=xxxxx
COGNITO_REGION=us-east-1
JWT_VERIFY_ISSUER=true
```

### **Enterprise Client (Private Instance)**
```env
AUTH_PROVIDER=external
EXTERNAL_JWT_ISSUER=https://client.okta.com
EXTERNAL_JWT_AUDIENCE=upora-enterprise
PUBLIC_MODE=false
TENANT_ID=client-xyz # Locked to specific tenant
```

### **Public Instance**
```env
AUTH_PROVIDER=none
PUBLIC_MODE=true
TENANT_ID=public # Special public tenant
ALLOW_ANONYMOUS_LESSONS=true
DISABLE_CONTENT_CREATION=true
```

---

## Rollout Checklist

- [ ] Backend: Install JWT dependencies
- [ ] Backend: Create Auth module with JWT strategy
- [ ] Backend: Create Roles guard
- [ ] Backend: Apply guards to all sensitive endpoints
- [ ] Backend: Add validation to prevent self-approval
- [ ] Backend: Update tenant isolation to use JWT claims
- [ ] Frontend: Install AWS Amplify
- [ ] Frontend: Create Auth service
- [ ] Frontend: Update API service to use JWT tokens
- [ ] Frontend: Create Login/Signup pages
- [ ] Frontend: Create Auth guard for routes
- [ ] Frontend: Apply guards to protected routes
- [ ] AWS: Create Cognito User Pool
- [ ] AWS: Create user groups (super-admins, admins, lesson-builders, etc.)
- [ ] AWS: Create initial super-admin account
- [ ] Testing: Write auth unit tests
- [ ] Testing: Write auth E2E tests
- [ ] Migration: Create script to migrate existing users to Cognito
- [ ] Documentation: Update deployment guide with auth setup
- [ ] Documentation: Create user management guide

---

## Risk Mitigation

### **Risk 1: Downtime During Migration**
**Mitigation:** Use dual-mode authentication (JWT OR headers) during transition

### **Risk 2: Users Locked Out**
**Mitigation:** 
- Keep admin backdoor (emergency super-admin account)
- Implement password reset flow before go-live
- Test with small user group first

### **Risk 3: Token Expiration UX**
**Mitigation:**
- Implement silent token refresh (before expiration)
- Show friendly "Session expired, please log in" message
- Save form data before redirect to login

### **Risk 4: Cost of Cognito**
**Mitigation:**
- Free tier: 50,000 MAU (Monthly Active Users)
- Estimated cost: $0.0055/MAU after free tier
- For 10,000 users: ~$0 (within free tier)

---

## Success Criteria

✅ **Authentication:**
- Users log in with email/password via Cognito
- JWT tokens generated and validated
- Tokens refresh automatically before expiration
- Logout invalidates session

✅ **Authorization:**
- Lesson-builders can create lessons but not approve
- Admins can approve content but not access super-admin features
- Super-admins have full access
- Users cannot approve their own content (unless super-admin)

✅ **Multi-Tenancy:**
- `tenantId` comes from authenticated JWT claims only
- Row-Level Security enforced in database
- No cross-tenant data leakage

✅ **Security:**
- All sensitive endpoints protected with guards
- JWT tokens validated on every request
- Role checks prevent privilege escalation
- No hardcoded credentials in code

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Backend JWT Validation | 2-3 days | None |
| Frontend Cognito Integration | 2-3 days | Phase 1 complete |
| Cognito Setup & Testing | 1 day | AWS account |
| Multi-Tenancy & Enterprise | 2 days | Phase 1-3 complete |
| **Total** | **7-10 days** | |

---

## Post-Implementation

### **Monitoring:**
- Track failed login attempts (detect brute force)
- Monitor token refresh rates
- Alert on unusual role changes
- Log all approval/rejection actions for audit

### **User Management UI:**
- Super-admin page to create/edit users
- Assign roles and tenant IDs
- Reset passwords
- View login history

### **Compliance:**
- GDPR: User data export/deletion
- CCPA: Data access requests
- Audit logs: All sensitive actions logged

---

## Notes

- **Current workaround is acceptable for MVP/local development**
- **Production deployment REQUIRES full auth implementation**
- **Start with Phase 1 (backend validation) for quickest security wins**
- **Cognito pricing is negligible for small-medium deployments**
- **Multi-tenancy and external auth are critical for enterprise sales**

---

**Last Updated:** November 11, 2025  
**Status:** Ready for Implementation  
**Owner:** TBD

