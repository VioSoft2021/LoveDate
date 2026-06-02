# Privé calling — infrastructure setup (TURN + Push)

Two pieces of infra to finish calling. They're independent — do them in any order.
Everything in the app code is already wired; these steps provide the servers/keys
the code reads.

---

## 1. TURN relay — self-hosted coturn on Oracle Cloud "Always Free" (€0)

Calls connect peer-to-peer for ~80–90% of people via free STUN. The rest (symmetric
NAT, office firewalls, Romanian mobile CGNAT) need a TURN relay. We self-host coturn on
an Oracle **Always Free** VM — yours to own, €0/month, forever.

> **Oracle has TWO traps that sink most first-timers. Both are handled below — don't skip them:**
> 1. **Two firewalls.** Oracle blocks ports in the cloud console (VCN Security List)
>    AND again inside the VM (iptables). Open the ports in **BOTH** (steps 1c + 1e).
> 2. **NAT.** The VM sees a *private* IP (`10.x.x.x`) but the world reaches it on a
>    *public* IP. coturn must be told both: `external-ip=PUBLIC/PRIVATE` (step 1f).

### 1a. Create the Oracle account
- https://www.oracle.com/cloud/free/ → **Start for free.**
- Needs email, phone (SMS code), and a card for **identity verification only** —
  Always Free resources never charge it. Look for the green **"Always Free"** labels.
- **Home Region is permanent — pick the closest to your users.** For Romania:
  **Frankfurt** or **Amsterdam** (lowest call latency).

### 1b. Create the VM
Console → ☰ menu → **Compute → Instances → Create instance.**
- **Image:** Canonical **Ubuntu 22.04** (or 24.04).
- **Shape:** *Change shape* → **Ampere (VM.Standard.A1.Flex)**, 1 OCPU / 6 GB if offered.
  If it says *"out of host capacity"*, pick **VM.Standard.E2.1.Micro** (AMD, always
  available, 1 GB — plenty for coturn).
- **SSH keys:** **Save the private key** (download it — you need it to log in).
- **Networking:** keep the default new VCN; ensure **"Assign a public IPv4 address" = Yes**.
- **Create** → wait for *Running* → copy the **Public IP address** (call it `PUBLIC_IP`).

### 1c. Open ports in the cloud firewall (VCN — trap #1, layer 1)
Instance page → click its **Subnet** → click the **Default Security List** → **Add
Ingress Rules**. Add these three, each with Source CIDR `0.0.0.0/0`:

| IP Protocol | Destination Port Range |
|---|---|
| UDP | 3478 |
| TCP | 3478 |
| UDP | 49152-49200 |

### 1d. SSH in
From your PC, using the key you downloaded:
```
ssh -i path\to\your-key.key ubuntu@PUBLIC_IP
```
(Ubuntu image → user is `ubuntu`. If Windows refuses the key as "too open": right-click
the key file → Properties → Security → Advanced → Disable inheritance → leave only your
own user with Read.)

### 1e. Open the same ports INSIDE the VM (iptables — trap #1, layer 2)
Oracle's Ubuntu image blocks everything but SSH at the OS level. Insert ACCEPT rules
*above* its default REJECT, then persist:
```bash
sudo iptables -I INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 49152:49200 -j ACCEPT
sudo netfilter-persistent save
```
(If `netfilter-persistent` isn't found: `sudo apt install -y iptables-persistent` first.)

### 1f. Install + configure coturn
```bash
sudo apt update && sudo apt install -y coturn
```
Enable it: `sudo nano /etc/default/coturn` → uncomment `TURNSERVER_ENABLED=1`.

Get the VM's **private** IP (the `10.x.x.x`):
```bash
hostname -I
```
Edit `sudo nano /etc/turnserver.conf` — set your password + your two IPs:
```
listening-port=3478
lt-cred-mech
user=prive:CHOOSE_A_STRONG_PASSWORD
realm=prive-app.club
# Trap #2 — Oracle puts the VM behind 1:1 NAT, so map PUBLIC/PRIVATE:
external-ip=PUBLIC_IP/PRIVATE_IP
min-port=49152
max-port=49200
no-tls
no-dtls
log-file=/var/log/turnserver.log
```
Start it:
```bash
sudo systemctl enable coturn
sudo systemctl restart coturn
```

### 1g. Verify (before touching the app)
WebRTC Trickle-ICE: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- Remove the default Google STUN row.
- Add: `turn:PUBLIC_IP:3478`, username `prive`, credential your password.
- **Gather candidates** → you must see a candidate of type **`relay`**. If you do, TURN
  works. If not, paste me the output — it's almost always one of the two firewalls or
  the `external-ip` line, and I'll tell you which.

### 1h. Point the app at it
Add to `.env.local` (on each build machine):
```
VITE_TURN_URL=turn:PUBLIC_IP:3478
VITE_TURN_USERNAME=prive
VITE_TURN_CREDENTIAL=CHOOSE_A_STRONG_PASSWORD
```
Rebuild: web (`npm run build`, push to deploy) + APK (`npm run build` → `npx cap sync
android` → assemble/install). The call code appends this relay to its ICE servers
automatically.

### Security note (fine to defer past beta)
`VITE_*` vars are baked into the public client bundle, so this TURN password ships
visible in the app. For a beta the only risk is someone using your relay's bandwidth
(and Always Free includes 10 TB/month outbound). To harden later: switch coturn to
`use-auth-secret` and hand out **time-limited** credentials from a tiny edge function;
add TLS (`turns:5349` + a Let's Encrypt cert) for networks that block plain UDP. Ask me
when you want this.

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
