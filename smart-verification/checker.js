
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
