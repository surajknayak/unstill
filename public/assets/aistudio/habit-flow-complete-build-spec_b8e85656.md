# Habit Flow: Complete Build Spec (single file, no attachments needed)

This file is the only input needed. It contains the product rules, the exact visual design (described in words and numbers), every screen with its exact copy, the logic, all seed content, the data model and the build order. Build exactly what is written here.

---

## 0. Instructions to the builder (read first)

1. Build in the milestone order in section 17, one milestone per step. Finish and run each before starting the next.
2. Where this document gives exact text, sizes or colours, use them exactly.
3. Never add paid services, API keys, servers or billing-dependent features (section 1).
4. Use `lucide-react` (free) for all icons. Use plain inline SVG for charts. Do not add large UI libraries.
5. If a requirement is unclear, choose the simplest free option and add a short note in `README.md`.

### Steps the project owner does (cannot be automated)

1. Create a free Firebase project on the Spark plan (no billing). Enable Authentication with **Google** and **Anonymous** providers. Create a Firestore database in production mode. Paste the rules from section 13.
2. Copy the Firebase web config values into environment variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. (These are public identifiers, not secrets.)
3. After deployment, add the GitHub Pages address (`username.github.io`) to Firebase Authentication, Settings, Authorised domains.
4. Replace placeholder illustrations with real art later (section 16).

---

## 1. Non-negotiables

- **Zero cost.** Must work with no credit card, no billing account and no paid service. If any setup step asks for billing (for example "Upgrade to Blaze"), stop and use the free alternative given here.
- **No secrets.** No API keys, tokens or private values in code or the repository. The repository is public.
- **No backend code.** No Cloud Functions, servers, cron jobs or AI model calls at runtime. All logic runs in the browser.
- **Not a medical product.** No diagnosis or treatment claims. Curated exercises only.
- **No phone or SMS sign-in** (it requires a paid plan). Google sign-in and guest mode only.

---

## 2. Product

**Habit Flow** is a one-sided, self-guided daily movement coach for adults with medium-low physical activity, including people with back pain, neck or eye strain, wrist strain, ankle issues or stiff hips. There are no trainers, no chat and no social features.

Each day the user gets one main workout, three to five 3-minute resets placed in their break windows, one posture check and one "Daily boost" quote, plus gentle tracking and condition care tips. Everything is personalised from the onboarding answers. Tone: warm, upbeat, never guilt-inducing. Every task starts in one tap.

---

## 3. Tech stack (all free)

| Layer | Choice |
| --- | --- |
| Front end | React 18 + Vite + TypeScript + Tailwind CSS |
| Routing | `react-router-dom` (hash routing so GitHub Pages works) |
| State | React context + a small store (Zustand allowed) |
| Auth | Firebase Authentication, Spark plan: Google sign-in and anonymous guest |
| Database | Firestore, Spark plan |
| Local cache | IndexedDB through the `idb` package |
| PWA | `vite-plugin-pwa` (installable, offline app shell) |
| Icons | `lucide-react` |
| Speech | Browser `speechSynthesis` |
| Hosting | GitHub Pages (public repo), project path base set in `vite.config.ts` |
| Config | `VITE_FIREBASE_*` env variables |

Free-tier discipline (Firestore Spark is roughly 50,000 reads and 20,000 writes per day and 1 GiB): read the profile once per session, cache plans, logs and content in IndexedDB, write one small document per completed task, batch writes, no live listeners on large collections.

---

## 4. Design system

### 4.1 Colour tokens (CSS variables; provide dark overrides)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--primary` | `#2EB8F5` | `#5CCBFF` | Main buttons, active tab, ring start, selected pill |
| `--primary-soft` | `#DDF1FD` | `#12384A` | Next-task tint, light chips |
| `--on-primary` | `#0B2A3C` | `#06202F` | Text on primary (dark text for contrast) |
| `--mint` | `#5EE6B0` | `#62E2B4` | Done states, ring end, recovery |
| `--mint-soft` | `#DDF8EC` | `#12372B` | Done task background |
| `--sun` | `#FFD24D` | `#FFD966` | Streak, tiny wins |
| `--coral` | `#FF7A59` | `#FF9478` | Energy workouts, flame icon |
| `--coral-soft` | `#FFE3DB` | `#4A2219` | Main workout icon tile |
| `--lavender` | `#B9A6FF` | `#C7B8FF` | Mobility, calm sessions |
| `--lavender-soft` | `#EDE8FF` | `#2C2550` | Lavender tiles |
| `--bg-from` / `--bg-to` | `#E3F6FD` / `#F3EFFF` | `#0B1620` / `#14122A` | App background (vertical gradient, top to bottom) |
| `--card` | `rgba(255,255,255,0.78)` | `rgba(255,255,255,0.08)` | Cards (use `backdrop-filter: blur(20px)`; provide a solid fallback when unsupported) |
| `--card-border` | `rgba(255,255,255,0.9)` | `rgba(255,255,255,0.14)` | 1 px card outline |
| `--row` | `#EEF4FB` | `rgba(255,255,255,0.06)` | Pending task row background |
| `--text` | `#0F2A3A` | `#EAF6FB` | Headings |
| `--text-soft` | `#4F6B7A` | `#9DB6C3` | Secondary text |
| `--caution` | `#E5533D` | `#FF8A70` | Pain 7+, "Don't" cues, safety only |
| `--caution-soft` | `#FDECE8` | `#3A1C18` | Caution pill background |
| `--quote-from` / `--quote-to` | `#B3452E` / `#F58A6E` | `#8E3523` / `#D96A50` | Quote card gradient (text is white and must pass contrast) |

Category colours (icon tile fill uses the `-soft` tone, icon uses the main tone): Main workout coral, Desk reset sky (`--primary`), Neck and shoulders lavender, Lower back coral, Hips sun, Hands and wrists mint, Eyes mint, Feet and ankles mint, Energy boost coral, Wind down lavender, Posture sky.

### 4.2 Typography

- Headings and numbers: **Plus Jakarta Sans** (700, 800), loaded from Google Fonts or bundled. Fallback `system-ui`.
- Body: **Inter** (400, 500, 600).
- Sizes (px): page title 24/800, greeting 34/800, section title 22/700, card title 18/700, body 16/400, subtitle 14/400, small label 12/600, small-caps brand label 12/700 with letter-spacing 0.08em, big numbers 28 to 72/800 with tabular figures.
- Minimum 12 px text anywhere.

### 4.3 Shape, spacing, depth

- Radii: cards 28 px, task rows and inner tiles 20 px, icon tiles 16 px or full circle, buttons and chips fully rounded (999 px).
- Page side padding 20 px; vertical gap between cards 16 px; card inner padding 20 px; row inner padding 14 px.
- Shadow: `0 12px 32px rgba(46,184,245,0.12)`; cards otherwise flat with the thin border.
- Touch targets at least 48 x 48 px.
- Background: the page gradient; behind the hero area add two soft blurred colour blobs (sky, lavender) at 30% opacity, never behind text.

### 4.4 Motion

- Transitions 200 to 300 ms ease-out. Progress rings animate on mount (stroke dash). Tap feedback: scale to 0.97.
- Completion: a sparkle burst under 1 second (CSS or canvas, no library).
- Respect `prefers-reduced-motion` (disable burst, parallax and breathing animation).

### 4.5 Layout frame

- Design width 390 px; fluid from 360 to 430 px. On wider screens centre the app in a 430 px column with the gradient filling the rest.
- Tab screens: sticky header, scrolling content, floating bottom navigation (20 px above bottom plus safe-area inset). Add 120 px bottom padding so content clears the bar.
- Full-screen flows (Player, Plan your workout, Onboarding, Complete) hide the bottom navigation.

### 4.6 Shared components

- **Header (tab screens):** left, a 40 px rounded-square logo tile (gradient from `#27C8E8` to `#2EB8F5` with a white ring glyph) followed by two stacked lines: "HABIT FLOW" (12 px small caps, colour `#0A5C80`) and the screen title (24 px, 800). Right, one **streak chip** (white pill, flame icon in coral, number in bold). No avatar and no second streak on this bar.
- **Primary button:** height 56, radius 999, fill `--primary`, text `--on-primary` 18/700. Variant with a leading 40 px white circle holding a play icon in `--primary`, and an optional trailing icon.
- **Glass card:** `--card` fill, 1 px `--card-border`, radius 28, padding 20.
- **Floating chip:** white 90% pill, 36 px high, icon plus 14/600 text, small shadow.
- **Task card:** radius 20, padding 14, flex row, gap 12: a 48 px circular icon tile at left; middle column with a small time label (13 px, soft) above the title (18/600), then a subtitle (14 px, soft); a 36 px status circle at right. States:
  - pending: background `--row`, empty circle with a 2 px dark outline;
  - next: background `--primary-soft`, a small primary-colour dot after the title, status circle white with a primary outline and a play icon;
  - done: background `--mint-soft`, status circle filled `--mint` with a dark check, a small mint "Done" pill after the title; **no strikethrough**.
