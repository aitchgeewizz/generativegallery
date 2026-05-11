# Slower. Stranger. — Spec

> The north star, in Hannah's voice. Everything below it follows from this.

## The north star

Most design inspiration online is a firehose. This is the opposite. Slower. Stranger. A few unexpected things at a time, pulled from real museum archives.

The next best thing to walking into a gallery, made for the days you can't.

## Why this exists

I'm a designer. A lot of my day is spent looking for inspiration online. Pinterest, Behance, Are.na, Dribbble, the saved folder I keep telling myself I'll organise. After a few hours of any of it, everything starts to look the same. The same three designers. The same five aesthetics. The same recycled bits of last year's trend cycle, dressed up slightly different. The platforms have trained my eye to skim and my taste to flatten.

That's not inspiration. That's noise.

The best fix is to go look at something real. Walk into a gallery. Wander through a craft beer store and take in the can designs. Pick up an old book at an op shop. Real things, made on purpose, encountered without an algorithm in the way. I know this. I just don't always have the time.

So this is the next best thing.

A browser that pulls from public museum APIs (Cooper Hewitt, Cleveland Museum of Art, Art Institute of Chicago, more I'm still adding) and surfaces a handful of pieces straight from the collections. A 1920s Bauhaus poster. A piece of 18th century textile. A book cover from 1958. The kind of stuff that sits in a vault and never shows up in your Pinterest feed because no one's pinning it.

You could already go to each of those institutions' sites and dig through their catalogues. I have. They are catalogues. Endless scrolling, search boxes, filters, more filters. Built for researchers searching for something specific, not for the kind of looking I'm after.

This pulls a few of those collections together and throws something at you. Unexpected. You don't know what you're going to get. That's the feature, not a bug. The lack of control is exactly what makes it useful, because you're not just confirming what you already like. You're being shown something you'd never have searched for.

## What it feels like to use it

The experience I'm trying to recreate is awe. The moment in a gallery when you stop in front of something and just go wow. A colour. A composition. A choice someone made 90 years ago that still holds up. Something to respect, something to learn from.

Some days you'll use it for serious research. Other days to unblock yourself on a brief. Other days just to look at something beautiful and feel something. All of those count. The tool doesn't care which one you're doing.

If something stops you, click through and read about it. Follow the thread. Find the maker, the year, what else they did. Down the line, save the ones that land. For now, surface, look, move on, come back tomorrow to something completely different.

## What this is not

- Not a replacement for going to a real gallery. Nothing replaces that.
- Not a discovery engine for contemporary design work. There's plenty of that already. That's part of what I'm trying to step away from.
- Not infinite. The friction is on purpose.

## The bet underneath

The design world is drowning in generated, derivative, faddish output. The job of the editor, the curator, the person with taste, matters more than it has in years. The same designers keep showing up in everyone's work because everyone's drinking from the same five wells. Going back to the actual source, the actual archive, the actual artefact, is how you get out of that loop.

This is one small way to do it.

---

# Operational notes

*The thesis above is the north star. The notes below are how it maps to the product right now. If a decision below ever contradicts the thesis, the thesis wins.*

## Brand

- **Name:** Slower. Stranger. *(spoken and on the wordmark — with full stops, with pacing. The dots are the voice.)*
- **URL slug:** slowerstranger *(no dots, for domains and handles)*
- **Domain:** slowerstranger.com *(purchased)*

## Design implications of the thesis (load-bearing)

These follow directly from the north star and shouldn't be violated without a deliberate revisit of the thesis:

1. **A handful, not a flood.** Target 8–12 visible artworks per "set." A refresh gives a new set. We never paginate-on-scroll new content.
2. **Unified, not siloed.** Works from all sources are blended in the visible set. There is no collection-picker as primary navigation. Source attribution belongs in the detail view, where it informs without gating.
3. **The canvas can loop spatially** so the same handful comes back around as you drag — like walking through a small gallery room twice. This is *not* infinite content. It is finite content arranged for spatial exploration.
4. **No algorithmic "more like this."** Lateral browsing is permitted but only in catalogue-style threads: more by this maker, more from this year, more from this period. Not "broadly similar things."
5. **No emojis.** Anywhere. Custom SVG icons or typography only.
6. **Awe is the design target.** When choosing between two options, pick the one that creates a "stop and look" moment over the one that creates engagement metrics.

## What's in scope (now, v1, ship today)

- ✅ Drag-to-pan canvas with momentum, looped 3×3 tiling so a small set wraps around
- ✅ A handful of works (target ~12) blended from three museum APIs: Art Institute of Chicago, Cooper Hewitt / Smithsonian Design, Harvard Art Museums
- ✅ Full-screen detail view with rich metadata, arrow-key navigation, click-through to the source institution
- ✅ Click an artwork's maker or year to surface more from that thread
- ✅ Refresh to get a new set
- ✅ Custom SeasonMix typeface (transitional editorial, six weights)
- ✅ Subtle gallery grain overlay
- ✅ Brand identity laid in: name, page title, OG meta, README, repo metadata
- ✅ Vercel deploy config

## What's out of scope (deferred or rejected)

**Deferred for a later version:**
- Saving favourites
- More museum/archive APIs (V&A, Rijksmuseum, Cleveland, Library of Congress)
- Per-source filters for power users (would need to feel non-Pinterest)
- Mobile-optimised detail view
- Onboarding moment / about page
- Custom icon set, wordmark, brand mark *(Hannah's CD work, handled separately in Figma)*

**Out of scope by thesis (intentionally not building):**
- Infinite scroll / pagination of new content
- Algorithmic "more like this" recommendations
- Subject / medium / theme tag clouds that act as a discovery engine
- Personalisation, preference learning, taste profiles
- A grid-view alternative to the canvas
- Anything that increases throughput at the expense of friction
- Album Covers as a collection *(cut for v1 — the source wasn't producing the curated rarity the thesis demands)*

## Success criteria — v1

The version that ships today succeeds if:

1. The site loads on Vercel under slowerstranger.com (or a Vercel subdomain pending DNS)
2. A visitor sees a handful of unexpected, high-quality artworks within ~2s
3. Drag and refresh feel pleasing; the canvas feels finite-but-explorable, not infinite
4. Clicking through to a detail view is rewarding (image, maker, year, source, "more by this maker")
5. The OG preview on LinkedIn shows a real image and the thesis hook
6. Nothing on the page reads as "AI-coded template" (no emojis, no generic pill UI, no boilerplate copy)
7. A first-time visitor understands the *vibe* without needing an explainer page

## Active stack

- **React 19 + TypeScript + Vite**
- **Framer Motion** for drag and motion
- **Tailwind CSS** for utility styling
- **SeasonMix** custom typeface, served from `/public/font/`
- **Pluggable collections registry** in `src/collections/` — each museum is a self-contained adapter implementing a shared `CollectionDefinition` interface
- **APIs:** Art Institute (no key), Cooper Hewitt (`VITE_COOPER_HEWITT_API_KEY`), Harvard (`VITE_HARVARD_KEY`)

## Project history

This project started as a personal portfolio site (Cash App / Make Tangible aesthetic, infinite canvas of 3D icons of Hannah's own work). That direction is preserved in [`_archive/`](_archive/README.md) for reference but is no longer the product.

The north star above was developed in a conversation that drew on related notes (a 2024 "$2 store" essay), prior chat history about the project, and several rounds of editing in Hannah's voice. That source conversation is preserved in [`_archive/thesis-source.md`](_archive/thesis-source.md) — useful only as a record of how this thesis came to be.
