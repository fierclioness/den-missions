# Den Missions 2.1 — Eastern-time verification boundary patch (review only)

**Status:** Proposed implementation, NOT deployed. No member records or production settings changed.

## Root cause

The deployed `smart-verification-dev` function uses `Date.parse(week_start + 'T00:00:00Z')` and `+ 7 * 86400000` in **two** places: the message scan and `validateDiscordEvidence`. The server RPC `public.auto_verify_discord_mission` also casts `week_start` and `week_start + 7` to `timestamptz` without explicitly setting America/New_York. These can disagree with the website's Monday midnight Eastern policy.

## Edge Function replacement helper

Add once near the top of the worker:

```ts
function easternMidnightUtc(isoDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error("Invalid week start");
  const noonUtc = new Date(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(noonUtc.getTime())) throw new Error("Invalid date");
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", timeZoneName: "shortOffset",
  }).formatToParts(noonUtc).find(p => p.type === "timeZoneName")?.value || "";
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zoneName);
  if (!match) throw new Error("Eastern time zone offset unavailable");
  const offset = (match[1] === "+" ? 1 : -1) *
    (Number(match[2]) * 60 + Number(match[3] || 0));
  return Date.parse(`${isoDate}T00:00:00Z`) - offset * 60000;
}

function easternWeekBounds(weekStart: string) {
  const start = easternMidnightUtc(weekStart);
  const next = new Date(Date.parse(`${weekStart}T12:00:00Z`));
  next.setUTCDate(next.getUTCDate() + 7);
  const end = easternMidnightUtc(next.toISOString().slice(0, 10));
  return { start, end };
}
```

Replace **both** `Date.parse(`${week_start}T00:00:00Z`)` / `+ 7 * 86400000` calculations with `const {start, end} = easternWeekBounds(week_start)`, and require `postedAt >= start && postedAt < end`. Preserve `postedAt >= selectedAt`, author/channel checks, idempotence and credential handling.

## Database RPC review change (requires separate deployment approval)

Inside `public.auto_verify_discord_mission`, replace only the two week-boundary expressions in the existing `outside_mission_window` condition with:

```sql
p_message_time < (v_selection.week_start::timestamp at time zone 'America/New_York')
or p_message_time >= ((v_selection.week_start + 7)::timestamp at time zone 'America/New_York')
```

Keep the entire existing function body, security definer settings, admin protections, evidence timestamp check, and verification insert unchanged. **Do not apply an abbreviated CREATE OR REPLACE FUNCTION**: use the full existing function definition with only these two expressions replaced, and verify the final definition afterward.

## Read-only boundary tests already checked in PostgreSQL

| Week start | UTC start | UTC end | Hours |
|---|---|---|---|
| 2026-11-16 | 2026-11-16 05:00 | 2026-11-23 05:00 | 168 |
| 2027-03-08 | 2027-03-08 05:00 | 2027-03-15 04:00 | 167 |
| 2027-07-05 | 2027-07-05 04:00 | 2027-07-12 04:00 | 168 |
| 2027-11-01 | 2027-11-01 04:00 | 2027-11-08 05:00 | 169 |

Before deployment: run worker unit tests for the four weeks, exact start/end instants and one millisecond before each, selection timestamp, wrong channel and author, and rerun server-side tests. Confirm scheduled jobs are not set to write/award in a test environment. Test the signed-in website and bot role flow with an authorized test account. Then request approval for live worker/SQL deployment.

Related: #2 and frontend PR #1.
