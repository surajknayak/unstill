# Habit Flow — Self-Guided Daily Movement Coach

Habit Flow is a zero-cost, browser-based daily movement coach for adults who sit at a desk or want gentle, guilt-free daily activity. Each day provides one main workout, 3 to 5 three-minute resets placed inside your break windows, a 5-point posture check, condition care cards, and a shareable Daily Boost quote.

## Owner Setup Steps (Firebase Spark Free Plan)

1. **Create a free Firebase project** on the **Spark plan** (no credit card or billing required).
   - Enable **Authentication** with **Google** and **Anonymous** providers.
   - Create a **Cloud Firestore** database in production mode and paste the rules from `firestore.rules`.
2. **Configure environment variables**:
   Copy your Firebase web app config values into `.env` (or GitHub Actions repository variables):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_DATABASE_ID` (optional; defaults to `(default)` if empty)
3. **Authorise your GitHub Pages domain**:
   After deployment, add `username.github.io` under **Firebase Console → Authentication → Settings → Authorised domains**.
4. **Custom Illustrations (Optional)**:
   Drop `.webp` illustrations (under 100 KB, ~800 px wide) into `/public/media/{name}.webp` (e.g. `hero-welcome.webp`, `hero-today.webp`, `moves/seated-cat-cow.webp`). Missing assets automatically fall back to the built-in category SVG illustration placeholders.

## Firestore Security Rules (`firestore.rules`)

See [`firestore.rules`](./firestore.rules) for the complete user-isolated ruleset enforcing `request.auth != null && request.auth.uid == uid` with strict schema validation.

## Commands

- `npm run dev` — Start development server
- `npx vitest run` — Run unit tests for the rule-based Plan Engine
- `npm run build` — Build production bundle
