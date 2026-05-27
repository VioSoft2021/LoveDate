# `admin_audit` retention policy

**Owner:** InviteAdmin app
**Defined in:** `LoveDateInviteAdmin/supabase/migrations/20260510_admin_audit.sql`

## What the table is for

Every invite-code admin action (create / activate / deactivate / delete)
inserts a row into `public.admin_audit` with the admin's email,
action, code, IP, and timestamp. Used by the InviteAdmin app's
"Admin audit" panel (Codes screen) so Master has a traceable history.

## Retention policy

**Manual cleanup, ~1× per year.** No pg_cron, no scheduled job.

Reasoning: at current beta volume (~30 admin actions per month), the
table will hold ~360 rows after a year and ~3,600 after a decade —
trivially small. Pg_cron adds Supabase complexity (extension enable,
job scheduling, monitoring) without meaningful benefit at this scale.

Master runs the cleanup query below when the table size grows past
~10,000 rows (visible from Supabase Dashboard → Table Editor →
`admin_audit` → row count).

## Cleanup query

Run from Supabase SQL Editor:

```sql
-- Delete admin_audit rows older than 365 days.
-- Returns the number of rows deleted so Master can confirm the size drop.
delete from public.admin_audit
 where created_at < now() - interval '365 days'
returning id;
```

If a deeper purge is needed later (e.g. before a public launch), bump
the interval down to 90 or 30 days — same query shape.

## When to upgrade to pg_cron

If `admin_audit` ever crosses 100k rows OR if real-time analytics
read it (e.g. a dashboard counting daily admin actions), at that
point migrate to an `extensions.pg_cron` scheduled job with a
sensible retention window. Until then, this manual policy is enough.
