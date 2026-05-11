# Slower. Stranger.

> Most design inspiration online is a firehose. This is the opposite.
> A few unexpected things at a time, pulled from real museum archives.
> The next best thing to walking into a gallery, made for the days you can't.

A slow museum-archive browser. Drag through a small handful of unexpected works pulled from three major public museum APIs — the Art Institute of Chicago, Cooper Hewitt (Smithsonian Design), and Harvard Art Museums. Click any piece for richer detail. Refresh for a new handful.

The thesis (and why this exists at all) lives in [SPEC.md](SPEC.md).

## Running locally

Requires Node 18+. The Art Institute API works without a key; Cooper Hewitt and Harvard need free API keys (see [API_KEYS_SETUP.md](API_KEYS_SETUP.md)).

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

React 19 · TypeScript · Vite · Framer Motion · Tailwind CSS · custom **SeasonMix** typeface · pluggable collection registry in `src/collections/`.

## Structure

```
src/
├── App.tsx                       Root state, collection loading
├── components/
│   ├── InfiniteCanvas.tsx        Looped drag-pan canvas
│   ├── PortfolioItem.tsx         Single artwork tile
│   ├── ArtworkDetail.tsx         Full-screen detail view
│   └── CollectionSwitcher.tsx    Bottom-right pill (TBD: see SPEC.md, deprecated as primary nav)
├── collections/                  One file per museum, registered together
├── services/                     Raw API clients per museum
├── data/                         API → PortfolioItem adapters
├── hooks/                        Drag, grid loop, enrichment
└── utils/tagExtractor.ts         Tag normalisation
```

## Project history

This codebase started as a personal portfolio site and pivoted into the museum browser that became Slower. Stranger. Original context lives in [`_archive/`](_archive/README.md).
