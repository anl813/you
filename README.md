# YouTube Comment Helper (Safe)

A simple, **ToS-friendly** web app that helps you comment faster on your friend's latest YouTube uploads.  
It **does not** auto-post or increase views/likes. It only fetches uploads, stores your comment bank, and opens the video with your selected comment copied.  
An optional **Chrome extension** is included to **auto-fill (not post)** the comment box when you open a YouTube video from the app.

## Features
- Fetch latest videos/shorts using **YouTube Data API v3**.
- Upload **PDF/TXT/CSV** with pre-written comments.
- One-click **Copy & Open**.
- Track which **account** you used (manual tracking only).

## Quick Start (Local)
1. Install Node.js (https://nodejs.org/)
2. Create a React app (or just use this one):
   ```bash
   npm install
   npm start
   ```
3. Open http://localhost:3000

## Deploy to Vercel (Free)
1. Create a GitHub repo and **push this folder**.
2. Go to https://vercel.com → **New Project** → Import your repo.
3. Framework preset: **Create React App** (auto-detected).
4. Click **Deploy**.
5. Open your URL: `https://your-app.vercel.app`

## Setup in the App
- **API Key**: Get from Google Cloud Console → Enable *YouTube Data API v3* → create an **API key**.
- **Channel ID**: Find it in your friend's channel URL, e.g. `https://youtube.com/channel/UCxxxxxxx`.
- Press **Fetch Latest** and you’re good.

## Chrome Extension (Auto-fill Comment Box) – Optional
The bundle includes `/yt-comment-autofill-extension` with a **Manifest V3** extension.  
It auto-fills the comment box using the comment provided in the URL hash (e.g., `#ych_comment=Great%20video`).  
**You still click Post manually.**

### Install the Extension
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** → select the `/yt-comment-autofill-extension` folder.
4. Done.

### How It Works
- When you click **Copy & Open** in the app, we open YouTube like:
  `https://www.youtube.com/watch?v=VIDEO_ID#ych_comment=Your%20text`
- The content script reads `ych_comment` from the hash and tries to auto-fill the composer.

### Notes
- YouTube often changes its DOM; the selector targets the standard simplebox editor.
- If it doesn’t auto-fill immediately, click the **Comment** box once; the script retries a few times.

## Disclaimer
This tool is for **manual assistance** only. Respect YouTube’s Terms of Service.
