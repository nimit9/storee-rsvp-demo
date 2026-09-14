# Storee RSVP demo

A public, static demo of a WhatsApp-style wedding RSVP chat and guest-list dashboard for Storee. It uses fictional event details and in-memory sample RSVP data only; changes reset when the dashboard reloads.

## Run locally

```bash
npm install
npm run dev
```

The RSVP chat is at `/` and the dashboard is at `/dashboard`.

## Build

```bash
npm run build
npm run preview
```

Vite copies the chat files from `static/` to the build root and builds the React dashboard as `dashboard.html`. `vercel.json` enables clean URLs, so `/dashboard` serves the dashboard.

## Demo invite paths

| Path | Events shown |
| --- | --- |
| `/demo` | All events |
| `/sangeet-demo` | Sangeet through reception |
| `/wedding-demo` | Wedding and reception |
| `/reception-demo` | Reception |

This project has no backend or API: RSVP submissions are simulated locally in the chat, and dashboard edits exist only in browser memory.
