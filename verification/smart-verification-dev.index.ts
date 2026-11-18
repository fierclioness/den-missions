
/**
 * Den Missions 2.1 — Read-only development matcher
 * No database writes, approvals, or role changes.
 */

const CHANNELS = {
  general: "1546529501859815438",
  daily_question: "1562480265878577233",
  wordle: "1561393990392094790",
} as const;

const GUILD_ID = "1546529497925296199";

// Same Monday-midnight America/New_York week used by the Den Missions website.
// Pure Eastern-time mission week boundaries. No database or Discord access.
function easternMidnightUtc(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error("Invalid ISO date");
  const noonUtc = new Date(isoDate + "T12:00:00Z");
  if (!Number.isFinite(noonUtc.getTime()) || noonUtc.toISOString().slice(0, 10) !== isoDate) throw new Error("Invalid ISO date");
  const offsetLabel = new Intl.DateTimeFormat("en-US", {timeZone:"America/New_York",timeZoneName:"shortOffset"})
    .formatToParts(noonUtc).find(part => part.type === "timeZoneName")?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offsetLabel || "");
  if (!match) throw new Error("Eastern offset unavailable");
  const offsetMinutes = (match[1] === "+" ? 1 : -1) * (Number(match[2])*60 + Number(match[3] || 0));
  return Date.parse(isoDate + "T00:00:00Z") - offsetMinutes*60000;
}
function easternWeekBounds(weekStart) {
  const start = easternMidnightUtc(weekStart);
  const next = new Date(Date.parse(weekStart + "T12:00:00Z"));
  next.setUTCDate(next.getUTCDate()+7);
  return {start, end:easternMidnightUtc(next.toISOString().slice(0,10))};
}
function isEligibleEvidence({postedAt, selectedAt, weekStart}) {
  const {start,end}=easternWeekBounds(weekStart);
  const posted=Date.parse(postedAt), selected=Date.parse(selectedAt);
  return Number.isFinite(posted) && Number.isFinite(selected) && posted >= selected && posted >= start && posted < end;
}


const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

type DiscordMessage = {
  id: string;
  channel_id: string;
  timestamp: string;
  content?: string;
  author?: { id: string; bot?: boolean };
};

type Selection = {
  id: number;
  discord_user_id: string;
  mission_id: string;
  week_start: string;
  selected_at: string;
};

const meaningful = (m: DiscordMessage) => {
  const content = (m.content || "").trim();
  return !m.author?.bot &&
    content.length >= 5 &&
    /\p{L}/u.test(content);
};

const missionFor = (channel: string) =>
  channel === CHANNELS.general ? "break-the-ice" :
  channel === CHANNELS.daily_question ||
  channel === CHANNELS.wordle ? "daily-fun" : null;

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);

  
const devKey = Deno.env.get("SMART_VERIFICATION_DEV_KEY");
const scheduleKey = Deno.env.get("SMART_VERIFICATION_SCHEDULE_KEY");

const suppliedDev = req.headers.get("x-smart-verification-dev-key");
const suppliedSchedule = req.headers.get("x-smart-verification-schedule-key");

const devAuthorized =
  !!devKey && !!suppliedDev && suppliedDev === devKey;

const scheduleAuthorized =
  !!scheduleKey && !!suppliedSchedule &&
  suppliedSchedule === scheduleKey;

