// Pure Eastern-time mission week boundaries. No database or Discord access.
export function easternMidnightUtc(isoDate) {
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
export function easternWeekBounds(weekStart) {
  const start = easternMidnightUtc(weekStart);
  const next = new Date(Date.parse(weekStart + "T12:00:00Z"));
  next.setUTCDate(next.getUTCDate()+7);
  return {start, end:easternMidnightUtc(next.toISOString().slice(0,10))};
}
export function isEligibleEvidence({postedAt, selectedAt, weekStart}) {
  const {start,end}=easternWeekBounds(weekStart);
  const posted=Date.parse(postedAt), selected=Date.parse(selectedAt);
  return Number.isFinite(posted) && Number.isFinite(selected) && posted >= selected && posted >= start && posted < end;
}
