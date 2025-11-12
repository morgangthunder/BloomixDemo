# Quick Container Restart Commands

## Frontend Only (Fast - when code changes)

```powershell
# Option 1: Just restart (if files are mounted correctly)
docker restart upora-frontend

# Option 2: Rebuild and restart (when package.json or config changes)
docker-compose up -d --build frontend

# Option 3: Full rebuild without cache (when everything else fails)
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

## Clear Angular Cache Before Restart

```powershell
# Clear cache inside container
docker exec upora-frontend rm -rf /app/.angular/cache

# Then restart
docker restart upora-frontend
```

## Backend Only

```powershell
docker restart upora-backend
```

## All Services

```powershell
docker-compose restart
```

## Check Status

```powershell
# See what's running
docker ps

# See frontend logs (last 20 lines)
docker logs upora-frontend --tail 20

# Follow frontend logs in real-time
docker logs upora-frontend --follow

# Check if server is ready
docker logs upora-frontend --tail 5 | Select-String "Local:"
```

## Browser Cache

After container restart, in browser:
- **Hard Refresh:** `Ctrl + Shift + R`
- **Clear cache:** `Ctrl + Shift + Delete`
- **Incognito:** `Ctrl + Shift + N`

## Version Check

After restart, browser console should show:
```
🔥🔥🔥 FRONTEND VERSION 0.3.5 LOADED 🔥🔥🔥
🔥🔥🔥 LESSON EDITOR VERSION 3.5.0 - MM:SS TIME INPUT 🔥🔥🔥
```

If still showing old version (0.3.0), the container didn't rebuild properly.

## Common Issues

### Issue: Container keeps using old code
**Solution:** The volume mount is caching. Rebuild without cache:
```powershell
docker-compose down frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Issue: Build succeeds but browser shows old version
**Solution:** Browser cache. Hard refresh or use incognito window.

### Issue: Container won't start / keeps exiting
**Solution:** Check logs for errors:
```powershell
docker logs upora-frontend --tail 50
```

Common errors:
- `Unknown argument` - Invalid flag in package.json scripts
- `EADDRINUSE` - Port 8100 already in use
- `Module not found` - npm install needed in container

---

**Quick Reference:**
- Frontend: `http://localhost:8100`
- Backend: `http://localhost:3000`
- Container: `upora-frontend`
- Version: 0.3.5

