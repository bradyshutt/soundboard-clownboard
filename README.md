# Clownboard

A phone-first soundboard with sixteen effects, a fixed 3×4 paginated layout, a looping
30-second gallop, and optional live microphone monitoring. Everything runs locally in the browser:
there are no audio downloads, trackers, accounts, or build-time dependencies.

Synthesized effects can overlap. The two spoken phrases share the browser's device-speech channel,
so starting either phrase replaces the one currently speaking.

## Run locally

Serve the repository root from any static HTTP server, then open it in a modern browser. For
example:

```sh
python3 -m http.server 4173
```

Web Audio starts from the first tap. Microphone monitoring requires browser permission and a
secure origin (`https://` or local development); use headphones to avoid acoustic feedback.

## Verify

```sh
npm test
npm run check
```

## Deploy

GitHub Pages serves the repository root from `main`. Run the verification commands before merging;
the Pages branch source automatically republishes the static files after `main` changes.
