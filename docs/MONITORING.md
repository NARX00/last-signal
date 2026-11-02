# Monitoring and leaderboard

The same free Firebase Realtime Database powers two things: the live monitoring page and the shared leaderboard.

## Monitoring: who's playing

The game can report anonymous play stats to a free Firebase Realtime Database. The monitoring page then shows:

- **Online now**: players with the game open, how many are in a run, how many are in Telegram
- **Today**: players (unique devices), runs started and finished, wins, average run length
- **Last 14 days**: players and runs per day
- **Versions online**: which build people are running, handy right after an update
- **Errors**: script errors from players' devices, with time, device type and version

Page: `https://narx00.github.io/last-signal/monitor.html`. It refreshes itself every 15 seconds.

### What is sent for monitoring

A random device id made on first launch, the game version, whether a run is in progress, the mode, and whether it's
running in Telegram. At the end of a run: that it finished, its length, and whether it was won. Script errors:
the message, device type (desktop, Android, iOS) and version. **No names, no Telegram account details.**
Players can switch it off in Settings → Anonymous play stats. It's always off in the Claude artifact.

The data in this database is readable by anyone who has its address, like the monitoring page itself; it contains
nothing personal, only the counts and errors above.

## Leaderboard

Everyone playing on GitHub Pages or in Telegram shares two boards on the title screen:

- **Leaderboard**: each player's best Full-mode run (Protocol first, then time survived, then kills), top 10
- **Daily challenge**: today's best daily runs, top 5

Each entry shows the player's name, time, kills, Protocol and the top lines of their code program.
The name is "Player XXXX" until the player sets their own in
**Settings → Leaderboard name**. **Settings → Show me on the leaderboard** turns it off and removes the player's entries.
Leaderboard names are visible to anyone who opens the game. The Claude version keeps its own separate board.

## One-time setup (about 10 minutes)

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Create a project, for example `last-signal`. Google Analytics isn't needed; you can turn it off.
3. In the project, open **Build → Realtime Database** and click **Create Database**.
   Pick a location near your players and choose **Start in locked mode**.
4. Open the **Rules** tab, replace everything with the contents of `firebase/database.rules.json`, and click **Publish**.
   Do this again whenever that file changes (it gained the `scores` and `daily` sections for the leaderboard).
5. On the **Data** tab, copy the database address shown at the top. It looks like
   `https://last-signal-xxxxx-default-rtdb.firebaseio.com` (some locations use `….firebasedatabase.app`).
6. Put it in `data/telemetry.json`:

       { "database_url": "https://last-signal-xxxxx-default-rtdb.firebaseio.com", "heartbeat_seconds": 30 }

7. Run `python tools/check.py` and `python tools/build.py`, commit and push. The monitoring page starts showing data
   as soon as someone opens the game.
8. Sign-in (strongly recommended, see "Security" below): **Build → Authentication → Get started → Sign-in method →
   Anonymous → Enable**. Then **Project settings → General → Web API Key**, and add it to `data/telemetry.json` as
   `"api_key": "AIza…"`. Push, wait for the site to update, and only then publish `firebase/database.rules.json`
   (those rules require sign-in, so publishing them before the game signs in would stop all writes).

The free plan is far beyond what a family game uses. Each open game sends one small request every 30 seconds.

To check the rules work: in the Firebase console, **Rules → Rules Playground** can simulate a write. With
**Authenticated** on and provider **Anonymous**, copy the UID it shows, then a `set` to `/presence/<that UID>` with
`{"t": 1}` should be allowed, the same `set` to `/presence/someoneelse123` denied, and a write to `/anything` denied.

## Security

- **Who can write what.** With sign-in on, every device signs in anonymously (no account, no personal data) and the
  rules let it write only its own entries: its leaderboard rows, its presence and its device mark. Nobody can change
  or delete another player's row. Counters can only go up by one per write (play time by at most 20 minutes), and
  error reports must come from a signed-in device and carry its id.
- **Scores must add up.** A score has to equal Protocol × 10⁹ + seconds × 10⁴ + kills (kills counted up to 9,999),
  with at most 60 kills a second. This stops impossible entries; it can't stop someone who edits the game itself,
  because there is no game server to replay runs. For a family board that is a fair trade.
- **Everything here is public to read.** Presence, counts, error messages and the boards. No names except the
  leaderboard name a player chose.
- **The API key is not a secret.** Firebase web keys identify the project; the rules are what protect the data.
  To be tidy, restrict it in Google Cloud Console → APIs & Services → Credentials → the key → *Website restrictions*:
  `https://narx00.github.io/*`.
- **Billing.** On the free Spark plan, abuse can at worst use up the free quota (the board and monitor stop until the
  next day or month); it can't create a bill. On the Blaze plan, set a budget alert.
- **The pages** carry a Content-Security-Policy: scripts only from the page itself (by hash) and Telegram,
  network only to this database and Google's sign-in service.

## Turning it off

Set `"database_url": ""` in `data/telemetry.json` and push. The game stops sending immediately for new loads.
