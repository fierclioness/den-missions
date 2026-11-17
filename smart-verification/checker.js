
/**
 * Den Missions 2.1 — Read-only activity checker
 * Development only. Does not approve missions.
 */

const CHANNELS = {
  general: "1546529501859815438",
  dailyQuestion: "1562480265878577233",
  wordle: "1561393990392094790"
};

function meaningfulMessage(message) {
  if (!message || message.author?.bot) return false;

  const content = (message.content || "").trim();

  if (content.length < 5) return false;

  // Require some readable text, not just emoji.
  return /\p{L}/u.test(content);
}

function checkBreakTheIce(message) {
  return (
    message.channel_id === CHANNELS.general &&
    meaningfulMessage(message)
  );
}

function checkDailyFun(message) {
  return (
    [
      CHANNELS.dailyQuestion,
      CHANNELS.wordle
    ].includes(message.channel_id) &&
    meaningfulMessage(message)
  );
}

function evaluateMessage(message) {
  return {
    discord_user_id: message.author?.id || null,
    message_id: message.id || null,
    break_the_ice: checkBreakTheIce(message),
    daily_fun: checkDailyFun(message)
  };
}

// Test-only exports. No Discord or database connections.
if (typeof module !== "undefined") {
  module.exports = {
    evaluateMessage,
    meaningfulMessage
  };
}

function matchSelectedMission(message, selection) {
  if (!message || !selection) return null;

  if (message.author?.id !== selection.discord_user_id) {
    return null;
  }

  const selectedAt = Date.parse(selection.selected_at);
  const postedAt = Date.parse(message.timestamp);

  if (
    !Number.isFinite(selectedAt) ||
    !Number.isFinite(postedAt) ||
    postedAt < selectedAt
  ) {
    return null;
  }

  const result = evaluateMessage(message);

  if (
    selection.mission_id === "break-the-ice" &&
    result.break_the_ice
  ) {
    return "break-the-ice";
  }

  if (
    selection.mission_id === "daily-fun" &&
    result.daily_fun
  ) {
    return "daily-fun";
  }

  return null;
}

if (typeof module !== "undefined") {
  module.exports.matchSelectedMission = matchSelectedMission;
}

function matchUnverifiedMission(message, selection, progress) {
  // Never match a mission that's already verified.
  if (progress?.selection_id === selection?.id) {
    return null;
  }

  return matchSelectedMission(message, selection);
}

if (typeof module !== "undefined") {
  module.exports.matchUnverifiedMission = matchUnverifiedMission;
}
