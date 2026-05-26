# Privé — Public Welcome Video (Zero-Budget Production Guide)

A self-running 2:30 cinematic intro video for Privé. The HTML at
`public-en-v2.html` IS the video — you screen-record it, optionally add
voiceover + music, and post.

**Total cost: €0.** Everything below is free.

---

## 📦 What's in this folder

- `public-en-v2.html` — the animated video (open in browser, plays itself)
- `voiceover-clean-v2.txt` — the exact text to paste into ElevenLabs
- `crest-3.png` — the Privé heraldic crest used in the brand-reveal scenes
- `README.md` — this file

---

## 🖼 Scene content — pure CSS mockups, no screenshots needed

Scenes 5, 6 and 7 used to fall back to real phone screenshots when
available. As of 2026-05-26 the video uses **CSS-rendered mockups with
synthetic data instead** — Master's call. The reasoning: the in-app UI
keeps evolving (Discover, FilterScreen, LovePersonalityScreen have all
been redesigned multiple times since May), and chasing fresh
screenshots after every iteration is busywork. The CSS mockups stay in
the same file as the rest of the video, render the same way regardless
of the current UI, and use representative-but-fictional values
("Alex, 32 · București", a 87% compatibility counter, "23 matches",
the archetype *Curious Anchor* with Big Five bars + Secure attachment).

If you ever want to swap the synthetic data for real numbers / real
candidate names, the mockup HTML lives inline in `public-en-v2.html` —
search for `mockup-fallback` to find each scene's block.

---

## 🎬 Step 2 — Record the video (15 minutes, free)

### Tool: **OBS Studio** (free, recommended) — get from [obsproject.com](https://obsproject.com)

Once installed:

1. **Add a source**: in the Sources panel, click + → **Display Capture** (records your monitor) OR + → **Window Capture** (records just the browser window — recommended)
2. **Resolution settings**: File → Settings → Video → Base Resolution: **1920×1080**, Output Resolution: **1920×1080**, FPS: **30** or **60**
3. **Output format**: Settings → Output → Recording Format: **MP4**
4. **Open the video**: open `public-en.html` in Chrome. Press **F11** for fullscreen.
5. **Start recording**: in OBS, click Start Recording. Then switch to the browser.
6. **Refresh the page** (Ctrl+R) — the 2:30 animation begins playing from scene 1.
7. **Wait the full 2:30** without touching your mouse or keyboard.
8. **Stop recording**: in OBS, click Stop Recording.

Your video is saved (by default) in `Videos/` folder as `.mp4`.

### Alternative tool: **Windows Game Bar** (built-in, simpler)

1. Open `public-en.html` in Chrome, fullscreen (F11).
2. Press **Win + G** to open Game Bar.
3. Click the **Record** button (circle).
4. Switch back to Chrome, refresh (Ctrl+R).
5. Wait 2:30.
6. Press **Win + Alt + R** to stop.

Saved in `Videos/Captures/`.

---

## 🎙 Step 3 — Add voiceover (20 minutes, free)

### Tool: **ElevenLabs free tier** — [elevenlabs.io](https://elevenlabs.io)

1. Sign up free → you get **10,000 characters/month** at no cost
2. (Our voiceover script is ~600 chars, well within free tier)
3. Browse Voice Library → search **"calm British female"** OR **"intimate narrator"**.
   - Recommended voices: **Charlotte**, **Sarah**, **Alice**
4. Open `voiceover-script.txt` in this folder, copy the text
5. Paste into ElevenLabs Text-to-Speech, pick your voice, adjust:
   - **Stability**: 60%
   - **Style**: 25%
   - **Clarity + Similarity**: 80%
6. Click Generate → listen → if you like it, click Download (MP3)
7. Save as `voiceover.mp3` next to your recorded video

---

## 🎵 Step 4 — Get free music (10 minutes)

### Option A: **YouTube Audio Library** (truly free, no attribution required)

1. Go to [studio.youtube.com](https://studio.youtube.com) → Audio Library
2. Filter:
   - Genre: **Classical & Ambient** OR **Cinematic**
   - Mood: **Calm**
   - Duration: **> 2 min**
3. Suggested searches: *"piano reflection"*, *"ambient cinematic"*, *"emotional classical"*
4. Download the track that breaks your heart in the right way

### Option B: **Pixabay Music** — [pixabay.com/music](https://pixabay.com/music)

Free, commercial use OK, no attribution. Same search terms.

### Option C: **Free Music Archive** — [freemusicarchive.org](https://freemusicarchive.org)

Find composers like **Kai Engel**, **Lee Rosevere** — classical/ambient/free.

---

## 🎞 Step 5 — Combine everything (15 minutes, free)

### Tool: **CapCut Desktop** (free) — get from [capcut.com](https://www.capcut.com)

1. Open CapCut → New Project
2. Drag your screen-recording MP4 into the timeline
3. Drag `voiceover.mp3` onto a second audio track
4. Drag the music track onto a third audio track, **lower its volume to ~25%** (so VO sits on top)
5. Adjust timing: line up the VO to start ~0:08 (after the wordmark) — drag the audio clip on the timeline
6. Export: 1080p, MP4, 30fps. Done.

### Alternative: **DaVinci Resolve** (free, more professional)

Same workflow, more powerful. Download from [blackmagicdesign.com](https://www.blackmagicdesign.com/products/davinciresolve).

---

## 📤 Step 6 — Post

- **Instagram Reels / TikTok**: vertical 9:16 — you'll need to re-record the HTML rotated 90°, OR have your editor letter-box it
- **YouTube / website embed**: 1920×1080 horizontal works as-is
- **WhatsApp / DMs**: any format, compress if > 50MB

---

## 🎯 What this gets you

A **2:30 luxury cinematic video** featuring:
- The Privé wordmark animation
- A frustration montage ("Endless swipes. Empty conversations.")
- A pivot moment ("What if the algorithm wasn't a slot machine, but a curator?")
- **3 real screenshots from your actual app** (when you add them)
- Personality reveal moment (the wow)
- Invite-only positioning
- CTA: prive-app.club

Total spend: **€0**. Total time: **~70 minutes** end-to-end.

---

## 🪄 Iterate

The HTML is editable — you can:
- Change any text by editing `public-en.html` and refreshing
- Replace screenshots — just drop a new one in `screenshots/` with the same name
- Adjust scene timing — search for the `s5 { animation: s5 30s ease 45s 1 forwards; }` line and change the `45s` (start time) or `30s` (duration)
- Change colors — top of the file has `:root { --gold-1: #cfad61; ... }` — swap to brand-variant if needed

---

When you're ready to add voiceover, the next step is to copy
`voiceover-script.txt` and paste into ElevenLabs. Master, this is your
hands-on path. I built the video; you ship it.

— Theo
