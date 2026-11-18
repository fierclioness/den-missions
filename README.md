# 👑 Den Missions 2.1 — The Lioness Den

Live member page: https://fierclioness.github.io/den-missions/

Private admin review page: https://fierclioness.github.io/den-missions/admin.html

## Member quick start

1. Sign in with Discord using your Lioness Den account.
2. Choose up to **five** missions for the week. Your choices are saved.
3. Complete your missions in the community or while gaming.
4. **Break the Ice** (#general) and **Daily Fun** (Daily Question or Wordle) may be verified automatically from qualifying Discord participation. Messages must be posted after you choose the mission and during the eligible week. Verification normally runs every five minutes.
5. For other missions, select **Report completed** and wait for an admin to review the report. A submitted report is **not** a verified mission.
6. Check **Verified Royal Achiever progress**. Reach **5 distinct verified missions in the same week** to earn the 👑 Royal Achiever Discord role automatically. Role processing normally runs every five minutes.

**Progress bars:** Completion reports submitted = reports filed (not proof of approval); Verified Royal Achiever progress = approved or bot-verified missions.

**Weekly schedule:** Selections are grouped by Monday-starting weeks. The current website calculates the week using the visitor's local calendar; verify time-zone behavior before an international launch.

## Admin review

Open the private admin page while signed in. Review pending reports against actual evidence. **Approve** only when verified; otherwise **Reject**. Decisions are audited. The database enforces admin-only access; hiding a link is not the security boundary.

## Automation and operations

- Supabase project: **Den Missions 2.0** (production project name retained).
- `smart-verification-dev` checks Discord evidence for Break the Ice and Daily Fun.
- `royal-achiever-awards` assigns the Discord role after five distinct verified missions.
- Both workers run on a five-minute schedule. They use server-side secrets; **never** commit bot tokens, service-role keys, scheduler passwords, or private credentials to GitHub Pages.
- Supabase browser configuration in `config.js` contains a public publishable key only.
- Royal Achiever was integration-tested with a temporary historical-week record; Discord role assignment and removal both succeeded, and test database records were removed.
- Review Supabase function logs and `mission_internal.award_attempts` if awards are delayed.
- If Discord is down or rate-limiting requests, the worker records failures and retries rather than marking a failed assignment as successful.

## Release checklist

- [x] Discord login and weekly mission selections implemented
- [x] Admin review and audit history implemented
- [x] Automatic verification for two missions enabled
- [x] Automatic Royal Achiever achievement creation and Discord role award tested
- [x] Member-facing copy and crown celebration updated
- [ ] Confirm live GitHub Pages deployment and test sign-in on mobile and desktop
- [ ] Confirm week rollover behavior in the desired server timezone
- [ ] Approve and post the Discord launch announcement

## Member launch announcement (draft)

👑 **DEN MISSIONS 2.1 IS HERE!** 🎮

Ready to earn your crown? Choose up to five missions each week, complete them your way, and track your progress! Break the Ice and Daily Fun can verify automatically through eligible Discord activity. For the other missions, submit a completion report for review.

Complete **five verified missions in one week** to earn the 👑 **Royal Achiever** role!

🔗 https://fierclioness.github.io/den-missions/

**Your Squad. Your Vibe. Your Place in the Pride.** 💕