- **Stat tile:** glass card, a 36 px circular icon in the top-right, label (14 px soft) top-left, value (28/800) with a small unit, then a 6 px rounded progress bar below.
- **Number pill picker:** row of pills (height 44; selected one is 56 high, filled `--primary`, 28/800 dark text; unselected are white at 80% with 18/600 text).
- **Progress ring:** SVG, 14 px stroke, rounded caps, gradient stroke from `--primary` to `--mint`, track `rgba(46,184,245,0.15)`.
- **Bottom navigation:** floating glass bar, height 64, radius 32, margin 0 20 px. Five tabs in this order with lucide icons: Today (`sun`), Plan (`calendar`), Progress (`activity`), Care (`person-standing`), Me (`user`). Active tab is a filled `--primary` pill containing icon and label; inactive tabs show icon over a 11 to 12 px label.
- **Bottom sheet:** glass, radius 28 on top, drag handle, backdrop 40% dark.
- **Toast:** glass pill at the top, 2 seconds.

---

## 5. Navigation map

Routes: `/welcome`, `/onboarding/:step`, `/` (Today), `/plan`, `/progress`, `/care`, `/care/:conditionId`, `/me`, `/workout/:id`, `/plan-workout/:id`, `/player/:sessionId`, `/complete/:logId`, `/posture`, `/pain-checkin`. Redirect unauthenticated users to `/welcome`, and users without a completed profile to onboarding.

---

## 6. Screens (exact layout and copy)

### 6.1 Welcome and sign-in (`/welcome`)

Pale gradient background. Upper half: a large illustration slot "hero-welcome" (character stretching arms overhead) with two floating chips: "3 min" (timer icon) and "Neck relief" (sparkles icon). Below, headline "Move a little. Feel a lot better." (32/800), subtext "Quick daily resets, made for your body." (16 soft). A glass sheet at the bottom with two buttons: "Continue with Google" (primary, Google "G" mark as a small inline SVG) and "Continue as guest" (outlined). Tiny line: "By continuing you agree to the Terms and Privacy Policy." Guest users see a line later in Me: "Save my progress".

### 6.2 Onboarding (`/onboarding/1` to `/onboarding/8`)

Fixed top row: back arrow (48 px circle), a thin 6 px gradient progress bar, and a "Skip" text pill on optional steps. A 120 px illustration slot, then the question title (28/800), a helper line, and glass choice cards below. Bottom primary button "Continue". Selected card: 2 px `--primary` border and `--primary-soft` fill.

1. **About you:** title "Tell us a little about you". Age band chips (18 to 24, 25 to 34, 35 to 44, 45 to 54, 55 to 64, 65+). Sex chips (Female, Male, Another, Prefer not to say; optional). Optional height and weight number fields with unit toggles. Time zone auto-detected, editable. Language: English.
2. **Activity now:** "How active are you right now?" Four cards: Mostly sitting, Light walking, Some exercise, Regular exercise. Sliders: "Exercise days per week" (0 to 7), "Hours sitting a day" (0 to 14), "Hikes or treks a month" (0 to 8), optional "Daily steps" (0 to 20,000). Derive `level`: Starter (mostly sitting or under 2 days), Steady (2 to 3 days), Active (4+ days).
3. **Conditions:** "Anything bothering you?" Multi-select chips with icons: Lower back, Upper back, Neck and shoulders, Eyes, Wrists and hands, Hips, Knees, Ankle or foot, Headaches, High blood pressure, Heart condition, Pregnancy, Recent surgery, None. Each selected body chip reveals a pain slider 0 to 10 (track green to amber), a "How long?" select (Under 2 weeks, 2 to 12 weeks, Over 3 months) and "Getting worse?" Yes/No.
4. **Your workday:** "When do you work?" Start and end time pickers, work type cards (Desk, Standing, On the move, Shifts), break window chips (Morning, Lunch, Afternoon, Evening) each with an editable time, and a days-off selector (Mon to Sun).
5. **Time to spare:** "How much time can you spare?" Number pill picker 10, 20, 30, 45 for weekdays and another for weekends.
6. **What can you use:** chips with icons: No equipment, Dumbbells or bands, Treadmill or elliptical, Gym, Outdoors; and Home, Office, Both.
7. **What matters most:** goal cards (Less pain, More energy, Lose weight, Build a habit) and "How should we cheer you on?" with three options (Gentle, Cheerleader, Data-driven) each with a one-line sample.
8. **Quick safety check:** title "Quick safety check", helper "We check first so we can keep you safe." Six rows with a Yes/No toggle: chest pain or dizziness when you exert yourself; numbness or tingling down an arm or leg; pain after a recent fall or accident; unexplained weight loss along with pain; a doctor has told you to limit exercise; you are pregnant. Then a consent card (privacy summary and a required checkbox "I agree to save my health details to my account"). Any Yes sets `safetyFlags` and, after Continue, shows the safety sheet below; then the "Your plan is ready" screen with a primary button "Show me today".

**Safety sheet:** glass bottom sheet, small caution icon, title "Let's start gently.", body "Your plan will be easy, and it's a good idea to talk to a doctor before you start.", buttons "Start my gentle plan" (primary) and "Learn more" (text).

### 6.3 Today (`/`)

Top to bottom (390 px reference):

1. **Header:** logo, "HABIT FLOW" / "Today", streak chip (flame + number).
2. **Greeting row** (margin top 12): a 52 px circular avatar (photo from Google, or a coloured circle with the initial) with an 12 px green online dot at its bottom-right; beside it a column with "Hey, {firstName}" (34/800) and "Three small moves keep today going." (16 soft, max two lines); right, two 48 px white circular icon buttons: `timer` (opens Plan your workout) and `bell` (opens notification settings), the bell with an 8 px coral unread dot when there are due reminders.
3. **Reset button** (margin top 16): primary button, full width, 56 high, leading white circle with play icon, label "Reset me now, 3 min", trailing `zap` icon. Picks the best 3-minute session for the current time and the user's highest pain score and opens the Player.
4. **Hero card** (margin top 16, height 190, radius 28, overflow hidden): the slot "hero-today" illustration fills it. Top-left floating chip (clock icon) "{totalMinutes} min today". Top-right chip with a mint dot "{done} of {total} done". Bottom: a white 92% pill strip (height 44, inset 12) with a play icon in a small circle, text "Next: {title}, {duration} at {time}" (14/600, ellipsis) and an arrow `arrow-right` at the end; tapping opens that task. If all tasks are done the strip reads "All done today. Great work!" and the hero shows the celebration illustration.
5. **Today's plan card** (glass, margin top 16): title row: "Today's plan" (24/800), a "Today" chip in `--primary-soft`, and on the right "Customize" (blue, 14/600, with `sliders-horizontal` icon) which opens a bottom sheet to swap, remove, reorder or retime tasks. Under it the task cards, 12 px apart, ordered by time. Sample content (use real generated data in the app):
   - 08:00 AM, "Main workout", "20 min run-walk" plus a sky "Intervals" pill, icon `person-standing` in coral tint, pending.
   - 10:30 AM, "Desk reset", "3 min · Chest opening & hip release", icon `armchair`, done.
   - 01:30 PM, "Neck & shoulders", "3 min · Gentle mobility circle", icon `accessibility`, next.
   - 04:00 PM, "Eyes", "2 min · 20-20-20 screen relief", icon `eye`, pending.
   Tapping a pending or next card opens its detail or the Player; tapping a done card shows its summary. The status circle starts the task directly.