if (!devAuthorized && !scheduleAuthorized) {
  return respond({ error: "Unauthorized" }, 401);
}


  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  const evidenceTestPassed = await testDiscordEvidence();
  
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const writesEnabled =
  Deno.env.get("SMART_VERIFICATION_WRITES_ENABLED") === "true";

  if (!botToken || !url || !serviceKey)
    return respond({ error: "Missing configuration" }, 500);

  try {
    // Read selections only. Never write to Supabase.
    const selectionsResponse = await fetch(
      `${url}/rest/v1/weekly_selections?select=id,discord_user_id,mission_id,week_start,selected_at&mission_id=in.(break-the-ice,daily-fun)&limit=1000`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!selectionsResponse.ok)
      return respond({
        error: "Could not read selections",
        status: selectionsResponse.status,
      }, 502);

    const selections =
      await selectionsResponse.json() as Selection[];

    // Read existing verified progress only.
    
const progressResponse = await fetch(
  `${url}/rest/v1/rpc/dev_get_verified_selection_ids`,
  {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    signal: AbortSignal.timeout(15000),
  }
);

    if (!progressResponse.ok)
      return respond({
        error: "Could not read progress",
        status: progressResponse.status,
      }, 502);

    const progress = await progressResponse.json() as
      { selection_id: number }[];

    const verified = new Set(
      progress.map((p) => String(p.selection_id))
    );

const processedSelections = new Set<string>();


    let messagesChecked = 0;
    let eligibleMatches = 0;
    let alreadyVerified = 0;

let successfulVerifications = 0;
let alreadyVerifiedResults = 0;

    const channelResults: Record<string, unknown> = {};

    for (const [name, channelId] of Object.entries(CHANNELS)) {
      
const messages: DiscordMessage[] = [];
let before: string | undefined;

for (let page = 0; page < 5; page++) {
  const endpoint = new URL(
    `https://discord.com/api/v10/channels/${channelId}/messages`
  );
  endpoint.searchParams.set("limit", "100");
  if (before) endpoint.searchParams.set("before", before);

  const response = await fetch(endpoint.toString(), {
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(15000),
  });

  
if (!response.ok) {
  throw new Error(
    `Discord message scan failed: HTTP ${response.status}`
  );
}


  const batch = await response.json() as DiscordMessage[];
  messages.push(...batch);

  if (batch.length < 100) break;
  before = batch[batch.length - 1].id;
}

messagesChecked += messages.length;


      let matches = 0;

      for (const message of messages) {
        const mission = missionFor(message.channel_id);
        if (!mission || !meaningful(message)) continue;

        const postedAt = Date.parse(message.timestamp);
        if (!Number.isFinite(postedAt)) continue;

        for (const selection of selections) {
          if (
            selection.discord_user_id !== message.author?.id ||
            selection.mission_id !== mission
          ) continue;

          const selectedAt = Date.parse(selection.selected_at);
          const {start: weekStart, end: weekEnd} = easternWeekBounds(selection.week_start);

          if (
            !Number.isFinite(selectedAt) ||
            !Number.isFinite(weekStart) ||
            postedAt < selectedAt ||
            postedAt < weekStart ||
            postedAt >= weekEnd
          ) continue;

          
if (verified.has(String(selection.id))) {
  alreadyVerified++;
} else {
  const evidenceValid = await validateDiscordEvidence(
    botToken,
    message.id,
    message.channel_id,
    selection.discord_user_id,
    selection.selected_at,
    selection.week_start,
    selection.mission_id
  );

  if (!evidenceValid) continue;

const selectionKey = String(selection.id);

if (processedSelections.has(selectionKey)) continue;




if (writesEnabled) {




  const verifyResponse = await fetch(
    `${url}/rest/v1/rpc/auto_verify_discord_mission`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_selection_id: selection.id,
        p_message_id: message.id,
        p_channel_id: message.channel_id,
        p_message_author_id: message.author?.id,
        p_message_time: message.timestamp,
      }),
      signal: AbortSignal.timeout(15000),
    }
  );

if (!verifyResponse.ok) {
  throw new Error("Automatic verification request failed");
}

const verificationResult = await verifyResponse.json();


if (verificationResult === "verified") {
  processedSelections.add(String(selection.id));
  successfulVerifications++;
} else if (verificationResult === "already_verified") {
  processedSelections.add(String(selection.id));
  alreadyVerifiedResults++;
}

if (
  verificationResult !== "verified" &&
  verificationResult !== "already_verified"
) {
  continue;
}
}




if (!writesEnabled) {
  processedSelections.add(String(selection.id));
}

  eligibleMatches++;
  matches++;
}

        }
      }

      channelResults[name] = {
        connected: true,
        messages_checked: messages.length,
        eligible_matches: matches,
      };
    }

    return respond({
      mode: writesEnabled ? "automatic" : "read_only",
      writes_enabled: writesEnabled,
      evidence_test_passed: evidenceTestPassed,
      guild_id: GUILD_ID,
      selections_checked: selections.length,
      messages_checked: messagesChecked,
      eligible_matches: eligibleMatches,
      already_verified_matches: alreadyVerified,
      database_writes: successfulVerifications > 0,
      successful_verifications: successfulVerifications,
already_verified_results: alreadyVerifiedResults,
      automatic_approvals: successfulVerifications > 0,
      discord_role_changes: false,
      channels: channelResults,
    });
  } catch {
    return respond({ error: "Read-only check failed" }, 502);
  }
});

// Den Missions 2.1 — Discord evidence validator
// Development only. Does not verify missions or write to the database.

async function validateDiscordEvidence(
  botToken: string,
  messageId: string,
  channelId: string,
  expectedUserId: string,
  selectedAt: string,
  weekStart: string,
  expectedMission: string
): Promise<boolean> {
  const allowedChannels: Record<string, string[]> = {
    "break-the-ice": ["1546529501859815438"],
    "daily-fun": [
      "1562480265878577233",
      "1561393990392094790"
    ]
  };

  if (!allowedChannels[expectedMission]?.includes(channelId)) {
    return false;
  }

  if (!/^\d{15,22}$/.test(messageId)) return false;

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
    {
      headers: { Authorization: `Bot ${botToken}` },
      signal: AbortSignal.timeout(10000)
    }
  );

  if (!response.ok) return false;

  const message = await response.json();

  if (message.author?.bot) return false;
  if (message.author?.id !== expectedUserId) return false;
  if (message.channel_id !== channelId) return false;

  const content = String(message.content || "").trim();
  if (content.length < 5 || !/\p{L}/u.test(content)) return false;

  const postedAt = Date.parse(message.timestamp);
  const selected = Date.parse(selectedAt);
  const {start, end} = easternWeekBounds(weekStart);

  if (![postedAt, selected, start, end].every(Number.isFinite)) {
    return false;
  }

  return postedAt >= selected &&
    postedAt >= start &&
    postedAt < end;
}

// Development-only evidence test
// No database writes or mission approvals.
async function testDiscordEvidence() {
  const token = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!token) return false;

  return await validateDiscordEvidence(
    token,
    "1572091972217212969",
    "1546529501859815438",
    "1418199180287148073",
    "2026-11-16T00:00:00Z",
    "2026-11-16",
    "break-the-ice"
  );
}
