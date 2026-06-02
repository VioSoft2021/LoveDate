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

That's all I need from you to start the FCM build. Later (for the server to *send*
the pushes) I'll also need a **service-account key** from the same project — I'll give
you those exact steps when I get to the edge-function part, so we don't do it out of
order.
