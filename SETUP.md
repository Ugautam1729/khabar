# Khabar - Deployment Guide

## Step 1: Free Database (neon.tech)
1. Go to neon.tech → Sign up free
2. Create project → name it "khabar"
3. Copy the connection string → looks like:
   postgresql://user:pass@ep-xxx.neon.tech/khabar
4. Save it — you need it in Step 2

## Step 2: Deploy Backend (render.com) — FREE
1. Push this code to GitHub
2. Go to render.com → New Web Service → connect your repo
3. Set these:
   - Build Command: npm install -g pnpm && pnpm install && pnpm --filter @workspace/api-server run build
   - Start Command: node artifacts/api-server/dist/index.mjs
4. Add Environment Variables:
   - DATABASE_URL = (your neon URL from Step 1)
   - JWT_SECRET = (any long random string, e.g. "myappsecret123changethis456")
   - OPENAI_API_KEY = (from platform.openai.com — needed for AI chat feature)
   - NODE_ENV = production
   - PORT = 3000
5. Click Deploy → wait 5 mins
6. You get a URL like https://khabar-api.onrender.com → SAVE THIS

## Step 3: Run Database Migrations
Once backend is deployed, open terminal in this folder and run:
   DATABASE_URL=your_neon_url pnpm --filter @workspace/db run push

## Step 4: Update App API URL
Open: artifacts/khabar/.env
Change: EXPO_PUBLIC_API_URL=https://your-khabar-api.onrender.com
(use the URL from Step 2)

## Step 5: Build Android APK
Install Node.js from nodejs.org, then run:
   npm install -g eas-cli
   eas login
   cd artifacts/khabar
   eas build -p android --profile preview

Download the APK from the link EAS gives you.

## Step 6: Play Store
- Pay $25 one-time at play.google.com/console
- Upload APK → fill details → submit

## Environment Variables Summary
| Variable | Where to get it |
|---|---|
| DATABASE_URL | neon.tech |
| JWT_SECRET | Any random string |
| OPENAI_API_KEY | platform.openai.com |
| EXPO_PUBLIC_API_URL | Your render.com URL |
