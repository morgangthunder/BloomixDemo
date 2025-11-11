# LLM Call Monitoring & Alerting Plan

**Purpose:** Ensure ALL LLM API calls are tracked for cost management  
**Priority:** Critical  
**Status:** Immediate Action Required

---

## Current Issue

### **Problem Identified:**
Auto-Populator service is making Grok API calls successfully but **failing to log token usage** to the database.

**Evidence from Logs:**
```
[AutoPopulator] ✅ Auto-populated: "How Televisions Work..."
[AutoPopulator] 📊 Tokens used: 1988, Time: 8425ms
[AutoPopulator] ❌ Failed to log token usage:
null value in column "user_id" violates not-null constraint
```

**Impact:**
- 💸 **Lost cost tracking** - Cannot bill/monitor LLM usage accurately
- 📊 **Incomplete dashboard** - LLM Usage page shows $0.00 when actual costs occurred
- ⚠️ **No visibility** - Admin doesn't know how much is being spent

---

## Root Cause Analysis

### **Missing Fields:**
The `llm_generation_logs` table requires:
- `user_id` (NOT NULL)
- `tenant_id` (NOT NULL)

**But auto-populate calls might be missing these headers!**

Let me check the controller:
```typescript
@Post('auto-populate/text')
async autoPopulateText(
  @Body('textContent') textContent: string,
  @Headers('x-user-id') userId: string,      // ← Could be undefined!
  @Headers('x-tenant-id') tenantId: string,  // ← Could be undefined!
) { ... }
```

**Issue:** If frontend doesn't send `x-user-id` or `x-tenant-id` headers, they're `undefined`.

---

## Immediate Fixes (Required)

### **Fix 1: Validate Headers in Controller**
**File:** `backend/src/modules/content-sources/content-sources.controller.ts`

```typescript
@Post('auto-populate/text')
@HttpCode(HttpStatus.OK)
async autoPopulateText(
  @Body('textContent') textContent: string,
  @Headers('x-user-id') userId: string,
  @Headers('x-tenant-id') tenantId: string,
) {
  // VALIDATE required headers
  if (!userId || !tenantId) {
    throw new BadRequestException(
      `Missing required headers: x-user-id=${userId || 'MISSING'}, x-tenant-id=${tenantId || 'MISSING'}`
    );
  }

  console.log('[ContentSourcesController] ✨ Auto-populating text content fields...', {
    userId,
    tenantId,
    textLength: textContent?.length || 0
  });
  
  const result = await this.autoPopulatorService.autoPopulateText(textContent, userId, tenantId);
  return result;
}
```

### **Fix 2: Add Fallback Logging**
**File:** `backend/src/services/auto-populator.service.ts`

**If token logging fails, log to a fallback location:**

```typescript
private async logTokenUsage(...) {
  try {
    // Normal DB logging
    await this.llmLogRepository.save({ ... });
  } catch (error) {
    // FALLBACK: Log to file system or console
    this.logger.error('[AutoPopulator] ❌ CRITICAL: Token usage NOT logged to DB!', {
      tokensUsed,
      useCase,
      userId: userId || 'MISSING',
      tenantId: tenantId || 'MISSING',
      error: error.message
    });
    
    // Write to emergency log file
    fs.appendFileSync(
      './logs/emergency-token-usage.log',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        tokensUsed,
        useCase,
        userId,
        tenantId,
        error: error.message
      }) + '\n'
    );
    
    // RE-THROW to alert caller
    throw error;
  }
}
```

### **Fix 3: Frontend Must Always Send Headers**
**File:** `frontend/src/app/core/services/api.service.ts`

**Current:**
```typescript
if (this.tenantId) {
  headers = headers.set('x-tenant-id', this.tenantId);
}
```

**Should be:**
```typescript
// ALWAYS set tenant ID and user ID (REQUIRED for cost tracking)
const tenantId = this.tenantId || environment.tenantId || 'UNKNOWN';
const userId = this.getUserId() || environment.defaultUserId || 'UNKNOWN';

if (!tenantId || tenantId === 'UNKNOWN') {
  console.error('[API] ❌ CRITICAL: No tenant ID available!');
}
if (!userId || userId === 'UNKNOWN') {
  console.error('[API] ❌ CRITICAL: No user ID available!');
}

headers = headers.set('x-tenant-id', tenantId);
headers = headers.set('x-user-id', userId);
```

---

## Monitoring & Alerting System

### **Real-Time Monitoring**

