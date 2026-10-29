# UnStill: Improvement Round 1 (paste this whole prompt into Google AI Studio)

You are updating the existing app (currently called "Habit Flow"). **Do not rebuild it.** Apply only the changes below, keep every working flow, and keep the existing look (sky #2EB8F5 / aqua #27C8E8 / mint #5EE6B0 / sun #FFD24D / coral #FF7A59 / lavender #B9A6FF, dark ink #0F2A3A, glass cards, 28px radii, Plus Jakarta Sans + Inter). Hard rules: zero cost (no paid service, no API keys, no Cloud Functions, no runtime AI), free Firebase Spark only, keep the existing Firestore named database and `VITE_FIREBASE_DATABASE_ID` setup, keep existing storage keys and internal IDs unchanged so saved data is not lost. Every visual change must match the current theme in BOTH light and dark mode.

Work through the sections in order. When finished, give me a short checklist saying which items are done and which are not.

---

## 1. Rename to "UnStill" and new logo

- Rename every visible "Habit Flow" to **UnStill** (title bar, header label, splash, welcome, About, privacy policy, PWA manifest name/short_name, share text, calendar .ics product id, page `<title>`). Do not change internal IDs, Firestore collection names or localStorage/IndexedDB keys.
- Tagline: **"Everyday movement that fits real life."** Show on splash and welcome.
- Logo (inline SVG, no image files, transparent background, works at 16 px): the app's existing sky/aqua gradient tile with a white mark made of **two concentric open rings** (a large ring and a slightly smaller one, rotated so their gaps do not line up, round line caps, like a movement that never settles), plus one small mint dot sitting in the gap of the outer ring as the "step". It must feel like "not still". No text inside the tile. Stroke width at least 6% of the tile.
- Wordmark: "UnStill" in Plus Jakarta Sans ExtraBold, with the "Un" in the lavender-to-sky tone and "Still" in dark ink (light mode) / white (dark mode). Header shows the 40 px tile plus small caps "UNSTILL".
- Replace the logo on splash (keep SPLASH_MIN_MS = 2500, once per launch), header, welcome, favicon, apple-touch-icon and manifest icons (generate 192 and 512 PNG from the SVG at build or inline SVG data URLs). Splash: gentle 1.2 s ring-rotation intro, disabled when `prefers-reduced-motion`.

## 2. Onboarding: remove default values and unneeded fields

**2.1 Time zone and language.** Remove the Language field completely (the app is English only for now). Time zone: replace the free-text/"ABC" field with a **searchable dropdown of IANA time zones**, default selected **Asia/Kolkata (India, IST, UTC+05:30)**. If the browser reports a different zone via `Intl.DateTimeFormat().resolvedOptions().timeZone`, preselect that, otherwise IST. Show the label as "Time zone (used so reminders and your day reset at the right time)". Use it for reminder times, the .ics file and the midnight streak rollover.

**2.2 "Anything bothering you?" (conditions + severity).**
- **No pre-selected chips.** Today "Lower back" and "Neck and shoulders" appear selected by default; start with nothing selected. The "None" chip clears everything else, and selecting any other chip unselects "None". Continue is enabled when at least one chip or "None" is chosen (Skip still allowed).
- **No default severity.** For each selected area show the slider unset (no thumb value, text "Tap to rate 0 to 10"), "How long?" unset with a placeholder "Choose", and "Getting worse?" with neither Yes nor No selected. Continue is blocked until each selected area has a rating, a duration and a Yes/No (show a small inline hint on the missing item). Severity 7 or more, or "Getting worse = Yes", still triggers the existing safety notice.
- Same rule everywhere: **no field in onboarding may have a pre-filled health answer.** Re-check age band, work pattern, equipment, activity level, goals and reminder choices. Demographic fields may show a placeholder but not a chosen value; only reminders per day, quiet days and time zone may have sensible defaults.

**2.3 Does the data change the plan? Make it true and visible.**
- Audit the plan engine and confirm the onboarding answers really drive the plan: conditions and severity (filter `avoidFor`, lower intensity when severity is 7+ or worsening, show care/physio-style gentle moves first), working window and weekdays (when resets are scheduled), equipment, activity level (workout length and difficulty), reminders per day (number of resets), and goals. If any answer is collected but unused, either wire it in or remove the question.
- Plan is generated from onboarding data and stored with a `planVersion`. It must **adapt over time**: after 2 weeks of completions with "Too easy" feedback, move one level up; "This hurt" disables that move and picks a substitute; 3 missed days lowers the load for 3 days; a new or worse condition in Care regenerates the plan. Day-wise variation comes from the weekly rhythm (Strength day, Mobility day, Cardio day, Recovery day, Rest/Gentle day) with a different set of moves each day, rotating so the same exercises do not repeat two days in a row.
- Add a **"Why this plan"** card and use it in two places: on the "Your plan is ready" screen and as an expandable "Why today?" row on Today. Template text only, e.g. "Because your lower back is a 4/10 and you sit most of the day: 3 desk resets, a 30 min strength day on Monday, and gentle moves that avoid heavy back loading." The "Your plan is ready" summary card must list every input used (Level, Daily resets, Focus areas by name, Weekday window, Equipment) instead of just "2 selected".

## 3. Today screen

- **Steps tile:** the progress bar must be a **white (or very light) track with a mint-green fill** whose width is steps ÷ daily target. With 0 steps there is no green at all. Show "8,000" style number plus "of 8,000 goal"; if no step source exists, show "Log steps" instead of a made-up number. Apply the same white-track + filled-green style to every other progress bar and ring (weekly ring, target bars, session progress dots track).
- **Motivation quote ("Daily boost")** location: move it **below the task list and above the footer disclaimer** on Today (end-of-day uplift), and keep the Share button. Do not repeat it in the hero area. Keep the coral gradient card and "Original" label.
- **Backgrounds:** improve the soft hero/background imagery while keeping the same look: layered sky-to-mint-to-lavender gradient blobs with subtle slow floating motion (CSS only, 12 to 20 s, off for reduced motion), a faint dotted or ring texture, and a time-of-day tint (morning warm sky, afternoon bright sky, evening lavender). Replace the single sun icon in the hero with a small illustrated motif that changes by time of day (sun, cloud, moon) using inline SVG. Keep text contrast AA.
- **Safety disclaimer ("General wellness guidance, not medical advice...") is shown too often and is not needed on every screen.** Show it **once**: in the safety step of onboarding (as a short card the person must tick) and as a single small footer link "Safety and privacy" in Me. Remove the repeated card from Today and from other screens. Keep the red-flag logic (sharp pain, dizziness, numbness, chest discomfort) as an in-session "Stop if..." line on the Player only.
- **Report a problem** (currently a dead link under the disclaimer): move it to **Me > Help > "Report a problem or suggest an idea"** and also as a small link on the Player and error toasts. It opens a sheet with: category (Bug, Wrong plan or exercise, Safety concern, Idea), message (max 500 chars), optional "Include my app version and screen" toggle (default off). Save to Firestore `reports/{autoId}` with fields `uid`, `category`, `message`, `appVersion`, `createdAt` (server timestamp). Rules: **create only for signed-in users, `request.resource.data.uid == request.auth.uid`, message length 1 to 500, no read, no update, no delete from the client**. The builder reads reports in the Firebase console (Firestore Data > `reports`). Add a visible "Thanks, we read every report" confirmation and an offline queue (store locally, send when online). Output the exact Firestore rules snippet to add and tell me where to paste it, and show me where to find the reports.

## 4. Plan screen

- Each daily item must show the sample demo (see section 6).
- Dark mode contrast audit (section 9) covers the "Surprise me" and "Swap" buttons which are currently invisible.

## 5. Care screen

- The small slanted blue line next to each score (looks inclined, e.g. on the Hips row) must be replaced by a **straight horizontal progress bar**: full-width track in white/very light, filled left to right in mint (or sky) according to the 0 to 10 score, no diagonal or hand-drawn line, fixed length and aligned vertically in every row. At 0/10 the bar is empty (track only).
- Keep "Show only my conditions" and the Posture link.
- Does it really help? Each care card should open to: what to do now (3 bullets), what to avoid, the one move to try, and "Check in" to log a 0 to 10 score. If a card has no content yet, hide it instead of showing an empty row.

## 6. Demo animations for every exercise

- Every stretch, reset and exercise (Player, Plan, Main workout detail, Care cards) must show a **looping demo**. No video hosting and no copyrighted media: use **inline SVG or CSS animated stick-figure/rounded-figure illustrations** (a simple friendly figure with rounded limbs in our palette, no face) driven by 2 to 4 pose keyframes per move (for example Seated Cat-Cow, Chin Tuck, Shoulder Roll, Chest Opener, Wrist Circles, Ankle Circles, Hip Flexor, Squat, Push-up, Plank, March in Place, Standing Side Bend). Build a small reusable `<MoveAnimation moveId>` component with a data table of poses (joint angles) and a fallback generic breathing figure if a move has no pose data.
- Show it at 220 px tall in the Player in place of the current empty circle with the person icon. Add a play/pause on tap, a "Show me how" expandable on cards, a small "Left/Right side" label when relevant, and respect reduced motion (show the 2 key poses side by side instead of animating).
- Add a text "Focus: Spine" chip and "Don't force the arch" caution line as now.

## 7. Posture screen (inspired by Moova's posture reset)

- **No posture-check item is selected by default.** All 5 items start unchecked, the counter reads "0 of 5", and "Save posture check" is disabled until at least one is answered. Use a tri-state per item: Yes / Not sure / No, with "No" revealing the adjustment tip for that item only.
- Redesign the top as an **annotated figure**: a seated side-view illustration (SVG) with 4 tappable callout bubbles (blue pills in our sky colour) pointing to the body: **Head and neck, Shoulders, Back, Wrists** (and Feet). Tapping a bubble shows the cue and the matching quick fix in a card below. Below it add a **horizontal row of exercise thumbnails** (Chin Tucks, Wall Angels, Shoulder Blade Squeeze, Chest Opener) each with the animated demo from section 6, a duration chip (3 min) and a "Start" button for the posture session. Add a duration slider (2, 3, 5 min) like Moova's.
- "Set up your workspace" currently shows an empty blob with a person icon: replace with a real illustration (section 8).
- Keep the Laptop-only tip but make the tip visual (section 8).

## 8. Visual for tips

Every tip card (Care tips, Posture workspace, Laptop-only tip, Tip of the day) gets a small inline-SVG illustration at the top in our palette:
- Laptop tip: side view of a desk and laptop with the screen tilted back, a dotted line showing eye level and an arrow.
- Screen at eye level: monitor on books with eye-line.
- Feet flat / elbows 90 degrees / lower back support: seated side-view figure with an angle arc or highlight.
- 20-20-20 eye rule: eye icon and a distance arrow.
Create a `<TipVisual kind>` component with a generic fallback.

## 9. Dark mode: fix invisible elements

Do a full contrast audit in dark mode on every screen and fix all of these (minimum 4.5:1 for text, 3:1 for icons and borders):
- The header band behind the logo and the streak chip shows as a light grey strip with light text on it; make it a dark glass surface (`#0F1B26` at about 85% opacity with blur), with the streak chip in a dark card, flame in coral and number in white (it currently shows a faint "0").
- "Surprise me" and "Swap" are pale grey pills with near-invisible text; make them outlined sky pills (text sky `#7CD6FF`, border sky at 40%) on the dark card.
- "Turn on notifications" is a dark grey button with dark text; see section 11.
- Check segmented controls (Light/Dark/System), disabled buttons, placeholder text, chips, calendar day pills, tile icons, borders and shadows. Use design tokens, no hard-coded colours, and test every screen at both themes.

## 10. Privacy policy

Replace the technical wording (the text `request.auth.uid == uid` must not appear anywhere in the UI) with this plain-language policy in a scrollable sheet, plus a "Last updated" date and a link from welcome, Me and the safety step:

1. **What we store:** your age band, the body areas and pain scores you choose, your work schedule windows, reminder choices, completed resets and workouts, feedback ("too easy", "this hurt"), and any problem reports you send.
2. **What we do not do:** no ads, no selling or sharing your data, no tracking by third parties, no AI model reading your data. Nothing about your health is sent anywhere except your private account storage.
3. **Who can see it:** only you. Your records are stored in your private account and protected so only your signed-in account can read or change them. The app builder cannot browse your health answers from the app.
4. **Sign-in:** Google sign-in shares only your name, email and photo with the app. Guest mode uses an anonymous account; if you clear browser data or switch devices without saving, guest progress can be lost, so use "Save my progress" to link Google.
5. **On your device:** a copy is cached in your browser (IndexedDB) so the app works offline. Reminders on your calendar are in a file stored on your phone, not on our side.
6. **Your control:** "Export my data" downloads everything as JSON. "Delete account and data" removes your records permanently. You can edit or clear any answer.
7. **Health notice (short):** UnStill gives general wellness guidance, not medical advice. Stop if you feel sharp pain, dizziness, numbness or chest discomfort.
8. **Contact:** use Report a problem in Me.

## 11. Install, share icon and notifications

**11.1 Add to Home Screen guidance.** The current text says "Tap the Share icon in your browser bar" and the person cannot find it. Detect the browser and OS and show the matching steps with a **drawn icon** (inline SVG of the real share icon: a square with an arrow pointing up) and where it is:
- iPhone Safari: Share button is the square-with-up-arrow at the **bottom centre of the screen** (iPad: top right next to the address bar). Scroll the sheet, tap **Add to Home Screen**, then **Add**.
- iPhone Chrome/Edge/Firefox: share icon is at the **right end of the address bar**, tap it, choose Add to Home Screen (if missing, open this page in Safari).
- Android Chrome: tap the **three dots (top right)** > **Install app** or **Add to Home screen**. Also offer a one-tap "Install" button using the `beforeinstallprompt` event when available.
- Desktop Chrome/Edge: install icon on the **right side of the address bar** (a monitor with a down arrow) or menu > Install.
- Desktop Safari: File > Add to Dock.
Show a small illustrated mock of the browser bar with the icon highlighted (SVG), a "Show me where" toggle and a "Done, I added it" button. Hide the card when the app is already running standalone (`display-mode: standalone`).

**11.2 Notifications.**
- Feature-detect `'Notification' in window` and `'serviceWorker' in navigator`. iOS Safari only supports web notifications for apps added to the Home Screen (iOS 16.4+); other cases are unsupported. Do **not** show a disabled dark button or a vague toast.
- If supported and permission is not asked: show a **bright sky gradient button** "Turn on reminders" with a bell icon (white text, AA contrast, same as other primary buttons).
- If permission is denied: show "Notifications are blocked. Change this in your browser's site settings" with a "How" link.
- If unsupported (for example iPhone Safari in a normal tab): show a friendly card, "Your browser can't send alerts from the web. Add UnStill to your Home Screen to get reminders, or use calendar reminders below" with the Add to Home Screen steps and the primary **"Add reminders to my calendar"** button. The toast must be a styled in-app card (light and dark), never a raw browser message.
- Always keep calendar .ics as the reliable path and the in-app reminder sheet as a fallback.

## 12. Guest mode check ("Continue as Guest")

I could not describe a specific bug, so audit and fix these:
- "Continue as guest" signs in anonymously, never needs Google, completes onboarding, and the Continue button on the safety step is never blocked by a failed cloud write (save to IndexedDB first, sync in background, show a quiet "Saved on this device" status).
- A guest sees a clear banner "Guest mode: your progress is only on this device. Save my progress" and "Save my progress" links the anonymous account to Google (`linkWithPopup`) without losing data; handle `credential-already-in-use` by offering to sign in and keep the guest data locally for export.
- Route guards: guests cannot reach signed-out welcome by Back, and reloading keeps the guest session.
- Show real error text (not a generic failure) for network, blocked-by-client (ad blocker), and database errors.

## 13. Acceptance checklist (confirm each one)

1. App is named UnStill everywhere visible; new open-ring logo and tagline are in place; splash lasts 2.5 s.
2. No pre-selected health answers anywhere; time zone dropdown defaults to IST; language field gone.
3. "Why this plan" is shown and the plan reacts to condition, severity, window, level and feedback.
4. Steps and all other bars use a light track with green fill; 0 steps means no green.
5. Quote sits below the task list; the repeated disclaimer is removed; Report a problem saves to `reports` and I know where to read them.
6. Care rows use straight horizontal bars; no slanted lines.
7. Every move has a looping demo; Posture screen has the annotated figure, thumbnails and no default selections; tips have visuals.
8. Dark mode: no invisible text, header, chips or buttons.
9. Privacy policy has no technical wording and matches section 10.
10. Add to Home Screen shows the right icon and place for each browser; notifications show a bright button or a clear fallback.
11. Guest mode works end to end and can be upgraded to Google.
12. No paid service, no API key, existing data still loads.
