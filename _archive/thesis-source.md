# Thesis source — how the SPEC.md north star was developed

This is a record of the conversation that produced the thesis in [`../SPEC.md`](../SPEC.md). It's preserved here because the iteration is part of how the thesis came to be — what Hannah accepted, what she pushed back on, where the voice landed. Useful if anyone ever wants to revisit the framing.

The canonical product spec lives in `../SPEC.md`. **Do not treat this file as the spec.** It's the working notes.

---

## Hannah's initial prompt

> i am trying to write a spec doc for a project I am currently working on. I think there is a lot of context in past chats here. it's the art museum browser..a project that aims to scratch my own itch about how to find good inspiration. after being in pinterest and other online sites like this all day as a designer looking for inspiration, everything starts to feel the same. I curated a cool layout web browser that pulls in public apis like cooper Hewitt etc that surfaces real craft from past artefacts and designs and art work. the aim is to fill up cup, and create that experience of walking into a gallery or similar seeing something real. craft from the past. doesn't replace the real thing in real life but a good solution. curated collection one at a time rather than just everything all at once but the same designers in todays work...digital, shallow, fads, empty, doom scrolling....can you dig through notion, and my chat history here to see if you can surface some context that will help be write a thesis for this project. it's north star I can put into the spec doc...

## What Claude pulled from context

From prior chats: Hannah had described the project as "trying to recreate that offline experience" of walking into a gallery, "one beautiful thing at a time," pulling from Cooper Hewitt / Cleveland / Art Institute of Chicago. Pinterest had been called out specifically. From a May 2026 chat: *"the job of knowing when to stop is now bigger than the job of making."*

From Notion: a 2024 "$2 store" essay that contained essentially the same thesis in a different medium — *"I find myself caught up in the latest design trends, scrolling endlessly through Pinterest, Dribbble and Behance for my creative spark"* — plus a Frances Ambler quote about elevating the overlooked, and a line about "the sea of AI-generated garbage growing."

The museum browser was framed as the digital equivalent of going to the $2 store: same hunt, different shelf.

## What Hannah pushed back on (round 1)

- *"this doesn't sound like me — 'Honestly, that's half the problem.'"* → Cut.
- Added: real-world examples of inspiration ("walking into a craft beer store and taking in all the designs on the cans"), the catalogue-vs-this critique (museum sites are catalogues built for researchers), and unexpectedness as a stated feature.

## What Hannah pushed back on (round 2)

- *"this is not quite right — 'who just wants to look at something beautiful for ten minutes between meetings.'"* → Cut. The tool can be used for serious research, relaxation, inspiration, anything. Not framed by a time-poor designer.
- Added an "awe" section because the experience is awe — *"like 'wow' when I see a piece of work or a colour or a design that I truely respect."*

## The name

The name "Slower. Stranger." came from Hannah noticing the opening line of the thesis ("Slower. Stranger.") could be the product name. It was — the dots, the pacing, the editorial voice all carry. She's purchased slowerstranger.com.

---

## Hannah's full north-star essay (her final voice, the canonical version)

This is what got promoted into `SPEC.md`. Preserved here so the working version and the spec version can be diffed later if the spec ever drifts.

> The north star
> Most design inspiration online is a firehose. This is the opposite. Slower. Stranger. A few unexpected things at a time, pulled from real museum archives.
> The next best thing to walking into a gallery, made for the days you can't.
>
> Why this exists
> I'm a designer. A lot of my day is spent looking for inspiration online. Pinterest, Behance, Are.na, Dribbble, the saved folder I keep telling myself I'll organise. After a few hours of any of it, everything starts to look the same. The same three designers. The same five aesthetics. The same recycled bits of last year's trend cycle, dressed up slightly different. The platforms have trained my eye to skim and my taste to flatten.
> That's not inspiration. That's noise.
> The best fix is to go look at something real. Walk into a gallery. Wander through a craft beer store and take in the can designs. Pick up an old book at an op shop. Real things, made on purpose, encountered without an algorithm in the way. I know this. I just don't always have the time.
> So this is the next best thing.
> A browser that pulls from public museum APIs (Cooper Hewitt, Cleveland Museum of Art, Art Institute of Chicago, more I'm still adding) and surfaces a handful of pieces straight from the collections. A 1920s Bauhaus poster. A piece of 18th century textile. A book cover from 1958. The kind of stuff that sits in a vault and never shows up in your Pinterest feed because no one's pinning it.
> You could already go to each of those institutions' sites and dig through their catalogues. I have. They are catalogues. Endless scrolling, search boxes, filters, more filters. Built for researchers searching for something specific, not for the kind of looking I'm after.
> This pulls a few of those collections together and throws something at you. Unexpected. You don't know what you're going to get. That's the feature, not a bug. The lack of control is exactly what makes it useful, because you're not just confirming what you already like. You're being shown something you'd never have searched for.
>
> What it feels like to use it
> The experience I'm trying to recreate is awe. The moment in a gallery when you stop in front of something and just go wow. A colour. A composition. A choice someone made 90 years ago that still holds up. Something to respect, something to learn from.
> Some days you'll use it for serious research. Other days to unblock yourself on a brief. Other days just to look at something beautiful and feel something. All of those count. The tool doesn't care which one you're doing.
> If something stops you, click through and read about it. Follow the thread. Find the maker, the year, what else they did. Down the line, save the ones that land. For now, surface, look, move on, come back tomorrow to something completely different.
>
> What this is not
> Not a replacement for going to a real gallery. Nothing replaces that.
> Not a discovery engine for contemporary design work. There's plenty of that already. That's part of what I'm trying to step away from.
> Not infinite. The friction is on purpose.
>
> The bet underneath
> The design world is drowning in generated, derivative, faddish output. The job of the editor, the curator, the person with taste, matters more than it has in years. The same designers keep showing up in everyone's work because everyone's drinking from the same five wells. Going back to the actual source, the actual archive, the actual artefact, is how you get out of that loop.
> This is one small way to do it.
