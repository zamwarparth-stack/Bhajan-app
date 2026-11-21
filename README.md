# भजन संगिनी · Bhajan Sangini

The family bhajan book as a web app: 32 bhajans, kirtan and aartis, in Hindi and English, with search, large readable text, and Master Edit (PIN-protected) for adding, editing and deleting bhajans.

## Contents

- `index.html` – the app's start page. The corrected bhajans from the Bhajan Book (revised 23-08-2026) are built into it.
- `shim.js` – runs the app's data requests inside the page, so it works as a plain static site (no server needed).
- `assets/` – the app's code and styles.
- `img/mandala.webp` – the front-page mandala.

## Corrections compared with the earlier Netlify version

- Bhajan 2 (अच्युतम केशवं): the repeated first line was removed.
- Bhajan 23 (बाजरे की रोटी): the extra line in the opening verse was removed.
- Order now matches the book: 27 Kirtan (श्रीमन नारायण), 28 Ram Stuti, 29 Ganapati Aarti 1, 30 Om Jai Jagdish Hare, 31 Ganapati Aarti 2, 32 चोखा कोनी लागसी.

## Hosting

Any static host works (GitHub Pages, Netlify drag-and-drop, etc.). The shared, live version is hosted on Claude:
https://claude.ai/artifact/8soui7hTuWSiVUp5ZL2wFz

Master Edit saves changes only on the Claude-hosted version. On other hosts the app is read-only.
