# LoveDate Invite Admin Design

## Goal

Build a separate private mobile app for generating and registering LoveDate beta invite codes. The app will live outside the public LoveDate user experience and will be installed only on the owner's phone.

The app must generate long, high-entropy invite codes through a chained multi-stage algorithm, randomize the final code format, and register the final code automatically in the existing Supabase `public.beta_invites` table.

## Project Shape

Recommended project location:

- Public app remains in `C:\LoveDate`.
- Private admin app is created as a separate project, for example `C:\LoveDateInviteAdmin`.
- Both apps use the same Supabase project.

This separation reduces the chance of shipping admin controls inside the public dating app while keeping invite codes compatible with the current LoveDate login validation.

## Security Model

The phone app must not contain a Supabase service-role key or any credential that can directly write unrestricted database rows.

The safe flow is:

1. The phone app signs in with the owner's Supabase Auth account.
2. The phone app calls a Supabase Edge Function named `create-invite-code`.
3. The Edge Function checks the authenticated user against an admin allowlist.
4. The Edge Function inserts the final code into `public.beta_invites`.
5. The phone app receives the created invite record and shows copy/share controls.

The allowlist can start as an Edge Function environment variable such as `ADMIN_EMAILS` or `ADMIN_USER_IDS`. User IDs are preferred once the owner's account is stable.

## Invite Code Generation

The generator starts with secure random bytes from the platform cryptography API. The first random seed is then passed through about 10 chained stages, where each stage uses the previous stage as its input.

Planned stages:

1. Secure random seed.
2. Normalize into a safe alphabet.
3. SHA-256 hash.
4. Mix with admin/session salt.
5. HMAC-style digest.
6. Base32-style encode using the safe alphabet.
7. Deterministic shuffle.
8. Collision-resistant rehash.
9. Add checksum characters.
10. Randomize the final format and produce the visible code.

The final code is the only value stored in Supabase. Intermediate stages may be shown locally in an optional trace panel, but they are not sent to the database.

## Code Format Rules

The final code should be long, readable, and unbranded.

Rules:

- No branded prefixes such as `LD`, `LOVE`, `LVD`, or `DATE`.
- Uppercase letters and numbers only.
- Exclude confusing characters: `0`, `O`, `1`, `I`.
- At least 16 body characters before separators.
- Randomized grouping and separator pattern.
- Reasonable typing length, generally 19 to 26 visible characters.

Example format families:

- `A7KQ-M9VP-R4TX-Z8CN`
- `A7KQM-9VPR4-TXZ8C-NH6D`
- `A7KQ9-MVPR4-TXZ8C`
- `A7KQ.M9VP.R4TX.Z8CN`
- `A7KQM9VP-R4TXZ8CN`

Each generated code is checked locally for format validity before registration. The Edge Function should also reject malformed codes.

## Admin App UI

The first version should be a compact mobile-first app with:

- Sign-in screen for the owner.
- Generator screen with one primary `Generate` action.
- Settings for `uses_left`, expiration date, and optional internal note/campaign label.
- Final code preview.
- Optional generation trace toggle.
- `Register in Supabase` action.
- Success state with copy/share buttons.
- Recent generated codes list.

The UI should feel like a private operational tool rather than a marketing page. It should use the LoveDate premium dark/gold visual language only lightly, without making it look like the public dating app.

## Supabase Data Contract

Existing table:

```sql
public.beta_invites (
  id uuid primary key,
  code text unique not null,
  active boolean not null default true,
  expires_at timestamptz,
  uses_left integer not null default 1,
  created_at timestamptz not null default now()
)
```

Create request payload:

```json
{
  "code": "A7KQ-M9VP-R4TX-Z8CN",
  "usesLeft": 1,
  "expiresAt": "2026-08-05T00:00:00.000Z",
  "label": "Private beta"
}
```

Create response payload:

```json
{
  "id": "uuid",
  "code": "A7KQ-M9VP-R4TX-Z8CN",
  "active": true,
  "usesLeft": 1,
  "expiresAt": "2026-08-05T00:00:00.000Z",
  "createdAt": "2026-05-07T00:00:00.000Z"
}
```

The current table does not have a `label` column. The first version can ignore the label server-side, or a later migration can add metadata fields if needed.

## Error Handling

The app should handle:

- Not signed in.
- Signed in but not admin.
- Network or Edge Function failure.
- Generated code already exists.
- Invalid uses or expiration settings.
- Supabase insert failure.

On a collision, the app can regenerate automatically once, then ask the user to try again if the second attempt also fails.

## Testing

Implementation should include focused tests for:

- Safe alphabet excludes confusing characters.
- Generated final codes pass all format rules.
- Format pattern selection varies across runs.
- Chained generation is deterministic after seed/salt inputs.
- Edge Function rejects unauthenticated and non-admin requests.
- Edge Function inserts valid invite rows.

Manual verification should cover:

- Generate a code.
- Register it in Supabase.
- Confirm it appears in `beta_invites`.
- Use that exact code in the existing LoveDate login/register flow.

## Open Decisions

No blocking open decisions remain for the first implementation plan. The app will be separate, mobile-first, Supabase-connected through an admin Edge Function, use long unbranded randomized formats, and store only final codes.