6. **Stat tiles** (two columns, gap 12, margin top 16): "Resets" with a `star` icon (sky tint) and value "{done} of {target}" plus the unit "resets" and a sky progress bar; "Steps" with a `footprints` icon (mint tint) and value "{steps}" with a mint progress bar shown only when the user has set a step goal, otherwise a small "Add steps" link.
7. **Daily boost card** (margin top 16): gradient `--quote-from` to `--quote-to` at 135 degrees, radius 28, padding 20, white text. Top-left chip (white 20% fill, heart icon) "DAILY BOOST" (12/700, letter-spaced); top-right a 40 px circle share button. Quote text 22/700 (for example “Motion is medicine. Your body thanks you for every stretch.”) and a second line (16, 90% white) with a mini prompt (for example "Take a slow breath before clicking back into focus."). Bottom-right a faint lotus watermark and the tiny label "Original" (12, 80% white). Share creates a PNG card via canvas and uses the Web Share API, falling back to a download.
8. **Bottom navigation** with Today active.

States: no plan yet shows skeleton cards for 400 ms; offline shows a slim banner "You're offline. Your progress is saved on this device."; two missed days replaces the hero strip with a "Welcome back" card (section 6.15).

### 6.4 Plan your workout (`/plan-workout/:id`)

Full-screen, no bottom nav, no logo, no avatar. Top bar: back arrow (left), centred title "Plan your workout" (22/800).

