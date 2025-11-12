# Database Access Guide

## Connection Details

- **Container:** `upora-postgres`
- **Database:** `upora_dev`
- **User:** `upora_user`
- **Password:** `upora_password`
- **Port:** `5432`

## Quick Commands

### List All Tables
```powershell
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "\dt"
```

### View Lessons
```powershell
# List all lessons
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT id, title, category, difficulty, status FROM lessons ORDER BY title;"

# View specific lesson JSON
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT jsonb_pretty(data) FROM lessons WHERE id = '30000000-0000-0000-0000-000000000099';"

# Export lesson to file
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT jsonb_pretty(data) FROM lessons WHERE id = 'LESSON_ID';" > lesson-data.json
```

### View Lesson Drafts
```powershell
# List all pending drafts
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT id, lesson_id, status, changes_count, created_at FROM lesson_drafts WHERE status = 'pending';"

# View draft details
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT jsonb_pretty(draft_data) FROM lesson_drafts WHERE id = 'DRAFT_ID';"
```

### View Content Sources
```powershell
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT id, title, type, status FROM content_sources ORDER BY created_at DESC LIMIT 10;"
```

### View LLM Usage
```powershell
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT account_id, model, SUM(prompt_tokens) as total_prompt, SUM(completion_tokens) as total_completion, SUM(estimated_cost) as total_cost FROM llm_generation_logs GROUP BY account_id, model;"
```

### View Interaction Results
```powershell
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "SELECT interaction_type, AVG(score) as avg_score, COUNT(*) as attempts FROM interaction_results GROUP BY interaction_type;"
```

## Interactive psql Shell

```powershell
docker exec -it upora-postgres psql -U upora_user -d upora_dev
```

Once in psql:
- `\dt` - list tables
- `\d table_name` - describe table
- `\q` - quit

## Common Queries

### Update Lesson Data
```sql
UPDATE lessons 
SET data = '{...json...}'::jsonb 
WHERE id = 'LESSON_ID';
```

### Create New Lesson
```sql
INSERT INTO lessons (tenant_id, title, description, category, difficulty, duration_minutes, data, status, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'New Lesson Title',
  'Description here',
  'Science',
  'Beginner',
  30,
  '{"structure": {"stages": []}}'::jsonb,
  'pending',
  '00000000-0000-0000-0000-000000000011'
);
```

### Delete Draft
```sql
DELETE FROM lesson_drafts WHERE id = 'DRAFT_ID';
```

### Approve All Pending Lessons (Dev Only)
```sql
UPDATE lessons 
SET status = 'approved', 
    approved_by = '00000000-0000-0000-0000-000000000010',
    approved_at = NOW()
WHERE status = 'pending';
```

## Database Schema Notes

### Lessons Table Key Fields
- `id` - UUID primary key
- `tenant_id` - For multi-tenancy
- `data` - JSONB containing complete lesson structure
- `status` - 'pending' | 'approved' | 'rejected'
- `view_count`, `completion_count`, `rating_average` - Analytics

### Lesson JSON Structure (in `data` field)
```json
{
  "structure": {
    "stages": [
      {
        "id": "stage-1",
        "title": "Stage Title",
        "type": "tease|educate|activate|build|hone",
        "subStages": [
          {
            "id": "substage-1-1",
            "title": "Substage Title",
            "scriptBlocks": [
              {
                "id": "script-1",
                "text": "What the teacher says",
                "idealTimestamp": 0,
                "estimatedDuration": 10,
                "playbackRules": {
                  "canSkip": true,
                  "autoPlay": true,
                  "displayIfMissed": "asap"
                }
              }
            ],
            "interaction": {
              "type": "true-false-selection",
              "config": { ... }
            },
            "scriptBlocksAfterInteraction": [
              {
                "id": "script-post",
                "text": "Great job! You scored {score}%",
                "triggerCondition": "interactionComplete"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Lesson IDs in Database

| ID | Title | Category | Status |
|----|-------|----------|--------|
| `30000000-0000-0000-0000-000000000001` | Introduction to Python | Programming | approved |
| `30000000-0000-0000-0000-000000000002` | JavaScript Fundamentals | Programming | approved |
| `30000000-0000-0000-0000-000000000003` | Advanced React Patterns | Programming | pending |
| `30000000-0000-0000-0000-000000000004` | Incomplete Lesson | Programming | rejected |
| `30000000-0000-0000-0000-000000000010` | Company Training: Sales 101 | Business | approved |
| `30000000-0000-0000-0000-000000000099` | Photosynthesis Basics | Science | approved |

## Backup & Restore

### Backup Database
```powershell
docker exec upora-postgres pg_dump -U upora_user upora_dev > backup.sql
```

### Restore Database
```powershell
Get-Content backup.sql | docker exec -i upora-postgres psql -U upora_user -d upora_dev
```

### Reset Database (Dangerous!)
```powershell
docker exec -i upora-postgres psql -U upora_user -d upora_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
# Then restart container to re-run init scripts
docker restart upora-postgres
```

---

**Last Updated:** November 12, 2025  
**Version:** Frontend v0.3.3, Backend v0.3.0

