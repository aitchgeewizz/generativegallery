# Slower. Stranger.

> Most design inspiration online is a firehose. This is the opposite.
> A few unexpected things at a time, pulled from real museum archives.
> The next best thing to walking into a gallery, made for the days you can't.

A slow museum-archive browser. Drag through a small handful of unexpected works pulled from public museum archives: the Art Institute of Chicago, the V&A, Harvard Art Museums, the Rijksmuseum, the Cleveland Museum of Art and the Library of Congress. Click any piece for richer detail. Refresh for a new handful.

The thesis (and why this exists at all) lives in [SPEC.md](SPEC.md).

## Running locally

Requires Node 18+. The site itself needs no keys. Works are gathered ahead of time into `public/shelf/` by `node scripts/build-shelf.mjs`, which needs a free Harvard key in `.env` (`HARVARD_KEY`) and should be re-run at least every two weeks.

```bash
cp .env.example .env       # fill in your API keys
npm install
npm run dev
```

Dev server at `http://localhost:5173`.

## Deployment

Deploys to Vercel. Push to the production branch and Vercel builds + deploys automatically. **Remember:** set `VITE_COOPER_HEWITT_API_KEY` and `VITE_HARVARD_KEY` in Vercel's project settings — they don't read from `.env` in production.

Domain: **slowerstranger.com** (pending DNS pointing to Vercel).

## Stack

React 19 · TypeScript · Vite · Framer Motion · Tailwind CSS · Google Fonts type system (**Workbench**, **Space Grotesk**, **Space Mono**) · pluggable collection registry in `src/collections/`.

## Structure

```
src/
├── App.tsx                       Root state, collection loading
├── components/
│   ├── InfiniteCanvas.tsx        Looped drag-pan canvas
│   ├── PortfolioItem.tsx         Single artwork tile
│   ├── ArtworkDetail.tsx         Full-screen detail view
│   └── CollectionSwitcher.tsx    Bottom-right pill (TBD: see SPEC.md, deprecated as primary nav)
├── shelf/                        Deals rooms from the pre-built shelf
├── services/                     Wikipedia / Wikidata context for the detail view
├── hooks/                        Drag, grid loop, enrichment
└── utils/tagExtractor.ts         Tag normalisation
```

## Project history

This codebase started as a personal portfolio site and pivoted into the museum browser that became Slower. Stranger. Original context lives in [`_archive/`](_archive/README.md).
