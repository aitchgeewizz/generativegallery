# Guide for Claude sessions

**This project is "Slower. Stranger." — a slow museum-archive browser.**

Domain: **slowerstranger.com**. The product spec is [`SPEC.md`](SPEC.md). Read it before suggesting anything substantive — the thesis is load-bearing and the design implications follow from it.

## TL;DR of the thesis

Most design inspiration online is a firehose. This is the opposite. A few unexpected things at a time, pulled from real museum archives. *Not infinite. Not algorithmic. The friction is on purpose.* "The next best thing to walking into a gallery, made for the days you can't."

## Load-bearing constraints — do not violate

These follow from the thesis. Violating them undermines the product:

1. **A handful, not a flood.** Target ~12 visible artworks. A refresh = a new set. Never paginate-on-scroll new content.
2. **Unified, not siloed.** Works from all sources blended in one set. No collection-picker as primary nav. Source attribution belongs in the detail view.
3. **Canvas may loop spatially** so the same handful wraps around as you drag (like circling a small gallery room). This is not infinite content; it is finite content arranged for spatial pleasure.
4. **No algorithmic "more like this."** Lateral browsing only via specific catalogue threads: more by this maker, from this year, from this period. Not via subject/medium tag clouds.
5. **No emojis. Anywhere.** Custom SVG icons or typography only. Emojis read as AI-template chrome.
6. **Awe is the design target.** Choose the option that creates a "stop and look" moment over the option that creates engagement metrics.

## The shelf — do not go back to live calls

Until November 2026 the page asked each museum for works from the visitor's browser on every visit. One refusing museum blanked a lens, the Harvard key sat in the page with a 2,500-a-day limit, and Cooper Hewitt's service had died. Now `scripts/build-shelf.mjs` gathers a shelf ahead of time and the page deals handfuls from it. Pictures still load from the museums' own image servers.

- Run `node scripts/build-shelf.mjs` to rebuild. It paces itself per museum and takes about 15 minutes cold. It refuses to overwrite a good shelf with a thin one.
- The shelf is stored museum data. Harvard's terms allow two weeks, the V&A's four. **Rebuild at least every two weeks.** `public/shelf/manifest.json` records `builtAt` and `refreshBy`.
- V&A and Harvard pictures are linked, never copied. V&A images stay at 768px or less and the V&A stays under a quarter of the whole shelf (the script checks). Art Institute in-copyright works stay at 843px.
- The Harvard key lives in `.env` as `HARVARD_KEY` (the old `VITE_HARVARD_KEY` name is still read) and is used only by the script.
- Design leads with graphic design: Art Institute graphic design and V&A posters by named designers (`VAM_DESIGNERS` in the script), seasoned with Rijksmuseum and WPA posters and Harvard's Bauhaus papers. The per-room mix is `RECIPES` in `src/shelf/index.ts`.
- Cooper Hewitt is gone: its open data holds no modern graphic design. Do not re-add it.

## Project history

This codebase started as a personal portfolio site (Cash App / Make Tangible aesthetic, 3D icons of Hannah's own work) and pivoted into the museum browser. The portfolio direction is preserved in [`_archive/`](_archive/) for context only — it is not the active product. Don't suggest portfolio-themed features.

## Active code map

- `src/App.tsx` — root, collection load + filter state
- `src/components/InfiniteCanvas.tsx` — looped drag-pan canvas
- `src/components/PortfolioItem.tsx` — artwork tile with typographic fallback card
- `src/components/ArtworkDetail.tsx` — full-screen detail view, tags, navigation
- `src/components/CollectionSwitcher.tsx` — *currently deprecated as primary nav per SPEC.md; may be removed or demoted*
- `scripts/build-shelf.mjs` — gathers works from the museums ahead of time into `public/shelf/{design,art,photo}.json`. The only code that talks to museum data services
- `src/shelf/index.ts` — deals a room from the shelf, follows catalogue threads, finds other works by a maker
- `src/services/enrichmentApi.ts` — Wikipedia / Wikidata context for the detail view (no keys)
- `src/hooks/useSmoothDrag.ts`, `useInfiniteGrid.ts`, `useEnrichment.ts`
- `src/utils/tagExtractor.ts` — tag normalisation
- `src/index.css` — fonts, gallery grain overlay, scrollbar
- `public/font/` — SeasonMix custom typeface (six weights/styles)

## Branch hygiene

- `main` — early portfolio-era code with dead Three.js stuff
- `museum-upgrade-ux-polish` — Hannah's substantial overhaul (the source of the current state)
- New branches with the Slower. Stranger. rebrand and v1 ship work land on top of `museum-upgrade-ux-polish`

## Stack

React 19 · TypeScript · Vite · Framer Motion · Tailwind CSS. No Three.js (removed). Custom font: **SeasonMix** (six weights, served locally from `/public/font/`).

## Working style with Hannah

- Hannah uses Claude Code via the **desktop app**, not the terminal CLI. Run shell commands via the Bash tool rather than asking her to copy-paste, unless the command needs her to keep it open (e.g. her own dev server) or needs her input.
- She is a **Creative Director / Visual Brand Designer** by trade — high taste, low patience for AI-template aesthetics. Things she has explicitly flagged she does not want: emoji icons, generic "AI dark-mode dashboard" pill UI, recommendation-engine feel, infinite scroll vibes.
- Brand mark, custom illustration, icon set, and wordmark are *her* work in Figma. The codebase should establish clean neutral foundations for her to layer brand assets onto, not make brand-design decisions for her.
- Deployment target is **Vercel**. The site needs no environment variables: the page holds no keys.
