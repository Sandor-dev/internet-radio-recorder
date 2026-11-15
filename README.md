<p align="center">
  <img src="static/favicon.svg" width="80" height="80" alt="Internet Radio Recorder logo">
</p>

<h1 align="center">Internet Radio Recorder</h1>

<p align="center">
  <strong>Schedule it. Record it. Keep it.</strong><br>
  Self-hosted Internet radio recording for your NAS or home server.<br>
  <em>Multilingual fork</em>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="#multilingual">Multilingual</a> ·
  <a href="#screenshots">Screenshots</a>
</p>

## Special Thanks

This is a multilingual fork of the original **[Internet Radio Recorder](https://github.com/sp7uto/internet-radio-recorder)** by **[sp7uto](https://github.com/sp7uto)**.  
Thank you for the solid core — the recording engine, scheduling, Docker setup, and web UI made this extension possible.

## Multilingual Support

The web interface supports multiple languages via JSON locale files in `static/locales/`:

| Language | Code | Notes |
|----------|------|-------|
| English  | `en` | Default |
| Hungarian| `hu` | Full translation |
| Latin    | `la` | Fun edition |
| Polish   | `po` | Original language |

Switch languages from the dropdown in the top-right corner. The choice is saved in `localStorage`.

To add a new language, copy `static/locales/en.json` and translate the values.

---

## Why Internet Radio Recorder?

Choose programmes, set a weekly schedule, and let IRR record them to your own storage. Manage everything in a browser — without maintaining individual cron jobs or deploying a full broadcast automation stack. Designed for Docker-based home servers and NAS installations.

## Features

| Area | What you get |
| --- | --- |
| **Recording** | Multiple Internet radio stations; MP3/AAC selection via FFprobe; stream copy without transcoding; one file per programme; manual REC / STOP |
| **Scheduling** | Weekly timetables, programme titles, pre/post margins, midnight-crossing schedules |
| **Web dashboard** | Today, Calendar, History, Stream Status, Recording Library, Statistics |
| **Multilingual** | English, Hungarian, Latin, Polish (extensible) |
| **Storage** | Per-station retention and storage limits; backup / import / restore |
| **Deployment** | Docker Compose, Synology/Portainer ready |

## Quick Start (this fork)

```bash
git clone -b feature/i18n https://github.com/Sandor-dev/internet-radio-recorder.git
cd internet-radio-recorder
# Adjust docker-compose.yml volumes and port if needed
docker compose up -d --build
```

Open `http://<your-host>:6678` (or the port you set).

## Screenshots

English UI (language dropdown in the top right):

![English interface](docs/screenshot-en.png)

---

*Original project documentation and features remain available in the [upstream repository](https://github.com/sp7uto/internet-radio-recorder).*
