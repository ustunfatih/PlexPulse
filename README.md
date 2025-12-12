<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1mAV94V701xkFZGZU3rgUAUNiSICd5L7-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key. If your hosting provider only allows plain
   `GEMINI_API_KEY`, the build now maps it automatically for the client bundle.
3. (Optional) Configure `VITE_PLEX_PROXY_URL` to point to a backend that can forward Plex requests to avoid browser CORS issues.
4. Run the app:
   `npm run dev`

> Deployed builds (e.g., Vercel) need the `VITE_GEMINI_API_KEY` env var exposed to the client. If the AI Analysis tile still reports a missing or billing-disabled key, click **Set API Key** in the AI Analysis card to store your key securely in your browser's local storage.