#### **1. LLM Call Interceptor**
**Create:** `backend/src/common/interceptors/llm-monitoring.interceptor.ts`

**Purpose:** Wrap ALL LLM calls to ensure they're logged

```typescript
@Injectable()
export class LlmMonitoringInterceptor implements NestInterceptor {
  private callsInFlight = new Map<string, { timestamp: number; useCase: string }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const callId = `llm-${Date.now()}-${Math.random()}`;
    const useCase = context.getHandler().name;
    
    this.callsInFlight.set(callId, {
      timestamp: Date.now(),
      useCase
    });

    return next.handle().pipe(
      tap(() => {
        // Call completed - should have logged
        this.callsInFlight.delete(callId);
      }),
      catchError(error => {
        // Call failed
        this.callsInFlight.delete(callId);
        throw error;
      })
    );
  }

  // Periodic check for orphaned calls
  @Cron('*/5 * * * *') // Every 5 minutes
  checkForUnloggedCalls() {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [callId, call] of this.callsInFlight.entries()) {
      if (now - call.timestamp > staleThreshold) {
        console.error('[LLM Monitor] ⚠️ ALERT: Potential unlogged LLM call!', {
          callId,
          useCase: call.useCase,
          age: now - call.timestamp
        });
      }
    }
  }
}
```

#### **2. Daily Cost Report**
**Create:** `backend/src/services/llm-monitoring.service.ts`

```typescript
@Injectable()
export class LlmMonitoringService {
  @Cron('0 9 * * *') // Every day at 9 AM
  async sendDailyCostReport() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const logs = await this.llmLogRepository.find({
      where: {
        createdAt: MoreThanOrEqual(yesterday)
      }
    });

    const totalTokens = logs.reduce((sum, log) => sum + log.tokensUsed, 0);
    const totalCalls = logs.length;
    const byUseCase = logs.reduce((acc, log) => {
      acc[log.useCase] = (acc[log.useCase] || 0) + log.tokensUsed;
      return acc;
    }, {});

    // Calculate cost
    const provider = await this.getDefaultProvider();
    const estimatedCost = (totalTokens / 1000000) * provider.costPerMillionTokens;

    this.logger.warn('[LLM Monitor] 📊 Daily Report:', {
      date: yesterday.toISOString().split('T')[0],
      totalCalls,
      totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
      byUseCase
    });

    // Send alert if cost exceeds threshold
    if (estimatedCost > 10.00) {
      this.sendCostAlert(estimatedCost, totalTokens);
    }
  }
}
```

#### **3. Missing Log Detection**
**Query to Find Gaps:**

```sql
-- Find LLM calls that might not have been logged
-- (Heuristic: Check for successful API responses without corresponding log entries)

SELECT 
  DATE(created_at) as date,
  COUNT(*) as logged_calls,
  SUM(tokens_used) as total_tokens
FROM llm_generation_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Compare with actual API call count from monitoring
```

---

## Dashboard Enhancements

### **Add Alert Indicators**
**File:** `frontend/src/app/features/super-admin/llm-token-usage.component.ts`

**Visual Alerts:**
1. **Red banner** if any calls failed to log
2. **Warning icon** if cost exceeds budget
3. **Last sync timestamp** to show data freshness

**Example:**
```html
<!-- Alert Banner -->
<div *ngIf="loggingErrors > 0" class="alert alert-danger">
  ⚠️ WARNING: {{ loggingErrors }} LLM calls failed to log!
  Cost data may be incomplete.
  <button (click)="viewFailedLogs()">View Details</button>
</div>

<!-- Data Freshness -->
<div class="data-status">
  Last updated: {{ lastSyncTime | date:'short' }}
  <button (click)="refreshData()" class="btn-refresh">↻ Refresh</button>
</div>
```

### **Failed Logs Table**
**New Section:** Show calls that failed to log

```typescript
interface FailedLogEntry {
  timestamp: Date;
  useCase: string;
  estimatedTokens: number;
  error: string;
  userId?: string;
  tenantId?: string;
}
```

---

## Cost Tracking Integrity Checks

### **Validation Queries**

#### **1. Check for Missing Logs (Last 24 Hours)**
```sql
-- This should return 0 if all calls are logged
SELECT COUNT(*) as potentially_unlogged
FROM (
  -- Heuristic: Any auto-populate success without matching log
  SELECT 'auto-populate' as source, created_at
  FROM content_sources
  WHERE type = 'text' 
    AND created_at >= NOW() - INTERVAL '24 hours'
) calls
LEFT JOIN llm_generation_logs logs ON DATE_TRUNC('minute', calls.created_at) = DATE_TRUNC('minute', logs.created_at)
WHERE logs.id IS NULL;
```

