# Guide for Codex sessions

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

## Project history

This codebase started as a personal portfolio site (Cash App / Make Tangible aesthetic, 3D icons of Hannah's own work) and pivoted into the museum browser. The portfolio direction is preserved in [`_archive/`](_archive/) for context only — it is not the active product. Don't suggest portfolio-themed features.

## Active code map

- `src/App.tsx` — root, collection load + filter state
- `src/components/InfiniteCanvas.tsx` — looped drag-pan canvas
- `src/components/PortfolioItem.tsx` — artwork tile with typographic fallback card
- `src/components/ArtworkDetail.tsx` — full-screen detail view, tags, navigation
- `src/components/CollectionSwitcher.tsx` — *currently deprecated as primary nav per SPEC.md; may be removed or demoted*
- `src/collections/` — pluggable registry. One file per museum implementing `CollectionDefinition` from `types.ts`
- `src/collections/registry.ts` — central list of active collections
- `src/services/` — raw API clients (Art Institute, Cooper Hewitt, Harvard, enrichment)
- `src/data/` — adapters from raw API → `PortfolioItem`
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

- Hannah uses Codex via the **desktop app**, not the terminal CLI. Run shell commands via the Bash tool rather than asking her to copy-paste, unless the command needs her to keep it open (e.g. her own dev server) or needs her input.
- She is a **Creative Director / Visual Brand Designer** by trade — high taste, low patience for AI-template aesthetics. Things she has explicitly flagged she does not want: emoji icons, generic "AI dark-mode dashboard" pill UI, recommendation-engine feel, infinite scroll vibes.
- Brand mark, custom illustration, icon set, and wordmark are *her* work in Figma. The codebase should establish clean neutral foundations for her to layer brand assets onto, not make brand-design decisions for her.
- Deployment target is **Vercel**. Env vars (`VITE_COOPER_HEWITT_API_KEY`, `VITE_HARVARD_KEY`) must be set in Vercel project settings — they don't read from local `.env` in production.
