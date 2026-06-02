# Privé calling — infrastructure setup (TURN + Push)

Two pieces of infra to finish calling. They're independent — do them in any order.
Everything in the app code is already wired; these steps provide the servers/keys
the code reads.

---

## 1. TURN relay (coturn) — so strict-NAT / mobile-CGNAT users can connect

Calls connect peer-to-peer for ~80–90% of people via free STUN. The rest (symmetric
NAT, office firewalls, Romanian mobile CGNAT) need a TURN relay. We're self-hosting
coturn — flat ~$5/mo, never per-call.

### 1a. Get a VPS
- Any small Linux VPS with a **static public IP**: Hetzner (CX22 ~€4), DigitalOcean,
  Contabo, etc. Ubuntu 22.04 or 24.04.
- Note its **public IP** (call it `YOUR_VPS_IP` below).

### 1b. Install coturn (run on the VPS over SSH)
```bash
sudo apt update && sudo apt install -y coturn
```
Enable the service: edit `/etc/default/coturn` and uncomment the line:
```
TURNSERVER_ENABLED=1
```

### 1c. Configure it
Replace `/etc/turnserver.conf` with (set your own strong password + your IP):
```
listening-port=3478
lt-cred-mech
user=prive:CHOOSE_A_STRONG_PASSWORD
realm=prive-app.club
external-ip=YOUR_VPS_IP
min-port=49160
max-port=49200
no-tls
no-dtls
log-file=/var/log/turnserver.log
```

### 1d. Open the firewall (VPS firewall + provider panel)
```bash
sudo ufw allow 3478
sudo ufw allow 49160:49200/udp
```
(If the provider has its own firewall panel, open the same ports there too.)

### 1e. Start it
```bash
sudo systemctl enable coturn
sudo systemctl restart coturn
```

### 1f. Verify (before touching the app)
Open the WebRTC Trickle-ICE test page:
https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- Add server: `turn:YOUR_VPS_IP:3478`, username `prive`, credential your password.
- Remove the default Google STUN row so only TURN is tested.
- Click **Gather candidates** → you should see at least one candidate of type **`relay`**.
  If you see `relay`, TURN works. If not, re-check the firewall/external-ip.

### 1g. Point the app at it
Add to `.env.local` (and on any machine that builds the app):
```
VITE_TURN_URL=turn:YOUR_VPS_IP:3478
VITE_TURN_USERNAME=prive
VITE_TURN_CREDENTIAL=CHOOSE_A_STRONG_PASSWORD
```
Then rebuild: web (`npm run build`, push to deploy) and the APK (`npm run build` →
`npx cap sync android` → assemble/install). The call code already appends this relay
to its ICE servers automatically.

### Security note (fine to defer past beta)
`VITE_*` vars are baked into the public client bundle, so this TURN password is
visible to anyone who inspects the app. For a beta the only risk is someone using
your relay's bandwidth. To harden later: switch coturn to `use-auth-secret` (a shared
secret) and have a tiny edge function hand out **time-limited** TURN credentials per
call; also add TLS (`turns:5349` + a Let's Encrypt cert) so calls survive networks
that block plain UDP. Ask me when you want this — it's a small follow-up.

---

## 2. Firebase Cloud Messaging — so the installed app rings when it's closed

The Android app currently gets no background notifications (no Firebase in the
project). FCM is the only way the installed APK/Play app can ring when closed. FCM is
**free**.

### 2a. Create the project (do this now; hand me the file)
1. Go to https://console.firebase.google.com → **Add project**.
   - Name it e.g. `Prive`. Google Analytics: not needed (you can disable it).
2. In the project, click **Add app → Android**.
   - **Android package name:** `com.lovedate.app`  (must match exactly)
   - Nickname/SHA-1: optional, skip for now.
3. Download the generated **`google-services.json`**.
4. Put it at: `android/app/google-services.json` (or just hand it to me and I'll place
   it). This file is safe to keep out of git — I'll gitignore it.

That's all I need from you to start the FCM build.

---

## 3. Activate offline ringing (once the Firebase project from §2 exists)

All the app/server code is already shipped; these steps turn it on.

### 3a. Drop in google-services.json + rebuild the APK
Place the file from §2a at `android/app/google-services.json` (it's gitignored — keep a
copy on each build machine, like `.env.local`). Then rebuild:
`npm run build` → `npx cap sync android` → assemble + install the APK.

### 3b. Apply the database migration
In the Supabase SQL editor, run **`scripts/calls_push_setup.sql`** (creates the
`device_push_tokens` table the phones register into).

### 3c. Firebase service-account key (lets the server SEND pushes)
1. Firebase console → ⚙ **Project settings → Service accounts → Generate new private
   key** → downloads a JSON file.
2. Supabase dashboard → **Edge Functions → Secrets** → add a secret named
   **`FCM_SERVICE_ACCOUNT`** whose value is the **entire contents** of that JSON.
   (Pasting in the dashboard avoids shell-quoting the multi-line private key.)
   - The Web-Push secrets (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`)
     already exist from the message-push function and are reused automatically.
3. **Delete the downloaded JSON locally afterwards — it's a real secret. Never commit it.**

### 3d. Deploy the Edge Function
```bash
npx supabase functions deploy send-call-push
```
(JWT verification stays ON, so only a signed-in user can ring — and only as themselves.)

### 3e. Test (on the phone — I'll read the logs)
- Sign in on the phone, then **fully close** the app.
- From the other matched account (desktop/web), place a call to the phone.
- The phone should show an **"Incoming call"** notification even though the app is
  closed; tapping it opens Privé ringing. Ping me and I'll confirm the FCM path from
  the device logs.
