# How to Check MinIO/S3 for Saved Images

## Option 1: MinIO Web UI (Recommended for Local Development)

If you're using MinIO locally (via Docker), you can access the MinIO web interface:

1. **Access MinIO Console:**
   - URL: `http://localhost:9001` (or the port configured in your docker-compose.yml)
   - Default credentials:
     - Username: `minioadmin`
     - Password: `minioadmin`

2. **Navigate to Buckets:**
   - Click on the bucket name (default: `upora-uploads`)
   - Navigate to the `images/` folder
   - You'll see folders organized by account ID: `images/{accountId}/`
   - Inside each account folder, you'll find the generated images

3. **View/Download Images:**
   - Click on any image file to view it
   - Use the download button to save it locally
   - Check file metadata (size, type, creation date)

## Option 2: MinIO CLI (mc)

If you have the MinIO client (`mc`) installed:

```bash
# Configure MinIO alias
mc alias set myminio http://localhost:9000 minioadmin minioadmin

# List buckets
mc ls myminio

# List images in the bucket
mc ls myminio/upora-uploads/images/

# List images for a specific account
mc ls myminio/upora-uploads/images/{accountId}/

# Download an image
mc cp myminio/upora-uploads/images/{accountId}/generated-1234567890.png ./downloaded-image.png
```

## Option 3: Database Query

Check the `generated_images` table in PostgreSQL:

```sql
-- View all generated images
SELECT 
  id,
  lesson_id,
  account_id,
  image_url,
  width,
  height,
  prompt,
  created_at
FROM generated_images
ORDER BY created_at DESC;

-- View images for a specific lesson
SELECT * FROM generated_images 
WHERE lesson_id = 'your-lesson-id'
ORDER BY created_at DESC;

-- View images for a specific account
SELECT * FROM generated_images 
WHERE account_id = 'your-account-id'
ORDER BY created_at DESC;
```

## Option 4: API Endpoint

Use the API endpoint to retrieve images programmatically:

```bash
# Get all images for a lesson
curl -X GET "http://localhost:3000/api/image-generator/lesson/{lessonId}?accountId={accountId}" \
  -H "x-user-id: {userId}" \
  -H "x-tenant-id: {tenantId}"

# Response will include image URLs that point to MinIO/S3
```

## Option 5: Browser Developer Tools

1. Generate an image using the SDK Test interaction
2. Check the browser console for the image URL:
   ```
   [InteractionAISDK] Image saved to: http://localhost:9000/upora-uploads/images/{accountId}/generated-1234567890.png
   ```
3. Open the URL directly in your browser to view the image

## Image Storage Structure

Images are stored with the following structure:

```
upora-uploads/
  └── images/
      └── {accountId}/
          ├── generated-{timestamp}.png
          ├── generated-{timestamp}.jpg
          └── ...
```

Where:
- `{accountId}` is the UUID of the account that created the lesson or generated the image
- Files are named with `generated-{timestamp}.{extension}` format
- Extensions are based on the MIME type (`.png`, `.jpg`, `.gif`)

## Environment Variables

Make sure these are set in your `.env` file:

```env
STORAGE_TYPE=s3
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=upora-uploads
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_USE_SSL=false
S3_PUBLIC_URL=http://localhost:9000
```

## Troubleshooting

**Images not appearing in MinIO:**
- Check that `STORAGE_TYPE=s3` is set
- Verify MinIO is running: `docker ps | grep minio`
- Check backend logs for storage errors
- Ensure the bucket exists: `mc ls myminio/upora-uploads`

**Can't access MinIO Console:**
- Check docker-compose.yml for the correct port mapping
- Verify MinIO service is running
- Try accessing via the internal Docker network URL if needed

**Image URLs not working (403 Forbidden):**
- Check `S3_PUBLIC_URL` is set correctly
- For MinIO, ensure the URL uses `localhost` (not `minio`) for browser access
- Verify CORS is configured if accessing from a different origin
- **Fix 403 errors:** Configure MinIO bucket policy to allow public read access:
  1. Open MinIO Console: `http://localhost:9001`
  2. Go to Buckets → `upora-uploads` → Access Policy
  3. Set to "Public" or "Custom" with read-only access
  4. Or use MinIO CLI:
     ```bash
     mc anonymous set download myminio/upora-uploads
     ```
  5. Configure CORS (if needed):
     ```bash
     mc cors set download myminio/upora-uploads
     ```
  6. Or set bucket policy via MinIO Console → Buckets → `upora-uploads` → Access Policy → "Public"

**Alternative: Use Signed URLs (Current Implementation)**
- The backend now generates signed URLs automatically
- Signed URLs are valid for 7 days
- No bucket policy changes needed if using signed URLs
- If still getting 403, check that the signed URL endpoint matches the public endpoint (localhost:9000)

