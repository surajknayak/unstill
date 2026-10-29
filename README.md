# UnStill

**Everyday movement that fits real life.**

UnStill is a zero-cost, offline-first daily movement coach for adults who sit at a desk or want gentle, guilt-free daily activity. Each day provides one tailored main session, 2 to 5 short movement resets placed inside your active work window, a 5-point posture check, condition care cards, and a shareable Daily Boost quote.

## Features & Free-Plan Architecture

- **100% Rule-Based & Zero Paid APIs**: All daily plans, condition adaptations, and safety checks are computed deterministically on-device with no paid services, Cloud Functions, or runtime AI keys.
- **Offline-First + Firebase Spark Free Tier**: Works immediately in the browser using IndexedDB (`uid`-scoped local cache) and syncs with **Firebase Authentication** (Google & Anonymous) and **Cloud Firestore** on the free **Spark plan** (no credit card or billing required).

## Environment Variables

Configure these in `.env` for local overrides or in **GitHub Settings → Secrets and variables → Actions → Variables** for GitHub Pages builds (falls back to `firebase-applet-config.json` when unset):

- `VITE_FIREBASE_API_KEY` — Firebase Web API key
- `VITE_FIREBASE_AUTH_DOMAIN` — Firebase Auth domain (e.g. `your-project.firebaseapp.com`)
- `VITE_FIREBASE_PROJECT_ID` — Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` — Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` — Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` — Firebase web app ID
- `VITE_FIREBASE_DATABASE_ID` — Firestore database ID (optional; defaults to `(default)` or the configured named database)
- `GITHUB_PAGES_BASE` — Base path for subpath hosting (e.g. `/unstill/`, defaults to `/`)

## Setup & Deploying to GitHub Pages

1. **Firebase Spark Setup**:
   - Create a free Firebase project on the **Spark plan**.
   - Enable **Authentication** with **Google** and **Anonymous** sign-in providers.
   - Create a **Cloud Firestore** database and publish the rules from [`firestore.rules`](./firestore.rules).
2. **GitHub Pages Configuration**:
   - In your GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
   - Under **Settings → Secrets and variables → Actions → Variables**, add the `VITE_FIREBASE_*` variables listed above.
   - Push to `main` (or trigger **Deploy UnStill to GitHub Pages** manually in the **Actions** tab). The workflow automatically builds with `GITHUB_PAGES_BASE=/<repo-name>/` and copies `dist/index.html` to `dist/404.html` so SPA refreshes and deep links work cleanly.
3. **Authorise Your Domain**:
   - Add `<username>.github.io` under **Firebase Console → Authentication → Settings → Authorized domains** (and in your Browser API key's allowed HTTP referrers in Google Cloud Console if website restrictions are enabled).

## Local Development Commands

- `npm install` — Install dependencies
- `npm run dev` — Start local development server at `http://localhost:3000`
- `npx vitest run` — Run unit tests
- `npm run build` — Build production bundle (`GITHUB_PAGES_BASE=/unstill/ npm run build` for subpath verification)
