# LoveDate

A Tinder-style swipe interface built with React, TypeScript, and Vite.

## Features

- Login screen with email/password or guest access
- Auth session persistence in localStorage
- Swipe cards left and right with pointer gestures
- Pass and Like action buttons
- Layered card stack with animated transitions
- Mobile-friendly layout and touch support
- Final deck screen with restart action
- Persistent local history for likes, passes, and matches
- Match modal when a mutual like occurs in the demo flow
- Filter profiles by age range, city, and interests
- Option to include or exclude previously reviewed profiles
- Undo the most recent swipe action
- API-like service layer for profile loading and match resolution
- Keyboard controls for swipe and undo actions
- Retry flow for profile loading failures
- Multi-screen app structure: Discover, Activity, Chats, Profile, and Settings
- Match modal can jump directly into chat thread
- Profile detail screen with photos, about info, and prompts
- Chat list previews with timestamps and unread counters
- Match queue plus notification badges in bottom navigation
- URL-based routing for login, discover, activity, chats, profile, settings, and profile detail
- Supabase-first backend layer with local fallback behavior
- Settings screen includes a Supabase `todos` table preview panel
- Plan-aware engagement controls with daily like-limit enforcement
- In-app plan switcher (Free, Plus, Gold, Platinum) on Settings screen
- Super Like action with weekly usage limits by plan
- Product spec modules for plans, feature flags, ranking weights, and app constraints
- Typed API contract map for auth, discovery, swipes, matches, chats, settings, and moderation

## Scripts

- npm run dev: start the development server
- npm run build: run TypeScript build and production bundle
- npm run preview: preview production build

## Run Locally

1. npm install
2. npm run dev

## Supabase Setup (Free Firebase Alternative)

1. Create a free project at Supabase.
2. Copy .env.example to .env.
3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
4. Run scripts/supabase_beta_setup.sql in Supabase SQL editor.
5. Set VITE_REQUIRE_INVITE_CODE=true and VITE_ALLOW_GUEST_LOGIN=false for beta.
6. Restart the dev server.

Without env values, the app uses a local fallback mode.

## Project Notes

- Main UI logic lives in src/App.tsx
- Data service abstraction lives in src/services/loveDateApi.ts
- Supabase-ready backend endpoints live in src/services/backendApi.ts
- Supabase client factory lives in src/services/supabaseClient.ts
- Runtime feature flags live in src/services/runtimeConfig.ts
- Tinder-equivalent app configuration lives in src/spec/lovedateConfig.ts
- Typed API contracts live in src/spec/apiContracts.ts
- Plan and feature gate helpers live in src/services/planGate.ts
- Daily engagement limit logic lives in src/services/engagementLimits.ts
- Styling is in src/App.css and src/index.css
- Production output is generated in dist after npm run build