1. Quick choices row (chips, margin top 12): "3 min reset", "5 min reset", "Full workout" (selected by default for main workouts). Choosing a reset opens the Player directly with the best matching session.
2. Round illustration (slot "hero-workout", 190 px circle with a 6 px mint-to-sky gradient ring), with a floating chip under it, clock icon plus "{n} min".
3. **Minutes card** (glass; shown once): top row `hourglass` icon plus "Minutes" (18/700) at the left and "{n} min selected" (14/600, `--primary`) at the right; the number pill picker with 10, 20, 30, 45 (default is the user's weekday minutes); a thin divider; the line "Recommended: {n} min, based on your weekday window." (14 soft; weekends use the weekend window).
4. Three rows (glass, height at least 72, radius 28, each with a 44 px icon tile at the left, a two-line text block, a value on the right in `--primary` or `--mint`-dark 14/700, and a 36 px circular chevron button): 
   - icon `footprints`, title "Move and easy time", subtitle "Jog 1 min, walk 2 min", value "3:00 per cycle";
   - icon `flame`, title "Warm-up and cool-down", subtitle "Brisk walk and gentle stretches", value "5 min each";
   - icon `bell-ring`, title "Audio cues", subtitle "Vibration and chime", value "Soft chime".
   Text must wrap to two lines instead of truncating. Tapping a row opens a small sheet to edit its value (jog and walk lengths, warm-up length, cue type: Soft chime, Voice, Vibration, Off).
5. Bottom fixed primary button "Start {n} min workout" with a leading play icon. A tap goes to the Player in workout mode.

For strength or mobility workouts, replace the first row with "Rounds and rest" (value "3 rounds, 30 sec rest").

### 6.5 Session Player (`/player/:sessionId`)

Full screen; **no app bar**. Single top row (margin top 12):

- left: 48 px white circle button with `x` icon (opens the End-session sheet);
- centre: white pill with a 8 px dark-teal dot and the text "Move {i} of {n}" (16/700);
- right: 48 px white circle button with `volume-2` icon (toggles to `volume-x`).

Below it (margin top 8): a row of {n} progress dots/segments, 4 px high, rounded; completed moves mint, the current one primary (wider), the rest grey.

**Move card** (glass, radius 28, padding 14, margin top 16): inside, an image area (aspect about 1.45, radius 20, overflow hidden) showing the move's illustration (or the session scene as a fallback) with a gentle 4 second "breathing" scale animation (1.00 to 1.03) and a soft glow in the category colour over the focus area. At the bottom-left of the image, a white 92% chip with a category-coloured dot and the text "Focus: {plain-language area}" (14/600).

Below the card, centred: move name (28/800, for example "Seated Neck Side Tilt"); instruction (17, soft, centred, max 3 lines, for example "Inhale gently, let your left ear sink toward your shoulder without forcing."); a **caution pill** (full width, `--caution-soft` fill, 1.5 px border `rgba(229,83,61,0.35)`, radius 999, padding 12 18) with an `info` icon in `--caution` and the "Don't" text (for example "Don't shrug or crunch your opposite shoulder upward."); and a small centred pill "Up next: **{next move}**" (14, with the next title in bold).

**Timer ring** (margin top 24, diameter 220): gradient arc primary to mint, 16 px stroke, round caps, track very light blue. Centre: "TIME LEFT" (13/700, letter-spaced, soft), the time "0:22" (64/800, tabular), and a 56 px round primary pause button (white pause icon) below the time. The arc counts down smoothly.

**Bottom row** (margin top 24, three items evenly spread): a 56 px white circle `skip-back` (previous), a wide white pill "Switch side" with a `repeat` icon (only shown for two-sided moves; otherwise the pill shows "Skip move"), and a 56 px white circle `skip-forward`.

Behaviour:
- Each move runs its `durationSec`. For two-sided moves, run half the time per side and show a toast "Switch sides" with a chime and haptic tick (and speak it when sound is on). The "Switch side" pill triggers it early.
- Pause: dim the card to 60%, show "Resume" (primary) and "End session" (text) over it.
- End-session sheet: title "End session?", body "Your progress so far is saved.", buttons "Keep going" (primary) and "End" (text, `--caution`).
- Optional audio coach (when sound is on): speaks the move name and instruction at the start and "switch sides" in the middle, using `speechSynthesis` at rate 0.95.
- Keep the screen awake with the Wake Lock API where available.
- For workouts (not resets), blocks come from the template (warm-up, intervals, cool-down); the same layout is used with "Block {i} of {n}" in the top pill and the instruction line showing, for example, "Jog easy" or "Brisk walk".
- On finish, go to the Complete screen.

### 6.6 Session complete (`/complete/:logId`)

Sparkle burst, a 120 px medal illustration, headline "Nice reset!" (32/800) (for workouts "Workout done!"), subline "That's {n} {minutes} of movement today." Streak chip updates with a small bounce. Three glass stat tiles in a row: Minutes, Moves, Streak. Then "How did that feel?" with four pills: "Too easy", "Just right", "Too hard", "This hurt" (the last has a caution outline). Choosing "This hurt" opens a sheet: "Sorry about that. We'll stop suggesting this move." with buttons "Undo" and "Okay". Buttons: "Back to Today" (primary) and "Log something else" (text).

### 6.7 Workout detail (`/workout/:id`)

Hero illustration with chips (duration, level). A glass timeline card listing blocks (Warm-up 5 min, main blocks, Cool-down 5 min), each expandable to show cues. Moves that need care show a small caution dot and the note "Go gently". Buttons: "Start" (primary) and "Swap this workout" (outlined) which shows two safe alternatives. Footnote: "Skip if you feel sharp pain."

### 6.8 Plan (`/plan`)

Header "Plan". A horizontal day selector (Mon to Sun, today as a primary pill). Below, a themed card per selected day (for example "Strength day") with the main workout and the day's resets as small icon chips. Buttons: "Surprise me" (chip) and "Swap" on each card. A banner with the monthly theme (for example "This month: Strong back"). Past days show completion status; future days are editable.

### 6.9 Progress (`/progress`)

Header "Progress". Under it a segmented control "Week" | "Month" (full width, glass, selected segment filled primary with dark text and an icon).

1. **Weekly card** (glass, centred): green pill "{n}-day streak!" with a flame icon; a ring (about 190 px) with the big text "{done}/{target}" (56/800) and the line "{done} of {target} resets" and below it "Goal: {perDay} a day"; below the ring a row with a check icon and a helper "Just {remaining} quick desk pauses to complete your week" (computed; hidden when complete). The weekly target is `resetsPerDay x active days` and must match the Today tile target.
2. **Sitting blocks today** (glass): a `armchair` icon tile, title "Sitting blocks today", subtitle "Desk intervals and reset breaks", and at the right a small label "LONGEST SIT" above the value "{h}h {m}m". Under it one horizontal timeline bar (height 14, radius 999) spanning the user's work hours with hour ticks (for example 9 AM, 11 AM, 1 PM, 3 PM, 5 PM); sitting stretches are soft sky, reset breaks are mint markers at their times; above the bar a left label with the start time, a centred sky label "{n} mini resets taken" and a right label with the end time. Legend: sky dot "Seated focus", mint dot "Active reset break".
3. **Pain trend** (glass): a coral-tint icon tile with a bandage icon, title "Pain trend", subtitle "{Condition}, last 8 weeks", and at the right "SCALE CHANGE" (small label) above "{first} to {latest}" in mint-dark 22/800. Chart (SVG, height 170): y-axis labels 0, 5, 10 with dashed gridlines, a dashed "Comfort target (≤3)" line with its label placed at the left, away from the data points, x labels W1 to W7 and "Now"; the line is dark blue (`#0B5C80`) with round point markers and a light blue area fill under it; the last point is mint with a ring. A pill below: smiley icon plus "Trending down 3 weeks in a row" (shown only when true; otherwise a neutral line like "Keep checking in weekly."). If the user has several conditions show small chips above the chart to switch.
4. **Badges earned** (glass): title "Badges earned", subtitle "Daily movement milestones", "View all ({n})" link on the right. A row of four round medals (64 px): "3-Day Reset" (mint, refresh icon), "7-Day Consistency" (mint, calendar icon), "30-Day Master" (coral-soft, award icon), "Back Care Streak" (coral, person icon); locked badges are greyed with a lock.
5. **Tip of the day** (glass, text only): a small lightbulb icon with the label "TIP OF THE DAY" (12/700, mint-dark), title (for example "Gentle shifts beat rigid posture"), body of two lines, and a link "Read more in Care" with an arrow.
6. Full-width primary button "Log it myself" with a plus-circle icon (opens a sheet to log an activity: type, minutes, optional steps). Under it a centred link "Add steps or import Apple Health file" with a small tick-box icon.

Month view: a calendar heatmap (days coloured by completed tasks), month totals and the same pain chart over 12 weeks.

### 6.10 Pain check-in (`/pain-checkin`, also a sheet)

Title "How does your {area} feel today?" One slider (0 to 10) per condition with the green-to-amber track and a big number, optional note field, button "Save". After saving show a toast "Saved. Nice job checking in."

### 6.11 Posture (`/posture`)

Header "Posture". Card "Quick posture check" with five tappable rows (checkbox style): "Screen at eye level", "Feet flat on the floor", "Elbows near 90 degrees", "Lower back supported", "Shoulders relaxed". Result chip "{n} of 5" and a one-line tip for each unchecked item. Card "Set up your workspace" with an illustration and a laptop-stand tip for laptop-only users. Button "Start posture session" (the weekly posture session: chin tuck, wall angel, scapular squeeze, hip flexor stretch, glute squeeze).

### 6.12 Care (`/care`, `/care/:conditionId`)

List of the user's conditions as glass cards with a small sparkline and the latest pain score. Detail: title (for example "Lower back"), four tabs "Do", "Don't", "Recover", "See a doctor". Do items have a mint check icon, Don't items a coral cross icon, See a doctor items a caution info icon. Persistent bottom strip: "General wellness guidance, not medical advice." and a "Report a problem" text link (opens a mailto link or a Firestore `reports` write, no server).

### 6.13 Reminder sheet

Bottom sheet over any screen when a reminder is due while the app is open: title "Time to reset your {area}.", subtitle "{n} minutes", buttons "Start" (primary), "Snooze 10 min", "Skip today".

### 6.14 Me (`/me`)

Header "Me". Profile header (avatar, name, level chip). Sections as glass lists: Profile and conditions; Notifications (reminders per day, quiet days, break windows, button "Add reminders to my calendar"); Cheering style; Appearance (Light, Dark, System); Privacy (Export my data, Delete account and data); About and disclaimer. Guests see a top card "Save my progress" with a "Continue with Google" button that links the account. "Delete account and data" is in `--caution` colour and asks for confirmation.

### 6.15 States

- Empty Progress: illustration plus "Your story starts today."
- Welcome back (after two missed days): glass card "Welcome back" with "Let's ease back in" and a half-intensity plan button "Start gentle".
- Offline banner and "Saved" toast as above.
- Error states: a friendly card with "Something went wrong. Try again." and a Retry button.

---

## 7. Plan engine (rules only, no AI)

Create "Today" at first open each day. Save it to `plans/{yyyy-mm-dd}` and IndexedDB, and keep it stable for the day (changes only through Customize, Swap or feedback).

**Inputs:** profile, schedule, last 14 days of logs, disabled exercise ids, safety flags, weekday, and the monthly theme.

**Steps**
1. **Level and caps.** Starter, Steady, Active set the base duration and difficulty. If `safetyFlags` is not empty, use the gentle set only (walk, mobility, easy resets) and half durations.
2. **Main workout.** Choose from the weekly rhythm (Mon strength, Tue walk, Wed mobility, Thu intervals, Fri fun cardio, Sat outdoors, Sun restore), filtered by: available minutes (weekday or weekend, rounded down to 10, 20, 30, 45), equipment, location, and exclusion by `avoidFor` against conditions. Never repeat the same template within 3 days. Starter users get a walk or mobility day on interval and strength days when their last two feedbacks were "Too hard" or "This hurt".
3. **Resets.** Count = 3 by default (4 or 5 if the user has 2 or more conditions or sits more than 8 hours). Place them at the centre of the user's break windows. Pick sessions by scoring: +3 for each matching condition (weighted by pain score, 7 or above counts double), +1 for the whole-body "Desk reset" at least once a day, -5 if used in the last 90 minutes, -2 if used 2 days in a row. Exclude moves with matching `avoidFor` and disabled ids; the Player uses variants if marked.
4. **Posture check** at the first break after 11 AM and **Eyes** for desk workers around 4 PM.
5. **Daily boost and tiny win.** Pick the next unseen quote matching the cheer style; pick a tiny win from the templates in section 9.6.
6. **"Why today" line** from the templates in section 9.7 (no model calls).
7. **Progression.** Raise a workout's duration or reps by at most 10% a week and only after three completed sessions with feedback "Just right" or "Too easy".
8. **Feedback.** "Too easy" nudges up next time, "Too hard" nudges down 15% and prefers lower-impact alternatives, "This hurt" disables that move id until re-enabled in Me, and if the move belonged to a condition, suggests that condition's Care card.
9. **Pain safety.** A check-in score of 7 or more, or two consecutive increases of 2 or more, removes strength and running suggestions for the week, keeps resets gentle, and shows a banner "Your {area} seems sore. We've eased your plan. If it keeps getting worse, please see a doctor."
10. **Missed days.** After two missed days, show "Welcome back" and build a half-intensity day. Never show red or guilt text.
11. **Streak.** A day counts when at least one task is completed. One missed day per week is forgiven automatically (a "freeze", shown as a small snowflake in the streak chip tooltip). Use a single streak value on every screen.
12. **Targets.** `resetsPerDay` is the number of resets planned that day (default 3), the weekly target is the sum over the active days (days off excluded), and both Today and Progress read the same numbers.

---

## 8. Tracking, posture and Apple Health

- **Log:** every completed task stores date, session id, duration, feedback. Manual "Log it myself" entries store type, minutes, optional steps.
- **Sitting blocks:** derived from reset times, reminder replies ("I got up" / "Still sitting" shown on the reminder sheet) and the work schedule: gaps longer than 45 minutes count as sitting stretches; the longest gap is "Longest sit".
- **Steps:** manual entry, or import. Show a goal only if the user set one.
- **Pain:** weekly prompt every 7 days after onboarding (and a "Check in" button on Care). Show raw scores, never percentages.
- **Badges:** 3-Day Reset (3-day streak), 7-Day Consistency, 30-Day Master, Back Care Streak (5 lower-back or hips resets in a week), First Workout, Posture Pro (7 posture checks scoring 4 or 5), Comeback (finish a day after two missed days).
- **Apple Health import:** native sync is not possible on the web. Provide a screen that accepts the exported `export.zip` (or `export.xml`). Use a Web Worker with streaming parsing (`fflate` for zip, a streaming XML reader) and import only `HKQuantityTypeIdentifierStepCount` (sum per day) and `HKWorkoutType` records for the last 90 days. Show a progress bar. Nothing is uploaded; only the daily summary is saved.

---

## 9. Seed content (put in `/src/data/*.json`)

All text is original. Moves are gentle and desk-friendly. Condition ids: `lower-back`, `upper-back`, `neck-shoulders`, `eyes`, `wrists-hands`, `hips`, `knees`, `ankle-foot`, `headaches`, `high-bp`, `heart`, `pregnancy`, `recent-surgery`. `avoidFor` values are condition ids with `-acute` meaning an acute or worsening problem (the user flagged "getting worse" or pain 7 or more) or a safety flag; any `avoidFor` match removes the move. Every move has an optional `media.illustration`; the Player falls back to the session scene image.

### 9.1 `moves.json`

```json
[
{"id":"seated-cat-cow","title":"Seated Cat-Cow","focus":"Spine","twoSided":false,"durationSec":30,"instruction":"Hands on knees. Breathe in and gently lift your chest, breathe out and softly round your back.","dontCue":"Don't force the arch or hold your breath.","avoidFor":["lower-back-acute"]},
{"id":"chest-opener","title":"Chest Opener","focus":"Chest and front of shoulders","twoSided":false,"durationSec":30,"instruction":"Clasp your hands behind you, lift them slightly and open your chest while you breathe slowly.","dontCue":"Don't lean your head back or pinch your shoulder blades hard.","avoidFor":["shoulder-acute"]},
{"id":"shoulder-rolls","title":"Shoulder Rolls","focus":"Shoulders","twoSided":false,"durationSec":30,"instruction":"Lift your shoulders up, roll them back and down in slow circles, then switch direction halfway.","dontCue":"Don't rush or hunch up toward your ears.","avoidFor":["shoulder-acute"]},
{"id":"seated-twist","title":"Gentle Seated Twist","focus":"Mid back","twoSided":true,"durationSec":40,"instruction":"Sit tall, turn from your middle back and rest a hand on the chair back or opposite knee. Switch sides halfway.","dontCue":"Don't yank yourself deeper or twist from your neck.","avoidFor":["lower-back-acute","pregnancy"]},
{"id":"stand-and-reach","title":"Stand and Reach","focus":"Sides of the body","twoSided":false,"durationSec":30,"instruction":"Stand up, reach both arms overhead and lengthen up, then lean a little to each side.","dontCue":"Don't arch your lower back or lock your knees.","avoidFor":["recent-surgery"]},
{"id":"chin-tuck","title":"Chin Tuck","focus":"Back of neck","twoSided":false,"durationSec":30,"instruction":"Look straight ahead and glide your chin back as if making a gentle double chin. Hold for 3 seconds, then release.","dontCue":"Don't tilt your head up or down.","avoidFor":["neck-acute"]},
{"id":"neck-side-tilt","title":"Seated Neck Side Tilt","focus":"Left side of neck","twoSided":true,"durationSec":40,"instruction":"Inhale gently, let your left ear sink toward your shoulder without forcing. Switch sides halfway.","dontCue":"Don't shrug or crunch your opposite shoulder upward.","avoidFor":["neck-acute"]},
{"id":"levator-stretch","title":"Neck Corner Stretch","focus":"Back and side of neck","twoSided":true,"durationSec":40,"instruction":"Turn your nose toward one armpit and let the weight of your head deepen the stretch softly. Switch sides.","dontCue":"Don't pull your head with your hand.","avoidFor":["neck-acute","headaches-acute"]},
{"id":"scapular-squeeze","title":"Shoulder Blade Squeeze","focus":"Upper back","twoSided":false,"durationSec":30,"instruction":"Draw your shoulder blades gently back and down as if holding a pencil between them. Hold 3 seconds, release.","dontCue":"Don't lift your shoulders or flare your ribs.","avoidFor":[]},
{"id":"doorway-chest-stretch","title":"Doorway Chest Stretch","focus":"Chest","twoSided":false,"durationSec":40,"instruction":"Place your forearms on a door frame and step through until you feel a light stretch across your chest.","dontCue":"Don't let your lower back sag.","avoidFor":["shoulder-acute"]},
{"id":"pelvic-tilt","title":"Seated Pelvic Tilt","focus":"Lower back","twoSided":false,"durationSec":30,"instruction":"Sit tall. Rock your pelvis slowly forward and back, moving only from the hips.","dontCue":"Don't push into pain. Keep the movement small.","avoidFor":["lower-back-acute"]},
{"id":"knee-to-chest","title":"Seated Knee Hug","focus":"Lower back and hips","twoSided":true,"durationSec":40,"instruction":"Hold the back of one thigh, lift the knee toward your chest gently, keep your spine tall. Switch sides.","dontCue":"Don't round your upper back or pull hard.","avoidFor":["lower-back-acute","knees-acute","recent-surgery"]},
{"id":"standing-hip-hinge","title":"Standing Hip Hinge","focus":"Hips and back","twoSided":false,"durationSec":40,"instruction":"Hands on hips, soft knees. Push your hips back and tip forward with a straight back, then stand tall.","dontCue":"Don't round your back or lock your knees.","avoidFor":["lower-back-acute"]},
{"id":"supported-forward-fold","title":"Desk Forward Fold","focus":"Back of legs and back","twoSided":false,"durationSec":40,"instruction":"Rest your hands on the desk, step back and hinge until your back is flat. Breathe and let your head hang easy.","dontCue":"Don't bounce or lock your knees.","avoidFor":["lower-back-acute","high-bp-acute"]},
{"id":"seated-figure-four","title":"Seated Figure Four","focus":"Hips and glutes","twoSided":true,"durationSec":40,"instruction":"Rest one ankle on the opposite knee, sit tall and hinge slightly forward. Switch sides.","dontCue":"Don't press the knee down hard.","avoidFor":["knees-acute","hips-acute"]},
{"id":"standing-hip-flexor","title":"Standing Hip Flexor Stretch","focus":"Front of hip","twoSided":true,"durationSec":40,"instruction":"Step one foot back, tuck your tailbone and press the hip forward gently. Hold a chair for balance. Switch sides.","dontCue":"Don't arch your lower back.","avoidFor":["knees-acute","ankle-foot-acute"]},
{"id":"glute-squeeze","title":"Glute Squeeze","focus":"Buttocks","twoSided":false,"durationSec":30,"instruction":"Sit tall and squeeze your buttocks for 3 seconds, then relax. Repeat slowly.","dontCue":"Don't hold your breath.","avoidFor":[]},
{"id":"sit-to-stand","title":"Sit to Stand","focus":"Legs and hips","twoSided":false,"durationSec":40,"instruction":"Stand up from the chair slowly using your legs, then sit back down with control.","dontCue":"Don't let your knees collapse inward.","avoidFor":["knees-acute","ankle-foot-acute","recent-surgery"]},
{"id":"wrist-circles","title":"Wrist Circles","focus":"Wrists","twoSided":false,"durationSec":30,"instruction":"Make loose fists and draw slow circles with your wrists, then switch direction.","dontCue":"Don't force big circles if it hurts.","avoidFor":["wrists-hands-acute"]},
{"id":"prayer-stretch","title":"Prayer Stretch","focus":"Inner wrists and forearms","twoSided":false,"durationSec":30,"instruction":"Press your palms together at chest height and lower them gently until you feel a light stretch.","dontCue":"Don't push your elbows out hard.","avoidFor":["wrists-hands-acute"]},
{"id":"tendon-glides","title":"Hand Glides","focus":"Fingers and hands","twoSided":false,"durationSec":40,"instruction":"Move slowly from open hand to hook fist, full fist, table-top and back, one smooth step at a time.","dontCue":"Don't rush or squeeze hard.","avoidFor":["wrists-hands-acute"]},
{"id":"finger-spreads","title":"Finger Spreads","focus":"Fingers","twoSided":false,"durationSec":30,"instruction":"Spread your fingers wide, hold for 2 seconds, then relax. Repeat slowly.","dontCue":"Don't strain until it aches.","avoidFor":[]},
{"id":"forearm-stretch","title":"Forearm Stretch","focus":"Forearms","twoSided":true,"durationSec":40,"instruction":"Extend one arm with the palm up, and use the other hand to gently draw the fingers down. Switch sides.","dontCue":"Don't bend past a light stretch.","avoidFor":["wrists-hands-acute"]},
{"id":"look-away-20","title":"Look Far Away","focus":"Eyes","twoSided":false,"durationSec":30,"instruction":"Look at something about 20 feet (6 metres) away and let your eyes relax. Blink softly.","dontCue":"Don't stare or squint.","avoidFor":[]},
{"id":"palming","title":"Palming","focus":"Eyes","twoSided":false,"durationSec":40,"instruction":"Rub your palms together to warm them, cup them gently over your closed eyes and breathe slowly.","dontCue":"Don't press on your eyeballs.","avoidFor":[]},
{"id":"focus-shift","title":"Near and Far Focus","focus":"Eyes","twoSided":false,"durationSec":30,"instruction":"Look at your thumb held at arm's length, then at something far away. Switch slowly back and forth.","dontCue":"Don't strain. Keep it smooth.","avoidFor":["headaches-acute"]},
{"id":"blink-reset","title":"Blink Reset","focus":"Eyes","twoSided":false,"durationSec":20,"instruction":"Close your eyes gently for 2 seconds, open, and repeat 10 slow blinks.","dontCue":"Don't squeeze your eyes shut.","avoidFor":[]},
{"id":"eye-circles","title":"Slow Eye Circles","focus":"Eyes","twoSided":false,"durationSec":30,"instruction":"Without moving your head, trace a slow circle with your eyes, then switch direction.","dontCue":"Don't go fast or force the end of the range.","avoidFor":["headaches-acute"]},
{"id":"ankle-alphabet","title":"Ankle Alphabet","focus":"Ankles","twoSided":true,"durationSec":40,"instruction":"Lift one foot and draw the letters A to Z in the air with your toes. Switch feet.","dontCue":"Don't push through sharp pain.","avoidFor":["ankle-foot-acute"]},
{"id":"calf-raises","title":"Calf Raises","focus":"Calves and ankles","twoSided":false,"durationSec":40,"instruction":"Hold the desk, rise slowly onto your toes, pause, and lower with control.","dontCue":"Don't roll your ankles outward.","avoidFor":["ankle-foot-acute","high-bp-acute"]},
{"id":"toe-spreads","title":"Toe Spreads","focus":"Feet","twoSided":false,"durationSec":30,"instruction":"Spread your toes wide, hold for 3 seconds, then relax. Repeat slowly.","dontCue":"Don't curl your toes.","avoidFor":[]},
{"id":"bottle-roll","title":"Foot Roll","focus":"Bottom of the foot","twoSided":true,"durationSec":40,"instruction":"Roll the arch of your foot slowly over a water bottle or ball under the desk. Switch feet.","dontCue":"Don't press hard on sore spots.","avoidFor":["ankle-foot-acute"]},
{"id":"single-leg-balance","title":"Single-Leg Balance","focus":"Ankles and balance","twoSided":true,"durationSec":40,"instruction":"Stand beside your desk with one hand on it, lift one foot slightly and balance. Switch legs.","dontCue":"Don't lock your standing knee.","avoidFor":["ankle-foot-acute","dizziness"]},
{"id":"marching","title":"Marching on the Spot","focus":"Whole body","twoSided":false,"durationSec":40,"instruction":"March in place with relaxed shoulders and swinging arms.","dontCue":"Don't stomp. Land softly.","avoidFor":["knees-acute","heart-acute"]},
{"id":"arm-circles","title":"Arm Circles","focus":"Shoulders","twoSided":false,"durationSec":30,"instruction":"Hold your arms out to the sides and draw small circles, growing slightly bigger, then reverse.","dontCue":"Don't shrug.","avoidFor":["shoulder-acute"]},
{"id":"chair-squats","title":"Chair Squats","focus":"Legs","twoSided":false,"durationSec":40,"instruction":"Lower toward the chair with hips back, lightly touch it, then stand tall.","dontCue":"Don't let your knees fall inward.","avoidFor":["knees-acute","recent-surgery","pregnancy-late"]},
{"id":"deep-breaths","title":"Deep Belly Breaths","focus":"Breathing","twoSided":false,"durationSec":40,"instruction":"Breathe in through your nose for 4 counts into your belly, and out for 6 counts.","dontCue":"Don't force a big breath. Keep it easy.","avoidFor":[]},
{"id":"neck-release","title":"Neck Release","focus":"Neck","twoSided":false,"durationSec":30,"instruction":"Let your chin drop gently toward your chest and let the weight of your head stretch your neck. Breathe slowly.","dontCue":"Don't pull your head down.","avoidFor":["neck-acute"]},
{"id":"desk-fold","title":"Seated Forward Fold","focus":"Back and hamstrings","twoSided":false,"durationSec":40,"instruction":"Sit with your feet flat and slowly fold forward with a long spine, letting your arms hang. Roll up slowly.","dontCue":"Don't bounce or force the stretch.","avoidFor":["lower-back-acute","high-bp-acute"]},
{"id":"box-breathing","title":"Box Breathing","focus":"Breathing","twoSided":false,"durationSec":60,"instruction":"Breathe in for 4, hold for 4, breathe out for 4, hold for 4. Repeat.","dontCue":"Don't hold your breath if you feel dizzy.","avoidFor":["dizziness"]}
]
```

### 9.2 `sessions.json` (3-minute sessions, `durationSec` = sum of moves, about 180)

```json
[
{"id":"desk-reset","title":"Desk reset","subtitle":"Chest opening and hip release","category":"primary","icon":"armchair","moves":["seated-cat-cow","chest-opener","shoulder-rolls","seated-twist","stand-and-reach"],"conditions":["lower-back","upper-back","hips"],"wholeBody":true},
{"id":"neck-shoulders","title":"Neck and shoulders","subtitle":"Gentle mobility circle","category":"lavender","icon":"accessibility","moves":["chin-tuck","neck-side-tilt","shoulder-rolls","scapular-squeeze","doorway-chest-stretch"],"conditions":["neck-shoulders","upper-back","headaches"]},
{"id":"lower-back","title":"Lower back","subtitle":"Gentle spine release","category":"coral","icon":"spline","moves":["pelvic-tilt","knee-to-chest","standing-hip-hinge","seated-twist","supported-forward-fold"],"conditions":["lower-back","hips"]},
{"id":"hips-glutes","title":"Hips and glutes","subtitle":"Unlock long sitting","category":"sun","icon":"footprints","moves":["seated-figure-four","standing-hip-flexor","glute-squeeze","sit-to-stand","stand-and-reach"],"conditions":["hips","lower-back","knees"]},
{"id":"hands-wrists","title":"Hands and wrists","subtitle":"Typing and mouse relief","category":"mint","icon":"hand","moves":["wrist-circles","prayer-stretch","tendon-glides","finger-spreads","forearm-stretch"],"conditions":["wrists-hands"]},
{"id":"eyes","title":"Eyes","subtitle":"20-20-20 screen relief","category":"mint","icon":"eye","moves":["look-away-20","palming","focus-shift","blink-reset","eye-circles"],"conditions":["eyes","headaches"],"durationNote":"2 min"},
{"id":"feet-ankles","title":"Feet and ankles","subtitle":"Wake up your base","category":"mint","icon":"footprints","moves":["ankle-alphabet","calf-raises","toe-spreads","bottle-roll","single-leg-balance"],"conditions":["ankle-foot","knees"]},
{"id":"energy-boost","title":"Energy boost","subtitle":"Beat the afternoon slump","category":"coral","icon":"zap","moves":["marching","arm-circles","chair-squats","deep-breaths"],"conditions":[],"wholeBody":true},
{"id":"wind-down","title":"Wind down","subtitle":"Close the workday calmly","category":"lavender","icon":"moon","moves":["neck-release","desk-fold","box-breathing"],"conditions":["neck-shoulders","lower-back"],"wholeBody":true}
]
```

### 9.3 `workouts.json` (main workouts; scale `blocks` to the chosen minutes)

Each workout has `id`, `title`, `theme` (strength, walk, mobility, intervals, fun, outdoors, restore), `levels`, `equipment`, `avoidFor`, and `blocks` with `type` (warmup, work, easy, rest, cooldown), `label`, `durationSec`, `cue`. Percentages show how to scale: for a chosen total of N minutes, warm-up and cool-down take 5 minutes each when N is 20 or more (3 minutes when N is 10), and the rest is the main part.

```json
[
{"id":"run-walk","title":"Run-walk intervals","tag":"Intervals","theme":"intervals","equipment":[],"avoidFor":["ankle-foot-acute","knees-acute","heart-acute","pregnancy"],"main":{"pattern":[{"label":"Jog easy","sec":60},{"label":"Brisk walk","sec":120}],"note":"Starter: 1 min jog and 2 min walk repeated. Steady and Active: jog 3 min, walk 1 min. For 30 and 45 minutes, a 20 minute jog segment with 10 to 15 minutes of walking is allowed for Active users."},"cues":["Talk-test pace: you can speak in short sentences.","Land softly and keep shoulders relaxed."]},
{"id":"brisk-walk","title":"Brisk walk","tag":"Easy","theme":"walk","equipment":[],"avoidFor":[],"main":{"pattern":[{"label":"Steady brisk walk","sec":540},{"label":"Power minute","sec":60}]}},
{"id":"treadmill-easy","title":"Treadmill or elliptical easy","tag":"Low impact","theme":"fun","equipment":["machine"],"avoidFor":["dizziness"],"main":{"pattern":[{"label":"Easy pace","sec":300},{"label":"Slightly faster","sec":120},{"label":"Easy pace","sec":180}]}},
{"id":"free-weights","title":"Free weights full body","tag":"Strength","theme":"strength","equipment":["dumbbells"],"avoidFor":["lower-back-acute","shoulder-acute","high-bp-acute","pregnancy","recent-surgery"],"main":{"rounds":3,"restSec":30,"moves":["Goblet squat 10","Dumbbell row 10 each side","Overhead press 8","Glute bridge 12","Suitcase carry 20 steps"]}},
{"id":"bodyweight-circuit","title":"Bodyweight circuit","tag":"Strength","theme":"strength","equipment":[],"avoidFor":["knees-acute","wrists-hands-acute","recent-surgery"],"main":{"rounds":3,"restSec":30,"moves":["Sit-to-stands 10","Wall push-ups 10","Step-ups 8 each side","Knee plank 20 sec","Glute bridge 12"]}},
{"id":"band-strength","title":"Resistance band workout","tag":"Posture","theme":"strength","equipment":["band"],"avoidFor":["shoulder-acute"],"main":{"rounds":3,"restSec":30,"moves":["Band row 12","Pull-apart 12","Band walk 10 steps each way","Face pull 12"]}},
{"id":"stairs","title":"Stair session","tag":"Quick","theme":"fun","equipment":["stairs"],"avoidFor":["knees-acute","ankle-foot-acute","heart-acute"],"main":{"pattern":[{"label":"Easy stair climb","sec":60},{"label":"Slow walk down and rest","sec":90}]}},
{"id":"mobility-flow","title":"Mobility flow","tag":"Stretch","theme":"mobility","equipment":["mat"],"avoidFor":["recent-surgery"],"main":{"moves":["Cat-cow 60 sec","Low lunge stretch 40 sec each side","Thoracic rotation 40 sec each side","Hip circles 40 sec","Child's pose or seated fold 60 sec"]}},
{"id":"ankle-strength","title":"Balance and ankle strength","tag":"Ankles","theme":"restore","equipment":[],"avoidFor":["ankle-foot-acute"],"main":{"rounds":3,"restSec":20,"moves":["Single-leg stand 30 sec each","Heel raises 12","Ankle alphabet 30 sec each","Toe walk 20 steps"]}},
{"id":"core-back","title":"Core and back care","tag":"Back","theme":"strength","equipment":["mat"],"avoidFor":["lower-back-acute","pregnancy"],"main":{"rounds":3,"restSec":30,"moves":["Bird-dog 8 each side","Dead bug 8 each side","Side plank on knees 20 sec each","Glute bridge 12"]}},
{"id":"dance-cardio","title":"Dance or fun cardio","tag":"Fun","theme":"fun","equipment":[],"avoidFor":["dizziness","heart-acute"],"main":{"pattern":[{"label":"Dance to your favourite songs","sec":900}]}},
{"id":"outdoor-day","title":"Hike or outdoor day","tag":"Outdoors","theme":"outdoors","equipment":["shoes"],"avoidFor":["ankle-foot-acute","knees-acute","heart-acute"],"main":{"note":"Weekend plan: pick a nearby trail or park, take water, wear sturdy shoes, tell someone your route, and pace yourself on slopes. Includes a packing checklist."}}
]
```

### 9.4 `careCards.json`

```json
[
{"id":"lower-back","title":"Lower back","do":["Keep moving gently with short walks.","Change position every 30 to 45 minutes.","Strengthen your hips and core slowly over weeks."],"dont":["Stay in bed for long periods.","Lift heavy loads with a rounded back.","Push through sharp pain."],"recover":["Walk for 5 to 10 minutes several times a day.","Use warmth if it feels soothing.","Return to normal movement in small steps, adding about 10% a week."],"seeDoctor":["Numbness or weakness in a leg","Pain after a fall or accident","Loss of bladder or bowel control","Pain that keeps getting worse or wakes you at night"]},
{"id":"neck-shoulders","title":"Neck and shoulders","do":["Keep your screen at eye level.","Take micro-breaks every 30 minutes.","Do chin tucks and shoulder blade squeezes."],"dont":["Cradle a phone on your shoulder.","Look down at a screen for long periods.","Sleep on a very high pillow."],"recover":["Alternate short gentle stretches with movement.","Use warmth if it helps.","Check your desk setup (posture screen)."],"seeDoctor":["Numbness or tingling in your arms","Severe headache with neck pain","Pain after an accident"]},
{"id":"eyes","title":"Eye strain","do":["Follow 20-20-20: every 20 minutes look 20 feet away for 20 seconds.","Match screen brightness to your room.","Blink often."],"dont":["Use a bright screen in a dark room.","Rub your eyes hard."],"recover":["Rest your eyes in palming for a minute.","Use larger text and a little more distance."],"seeDoctor":["Sudden vision change","Eye pain or redness that persists","Flashes or floaters appearing suddenly"]},
{"id":"ankle-foot","title":"Ankle or foot","do":["Begin gentle movement early as pain allows.","Add balance work as it settles.","Wear supportive shoes."],"dont":["Push through sharp pain.","Run or jump on an unstable ankle."],"recover":["Start with ankle circles, then balance exercises.","Progress to calf raises when there is no sharp pain."],"seeDoctor":["You cannot put weight on it","Major swelling or bruising","Numbness or the foot looks out of shape"]},
{"id":"wrists-hands","title":"Wrists and hands","do":["Keep your wrists in a neutral position.","Take micro-breaks and do hand glides.","Use a relaxed grip on your mouse."],"dont":["Rest your wrists on a hard desk edge while typing.","Type or click for long periods without breaks."],"recover":["Stretch gently and rest between tasks.","Check keyboard and mouse height."],"seeDoctor":["Persistent tingling or numbness","Night pain that wakes you","Weakness or dropping things"]}
]
```

Write equivalent shorter cards for `upper-back`, `hips`, `knees`, `headaches`, `high-bp`, `heart`, `pregnancy` and `recent-surgery` using the same structure, with "talk to your doctor before exercise" as the first See a doctor item for the last four.

### 9.5 `quotes.json` (365 total; start with these 40 and write the rest in the same voice)

Rules for the other 325: original, under 20 words, no copied lines from books, songs or social posts, no medical claims, no body-shaming, and spread across three `style` values (`gentle`, `cheerleader`, `data`). Each item: `{"id":"q001","text":"...","author":"Original","style":"gentle"}`.

```json
["Small moves count. Start with one.","Your body keeps the score of every kind stretch.","Three minutes is plenty to feel different.","You don't need a perfect day, just the next move.","Stand up. Breathe. You've got this.","Motion is medicine. Your body thanks you for every stretch.","Progress loves consistency more than intensity.","A short walk is a big win today.","Be kind to your back. It carries your whole day.","One reset now beats a pause button on pain later.","Move a little. Feel a lot better.","Rest is part of the plan, not a break from it.","Your next 3 minutes belong to you.","Every stretch is a message of care.","Little breaks add up to big comfort.","Today's goal: be a little looser than yesterday.","Show up softly. Show up often.","Your desk can wait. Your spine can't.","Breathe in calm, breathe out tension.","Start where you are. Use what you have.","A gentle day still counts as a day.","Strong starts with steady.","Stretch, smile, repeat.","Your energy is built, not found. Build it in small pieces.","Walk it off, one block at a time.","Good posture is just a habit you practise.","You moved. That's the whole win.","Ease in, and keep going.","Make space in your day for your body.","The best workout is the one you actually do.","Take the stairs, take a breath, take a break.","Slow is smooth, and smooth is sustainable.","Your future self is stretching in thanks.","Loosen the shoulders. Soften the jaw. Begin again.","Keep your streak kind: one missed day is allowed.","Stand tall, breathe deep, feel the difference.","Another day, another gentle step forward.","Look up from the screen. The world is still there.","Habits grow from tiny seeds. Water yours today.","Celebrate the small stuff. It's most of the work."]
```

### 9.6 Tiny win templates (pick one per day)

"Drink a glass of water after your {time} reset." "Stand up during your next phone call." "Take the long way to the water cooler." "Roll your shoulders three times each time you open your inbox." "Look out of a window for 20 seconds after lunch." "Put your phone down and take 5 slow breaths before bed."

### 9.7 "Why today" templates (choose the first that matches)

- Gentle flag: "Today is easy and gentle, a good way to start."
- Pain score 7 or more: "Your {area} felt a {score} last time, so we've kept today gentle."
- Trending down: "Your {area} has felt better for {n} weeks. Nice work. Today builds on that."
- Missed days: "Welcome back. We've halved today so it feels easy."
- Long sitting (over 8 hours): "You sit a lot, so today has extra short resets."
- Default: "A mix of movement and quick resets to keep your day balanced."

---

## 10. Reminders (no server)

- **In-app:** while the app or the installed PWA is open, compute reminder times from the break windows (centre of each window), the daily cap, quiet days (days off) and the quiet period (22:00 to 07:00). When a reminder is due show the reminder sheet. Snooze is 10 minutes; "Skip today" skips it and records it.
- **Calendar export:** "Add reminders to my calendar" generates a recurring `.ics` file with one event per reminder (RRULE weekly on active days, 10-minute duration, an alarm at the start time) built in the browser and downloaded, so the phone's calendar fires reminders even when the app is closed.
- **Notifications:** use the Notification API only while the app is open and only after the user taps "Turn on notifications". There is no server push in this version.
- Show an "Add to Home Screen" help card for iPhone users.

---

## 11. Auth

- **Sign in with Google** through Firebase (`signInWithPopup`, falling back to redirect on mobile).
- **Continue as guest** with `signInAnonymously`. In Me, "Save my progress" runs `linkWithPopup` with the Google provider so guest data stays under the same user id. If linking fails because the Google account already exists, show a message and offer to sign in instead (guest data stays on the device and can be exported).
- Persist the session (`browserLocalPersistence`).
- No phone sign-in UI anywhere.

## 12. Data model (Firestore on Spark)

```
users/{uid}                 name, email?, photoURL?, isGuest, ageBand, sex, heightCm?, weightKg?, timeZone, language, createdAt
users/{uid}/profile/main    conditions[], painBaseline{}, painDuration{}, gettingWorse{}, safetyFlags[], equipment[], location, goal, cheerStyle, level, activity{...}, consent{at, version}
users/{uid}/schedule/main   workStart, workEnd, workType, breakWindows[{label,time}], daysOff[], weekdayMinutes, weekendMinutes, remindersPerDay, quietStart, quietEnd
users/{uid}/plans/{date}    items[{id,type,refId,time,durationMin,status}], quoteId, tinyWin, whyToday, postureDone, createdAt
users/{uid}/logs/{id}       date, kind, refId, durationSec, feedback, steps?, createdAt
users/{uid}/pain/{id}       date, condition, score, note
users/{uid}/meta/main       streak, bestStreak, freezes, lastActiveDate, badges[], disabledMoveIds[], favouriteQuoteIds[], seenQuoteIds[], monthlyTheme
```

Security rules (commit as `firestore.rules`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Export my data downloads all of the above as one JSON file. Delete account removes all subcollections, then the Firebase user, then signs out.

---

## 13. Safety and copy

- Show on every health screen: "General wellness guidance, not medical advice. Stop and seek help if you feel sharp pain, dizziness, numbness or chest discomfort."
- Use cautious words ("may help", "go gently", "stop if it hurts"). Never write "you failed", "you missed", "lazy" or "no excuses". Avoid jargon such as "somatic".
- Red or caution colours only for pain 7 or more, safety notices and "Don't" cues.
- Do not include full neck rolls, forced backbends or aggressive stretches anywhere.
- Add static pages: Terms, Privacy Policy (plain language: what is stored, that it is private to the user, how to export and delete), About.
- Consent is required before saving any health data.

---

## 14. Accessibility and performance

- All text meets WCAG AA contrast in both themes; dark text on the sky button; quote card text white on the deep gradient.
- Support system text scaling; layouts must not clip at 200% text size. Visible focus rings; every icon button has an `aria-label`; illustrations have alt text; the timer announces changes politely every 10 seconds.
- Do not rely on colour alone (state icons accompany colours).
- `prefers-reduced-motion` honoured.
- Keep the initial bundle under about 300 KB gzipped; lazy-load routes and content JSON; images in WebP under 100 KB each; no video files in version 1.
- Offline: service worker caches the shell and content; log actions queue in IndexedDB and sync to Firestore when online.

---

## 15. Illustration placeholders and art direction

Create an `<Illustration name="..."/>` component that loads `/media/{name}.webp` and, if it is missing, renders a pleasant inline SVG placeholder: a rounded gradient blob in the category colour with a simple lucide icon centred. This lets the whole app work without art.

Asset list (all optional, add later): `hero-welcome`, `hero-today`, `hero-today-done`, `hero-workout`, `scene-desk-reset`, `scene-neck-shoulders`, `scene-lower-back`, `scene-hips-glutes`, `scene-hands-wrists`, `scene-eyes`, `scene-feet-ankles`, `scene-energy-boost`, `scene-wind-down`, `onboarding-1` to `onboarding-8`, `medal`, `empty-progress`, `welcome-back`, `posture-workspace`. Per-move art `moves/{moveId}` is optional.

Art direction for later generation: friendly 3D-style characters in diverse looks, soft pastel rooms with plants and daylight, soft rounded shapes, calm expressions, no real-person photographs, each image about 800 px wide, WebP under 100 KB.

---

## 16. Hosting and deployment

- `vite.config.ts` sets `base` to `/{repo-name}/`; use hash routing.
- Add a GitHub Actions workflow `deploy.yml` that builds and publishes to GitHub Pages using the free public-repo action (`actions/upload-pages-artifact` and `actions/deploy-pages`). Firebase config is read from the repository's public build variables (not secrets); these values are public identifiers.
- Add `README.md` with the owner steps from section 0 and the Firebase rules.

---

## 17. Build milestones (one step each, test before continuing)

1. **Setup:** Vite, React, TypeScript, Tailwind, tokens (section 4.1), fonts, glass card, header, bottom navigation, routing, light and dark mode, PWA manifest, Illustration placeholder component.
2. **Auth and data:** Firebase init from env, Google sign-in, guest mode, link account, Firestore wiring, IndexedDB cache, rules file, welcome screen.
3. **Onboarding:** all 8 steps, safety sheet, consent, saving profile and schedule.
4. **Content and engine:** import seed JSON, plan engine with unit tests for the exclusion, scoring, streak and target rules.
5. **Today screen** exactly as in 6.3 with the generated plan, Customize sheet, quote card and share image.
6. **Player and complete:** timer ring, audio coach, pause and end sheet, switch sides, wake lock, completion screen, feedback handling.
7. **Plan your workout, workout detail, Plan week.**
8. **Logging and Progress:** logs, streak and freezes, weekly ring, sitting blocks timeline, pain chart, badges, Log it myself, pain check-in.
9. **Care and Posture:** care cards for every condition, posture check and session, tips.
10. **Reminders and Me:** in-app reminder sheet, calendar export, notification toggle, settings, export and delete, save-progress link.
11. **Apple Health import,** offline queue, accessibility pass, performance pass.
12. **Deploy:** GitHub Actions to Pages, authorised domain, final acceptance checks.

---

## 18. Acceptance criteria

- A new user can open the app, sign in with Google or as a guest, finish onboarding and complete a 3-minute reset in under 5 minutes.
- Everything works end to end with no billing account attached, and no code path calls a paid or key-protected service.
- A user with lower-back pain never sees a move whose `avoidFor` includes their condition (including the `-acute` variants when flagged). A Yes on the safety screen produces a gentle-only plan and the doctor notice.
- Tapping "This hurt" removes that move from future plans until re-enabled in Me.
- Today and Progress show identical streak, reset and target numbers; there is exactly one streak chip per screen.
- Task cards for completed tasks show no strikethrough; the Plan your workout screen shows the Minutes card once and no row text is truncated.
- The Player has exactly one top row, a looping or breathing visual, an End-session confirmation and a working pause.
- The pain chart shows scores such as "7 to 3", never percentages, and the target label never overlaps a data point.
- Reminders work through the in-app sheet and the downloaded calendar file.
- Export returns a JSON file and delete removes all user data.
- Light and dark modes both pass contrast, and the app works at 360 px width and offline after first load.
