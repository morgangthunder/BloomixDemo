# YouTube OAuth 2.0 Setup Guide

This guide will help you set up OAuth 2.0 credentials to access YouTube captions/transcripts.

## Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project**
   - Create a new project or select an existing one
   - Note the project name for reference

3. **Enable YouTube Data API v3**
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"

## Step 2: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - Navigate to "APIs & Services" → "OAuth consent screen"

2. **Choose User Type**
   - Select "External" (unless you have a Google Workspace account)
   - Click "Create"

3. **Fill Required Fields**
   - **App name**: Upora AI Lessons
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - Click "Save and Continue"

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Search for and add: `https://www.googleapis.com/auth/youtube.readonly`
   - Click "Update" then "Save and Continue"

5. **Add Test Users (if External)**
   - Add your email address as a test user
   - Click "Save and Continue"

6. **Review and Submit**
   - Review the information
   - Click "Back to Dashboard"

## Step 3: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Navigate to "APIs & Services" → "Credentials"

2. **Create OAuth 2.0 Client ID**
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"

3. **Configure Application**
   - **Name**: Upora AI Lessons
   - **Authorized JavaScript origins**: 
     - `http://localhost:8100`
     - `http://localhost:4200` (if using Angular dev server)
   - **Authorized redirect URIs**:
     - `http://localhost:8100/oauth/callback`
     - `http://localhost:4200/oauth/callback` (if using Angular dev server)

4. **Create and Download**
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

## Step 4: Update Environment Configuration

1. **Open Environment File**
   - Edit: `Upora/frontend/src/environments/environment.ts`

2. **Update OAuth Credentials**
   ```typescript
   // YouTube OAuth 2.0 credentials
   youtubeClientId: 'YOUR_ACTUAL_CLIENT_ID_HERE',
   youtubeClientSecret: 'YOUR_ACTUAL_CLIENT_SECRET_HERE',
   ```

3. **Save the File**

## Step 5: Test the Setup

1. **Start the Development Server**
   ```bash
   cd Upora/frontend
   npm start
   ```

2. **Navigate to Lesson Editor**
   - Go to a lesson editor page
   - Click on "Content Processing" tab
   - Click "🔗 Paste URL"

3. **Test OAuth Flow**
   - Paste a YouTube URL
   - Click "Process"
   - You should be redirected to Google OAuth
   - Complete the authentication
   - You should be redirected back to the app

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Make sure the redirect URI in Google Console matches exactly: `http://localhost:8100/oauth/callback`

2. **"Access blocked"**
   - Make sure you added your email as a test user in the OAuth consent screen

3. **"Invalid client"**
   - Double-check that the Client ID and Client Secret are correct in environment.ts

4. **"Scope not authorized"**
   - Make sure you added the `https://www.googleapis.com/auth/youtube.readonly` scope

### Testing with Different URLs:

- **Development**: `http://localhost:8100`
- **Angular Dev Server**: `http://localhost:4200`
- **Production**: Your actual domain

Make sure to add all the URLs you'll use to the authorized origins and redirect URIs.

## Security Notes

- **Never commit credentials to version control**
- **Use environment variables in production**
- **Rotate credentials regularly**
- **Monitor API usage in Google Cloud Console**

## Next Steps

Once OAuth is set up, you'll be able to:
- ✅ Access YouTube video captions/transcripts
- ✅ Process YouTube URLs with real transcript data
- ✅ Use the full YouTube Data API v3 capabilities

The OAuth flow will automatically handle token refresh and re-authentication as needed.



