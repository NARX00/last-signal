# Music

Music files replace the generated soundtrack. The game picks a track by intensity:

- `calm.ogg`: quiet moments
- `action.ogg`: crowds and purge waves
- `boss.ogg`: boss fights
- or a single `theme.ogg` for everything

Missing tracks fall back to the nearest one. OGG or MP3 (M4A and WAV also work), looping cleanly,
around 96–128 kbps and under 3 MB each so phones load them quickly. See `docs/CONTENT.md`.