#### **2. Verify Cost Calculation**
```sql
SELECT 
  use_case,
  COUNT(*) as calls,
  SUM(tokens_used) as total_tokens,
  ROUND((SUM(tokens_used)::DECIMAL / 1000000) * 5.00, 4) as estimated_cost_usd
FROM llm_generation_logs
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY use_case
ORDER BY total_tokens DESC;
```

---

## Action Items (Immediate)

### **Priority 1: Fix Auto-Populator Logging (TODAY)**
- [x] Add validation in `autoPopulateText` controller method
- [x] Add detailed error logging in `logTokenUsage`
- [ ] Test auto-fill → Verify log entry created
- [ ] Check dashboard shows updated costs

### **Priority 2: Add Logging to All LLM Services (THIS WEEK)**
**Services to Audit:**
- ✅ `ContentAnalyzerService` → Already logs
- ⚠️ `AutoPopulatorService` → Logging failing (fix in progress)
- ❓ `ChatService` (AI Tutor) → Check if logging
- ❓ `ScaffolderService` (Future) → Not implemented yet
- ❓ `InteractionGeneratorService` (Future) → Not implemented yet

### **Priority 3: Dashboard Improvements (THIS WEEK)**
- [ ] Add "Failed Logs" alert banner
- [ ] Add "Last Synced" timestamp
- [ ] Add refresh button
- [ ] Show warning if cost > $10/day
- [ ] Email alert if daily cost > $50

### **Priority 4: Audit Trail (NEXT WEEK)**
- [ ] Create `llm_audit_log` table for all attempts (success + failure)
- [ ] Log BEFORE calling LLM API (with estimated tokens)
- [ ] Update log AFTER call completes (with actual tokens)
- [ ] Flag mismatches (estimated vs actual > 20%)

---

## Emergency Response Plan

### **If Cost Spike Detected:**
1. **Check dashboard:** Identify high-usage accounts/use-cases
2. **Review recent calls:** Check `llm_generation_logs` for anomalies
3. **Temporary rate limiting:** Add per-user daily token limit
4. **Disable auto-fill:** If runaway costs, disable auto-populator temporarily
5. **Switch provider:** If one provider is expensive, switch to cheaper alternative

### **If Logging Failure Detected:**
1. **Check database:** Verify `llm_generation_logs` table exists and is accessible
2. **Check constraints:** Verify `user_id` and `tenant_id` are being passed
3. **Enable fallback:** Write to file system if DB unavailable
4. **Alert admin:** Send email/Slack notification immediately

---

## Implementation Checklist

### **Logging Integrity:**
- [ ] All LLM services MUST log token usage
- [ ] Failed logs MUST trigger alerts
- [ ] Fallback logging to file system if DB fails
- [ ] Validation that `userId` and `tenantId` are present

### **Monitoring:**
- [ ] Daily cost reports via cron job
- [ ] Real-time dashboard with refresh button
- [ ] Alert if cost exceeds threshold
- [ ] Weekly summary emails to admins

### **Testing:**
- [ ] Unit test: Token logging with valid/invalid data
- [ ] Integration test: LLM call → Verify log entry created
- [ ] E2E test: Auto-fill → Check dashboard updates
- [ ] Failure test: Simulate DB down → Verify fallback works

---

## Cost Thresholds & Alerts

### **Daily Limits:**
| Account Type | Daily Tokens | Daily Cost | Action if Exceeded |
|-------------|-------------|------------|-------------------|
| Student | 10,000 | $0.05 | Soft limit (warning) |
| Lesson-Builder | 100,000 | $0.50 | Hard limit (block) |
| Admin | 500,000 | $2.50 | Alert only |
| Super-Admin | Unlimited | N/A | Alert if > $50 |

### **System-Wide:**
- **Warning at:** $10/day
- **Critical alert at:** $50/day
- **Emergency shutdown at:** $200/day (prevents runaway costs)

---

## Notes

- **This is CRITICAL for production** - cannot go live without reliable cost tracking
- **All LLM calls must be accounted for** - no exceptions
- **Failed logging should BLOCK the LLM call** - better to fail loudly than lose cost data
- **Implement ASAP** - even for MVP, cost visibility is essential

---

**Status:** 🔴 **CRITICAL BUG** - Token logging failing for auto-populate calls  
**Next Action:** Fix immediately and verify all calls are logged

