# Google OAuth Setup Guide

The Google Cloud Console should now be open in your browser. Follow these steps:

## Step 1: Create OAuth Credentials

1. **Select or Create a Project**
   - If you don't have a project, click "Create Project"
   - Name it "Restaurant Inventory" or similar
   - Click "Create"

2. **Enable Google+ API** (if not already enabled)
   - Go to "Library" in the sidebar
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth Client ID**
   - Go back to "Credentials"
   - Click "+ CREATE CREDENTIALS"
   - Select "OAuth client ID"

4. **Configure OAuth Consent Screen** (if prompted)
   - User Type: External
   - App name: Restaurant Inventory
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Save and Continue" (default scopes are fine)
   - Test users: Add your email
   - Click "Save and Continue"

5. **Create OAuth Client**
   - Application type: **Web application**
   - Name: Restaurant Inventory Production

6. **Add Authorized Redirect URIs**
   Add BOTH of these URLs (copy exactly):
   ```
   https://restaurant-inventory-three.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

7. **Click "CREATE"**

8. **Copy Your Credentials**
   A dialog will appear with:
   - Client ID (looks like: xxxxx.apps.googleusercontent.com)
   - Client secret (random string)

   **KEEP THIS DIALOG OPEN** or copy both values immediately!

---

## Step 2: Add Credentials to Environment

Once you have your Google OAuth credentials, run these commands in your terminal:

### For Local Development:

Edit `/Users/brunograndi/Desktop/restaurant-inventory/.env.local` and replace:
- `your-google-client-id.apps.googleusercontent.com` with your actual Client ID
- `your-google-client-secret` with your actual Client Secret

### For Production (Vercel):

Run these commands (replace with your actual values):

```bash
cd /Users/brunograndi/Desktop/restaurant-inventory

# Add Google Client ID
vercel env add GOOGLE_CLIENT_ID production
# When prompted, paste your Client ID

# Add Google Client Secret
vercel env add GOOGLE_CLIENT_SECRET production
# When prompted, paste your Client Secret
```

---

## Step 3: Trigger Redeploy

After adding the environment variables to Vercel:

```bash
vercel --prod
```

Or trigger a redeploy from Vercel dashboard:
https://vercel.com/bgrandibgrandi/restaurant-inventory

---

## Step 4: Test the Setup

1. **Local Testing:**
   - Make sure .env.local has your Google credentials
   - Run: `npm run dev`
   - Visit: http://localhost:3000
   - Click "Continue with Google"
   - Sign in with your Google account

2. **Production Testing:**
   - Visit: https://restaurant-inventory-three.vercel.app
   - Click "Continue with Google"
   - Sign in with your Google account
   - You should be redirected to /dashboard

---

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the redirect URI in Google Console exactly matches:
  `https://restaurant-inventory-three.vercel.app/api/auth/callback/google`
- No trailing slashes, exact match required

**Error: "Invalid client"**
- Double-check Client ID and Secret are correct
- Make sure environment variables are set in Vercel
- Trigger a new deployment after adding env vars

**Still having issues?**
- Check Vercel logs: https://vercel.com/bgrandibgrandi/restaurant-inventory/logs
- Make sure you added env vars to "Production" environment, not "Preview"

---

## Environment Variables Summary

Your Vercel production environment should have:

✅ `NEXTAUTH_SECRET` = +WYnzOoigjky1qnPrShNCmIGOzEtDUU+lFborR1z1Tk=
✅ `NEXTAUTH_URL` = https://restaurant-inventory-three.vercel.app
⏳ `GOOGLE_CLIENT_ID` = (your Google Client ID)
⏳ `GOOGLE_CLIENT_SECRET` = (your Google Client Secret)
✅ `DATABASE_URL` = (already configured by Vercel)

Once all are set, trigger a redeploy and you're ready to go!
