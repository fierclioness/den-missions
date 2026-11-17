
const { evaluateMessage } = require("./checker.js");

const tests = [
  {
    name: "Break the Ice — valid",
    message: {
      id: "1",
      channel_id: "1546529501859815438",
      author: { id: "123", bot: false },
      content: "Hey everyone!"
    },
    expected: [true, false]
  },
  {
    name: "Break the Ice — emoji only",
    message: {
      id: "2",
      channel_id: "1546529501859815438",
      author: { id: "123", bot: false },
      content: "🔥🔥🔥"
    },
    expected: [false, false]
  },
  {
    name: "Daily Fun — valid",
    message: {
      id: "3",
      channel_id: "1562480265878577233",
      author: { id: "123", bot: false },
      content: "My favorite movie is..."
    },
    expected: [false, true]
  },
  {
    name: "Bot message — ignored",
    message: {
      id: "4",
      channel_id: "1546529501859815438",
      author: { id: "999", bot: true },
      content: "Hello everyone!"
    },
    expected: [false, false]
  }
];

for (const test of tests) {
  const result = evaluateMessage(test.message);
  const actual = [result.break_the_ice, result.daily_fun];

  if (JSON.stringify(actual) !== JSON.stringify(test.expected)) {
    throw new Error(`FAILED: ${test.name}`);
  }

  console.log(`PASS: ${test.name}`);
}

console.log("All Smart Verification tests passed.");
