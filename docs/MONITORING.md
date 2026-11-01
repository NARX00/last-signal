# Monitoring: who's playing

The game can report anonymous play stats to a free Firebase Realtime Database. The monitoring page then shows:

- **Online now**: players with the game open, how many are in a run, how many are in Telegram
- **Today**: players (unique devices), runs started and finished, wins, average run length
- **Last 14 days**: players and runs per day
- **Versions online**: which build people are running, handy right after an update
- **Errors**: script errors from players' devices, with time, device type and version

Page: `https://narx00.github.io/last-signal/monitor.html`. It refreshes itself every 15 seconds.

## What is sent

A random device id made on first launch, the game version, whether a run is in progress, the mode, and whether it's
running in Telegram. At the end of a run: that it finished, its length, and whether it was won. Script errors:
the message, device type (desktop, Android, iOS) and version. **No names, no Telegram account details.**
Players can switch it off in Settings → Anonymous play stats. It's always off in the Claude artifact.

The data in this database is readable by anyone who has its address, like the monitoring page itself; it contains
nothing personal, only the counts and errors above.

## One-time setup (about 10 minutes)

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Create a project, for example `last-signal`. Google Analytics isn't needed; you can turn it off.
3. In the project, open **Build → Realtime Database** and click **Create Database**.
   Pick a location near your players and choose **Start in locked mode**.
4. Open the **Rules** tab, replace everything with the contents of `firebase/database.rules.json`, and click **Publish**.
5. On the **Data** tab, copy the database address shown at the top. It looks like
   `https://last-signal-xxxxx-default-rtdb.firebaseio.com` (some locations use `….firebasedatabase.app`).
6. Put it in `data/telemetry.json`:

       { "database_url": "https://last-signal-xxxxx-default-rtdb.firebaseio.com", "heartbeat_seconds": 30 }

7. Run `python tools/check.py` and `python tools/build.py`, commit and push. The monitoring page starts showing data
   as soon as someone opens the game.

The free plan is far beyond what a family game uses. Each open game sends one small request every 30 seconds.

To check the rules work: in the Firebase console, **Rules → Rules Playground** can simulate a write, e.g. a `set` to
`/presence/dtest123456` with `{"t": 1}` should be allowed, and a write to `/anything` should be denied.

## Turning it off

Set `"database_url": ""` in `data/telemetry.json` and push. The game stops sending immediately for new loads.
