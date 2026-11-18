import assert from "node:assert/strict";
import {easternWeekBounds, isEligibleEvidence} from "./eastern-week.mjs";
for (const [week, start, end, hours] of [
  ["2026-11-16","2026-11-16T05:00:00.000Z","2026-11-23T05:00:00.000Z",168],
  ["2027-03-08","2027-03-08T05:00:00.000Z","2027-03-15T04:00:00.000Z",167],
  ["2027-07-05","2027-07-05T04:00:00.000Z","2027-07-12T04:00:00.000Z",168],
  ["2027-11-01","2027-11-01T04:00:00.000Z","2027-11-08T05:00:00.000Z",169]
]) {
  const bounds=easternWeekBounds(week);
  assert.equal(new Date(bounds.start).toISOString(),start);
  assert.equal(new Date(bounds.end).toISOString(),end);
  assert.equal((bounds.end-bounds.start)/3600000,hours);
  const selectedAt=new Date(bounds.start).toISOString();
  assert.equal(isEligibleEvidence({postedAt:selectedAt,selectedAt,weekStart:week}),true);
  assert.equal(isEligibleEvidence({postedAt:new Date(bounds.end-1).toISOString(),selectedAt,weekStart:week}),true);
  assert.equal(isEligibleEvidence({postedAt:new Date(bounds.end).toISOString(),selectedAt,weekStart:week}),false);
  assert.equal(isEligibleEvidence({postedAt:new Date(bounds.start-1).toISOString(),selectedAt,weekStart:week}),false);
  assert.equal(isEligibleEvidence({postedAt:selectedAt,selectedAt:new Date(bounds.start+1).toISOString(),weekStart:week}),false);
}
assert.throws(()=>easternWeekBounds("2027-02-30"));
console.log("Eastern week boundary tests passed");
