#!/usr/bin/env node
/**
 * Shelf builder for Slower. Stranger.
 *
 * The site used to ask every museum for works from the visitor's browser
 * on every visit. One slow or refusing museum blanked a lens. This script
 * does the asking ahead of time, once, from this machine (or a scheduled
 * job), and writes a small shelf per lens into public/shelf/. The site then
 * deals handfuls from the shelf and only loads pictures from the museums'
 * own image servers.
 *
 *   node scripts/build-shelf.mjs            build all three shelves
 *   node scripts/build-shelf.mjs --fresh    ignore the local response cache
 *
 * House rules, from each museum's own terms (read 23 Nov 2026):
 *
 *   V&A       link their image URLs, never copy; images at most 768px;
 *             stored data no older than four weeks; about one request a
 *             second; V&A no more than a quarter of the project.
 *   Harvard   link their image URLs, never copy; stored data no older
 *             than two weeks; link back; non-commercial; 2,500 calls a day.
 *   Art Inst. prefers hotlinking; 843px for in-copyright works; asks for
 *             an AIC-User-Agent header naming the project.
 *   Rijks     only works carrying a Public Domain / CC0 notice.
 *   Cleveland CC0 works only.
 *   WPA       Library of Congress posters, "no known restrictions".
 *
 * So: re-run this at least every two weeks. Weekly is the intent.
 * The Harvard key is read from .env here and never reaches the page.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = process.env.SHELF_OUT ? path.resolve(process.env.SHELF_OUT) : path.join(ROOT, 'public', 'shelf');
const CACHE_DIR = path.join(ROOT, '.cache', 'shelf');
const FRESH = process.argv.includes('--fresh');
const CACHE_TTL_MS = 5 * 24 * 60 * 60 * 1000;

const PROJECT_UA = 'slowerstranger.com shelf builder (https://slowerstranger.com)';

/* ───────────────────────── plumbing ───────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readEnv = () => {
  const env = { ...process.env };
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2];
    }
  }
  return env;
};
const ENV = readEnv();
const HARVARD_KEY = ENV.HARVARD_KEY || ENV.VITE_HARVARD_KEY || '';

/** One polite queue per host, so no museum sees a burst. */
const lastCall = new Map();
const HOST_GAP_MS = {
  'api.vam.ac.uk': 1100,
  'api.artic.edu': 1100,
  'api.harvardartmuseums.org': 400,
  'data.rijksmuseum.nl': 250,
  'id.rijksmuseum.nl': 250,
  'openaccess-api.clevelandart.org': 400,
  'commons.wikimedia.org': 500,
};
const waitTurn = async (host) => {
  const gap = HOST_GAP_MS[host] ?? 500;
  const prev = lastCall.get(host) ?? Promise.resolve(0);
  const mine = prev.then(async (t) => {
    const wait = Math.max(0, t + gap - Date.now());
    if (wait) await sleep(wait);
    return Date.now();
  });
  lastCall.set(host, mine);
  await mine;
};

let calls = {};
const getJSON = async (url, headers = {}) => {
  const host = new URL(url).host;
  // Cache key hashes the URL so a key in a query string never lands on disk.
  const file = path.join(CACHE_DIR, crypto.createHash('sha1').update(url).digest('hex') + '.json');
  if (!FRESH && fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_TTL_MS) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    await waitTurn(host);
    calls[host] = (calls[host] || 0) + 1;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': PROJECT_UA,
          'AIC-User-Agent': PROJECT_UA,
          ...headers,
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2500 * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data));
      return data;
    } catch (err) {
      if (attempt === 3) throw new Error(`${host}: ${err.message}`);
      await sleep(1500 * attempt);
    }
  }
  throw new Error(`${host}: gave up`);
};

const stripTags = (s) =>
  typeof s === 'string'
    ? s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
    : undefined;
const clip = (s, n = 900) => (s && s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s || undefined);
const yearOf = (...candidates) => {
  for (const c of candidates) {
    if (typeof c === 'number' && c > 1000 && c < 2100) return c;
    const m = String(c ?? '').match(/\b(1[4-9]\d\d|20[0-2]\d)\b/);
    if (m) return Number(m[1]);
  }
  return undefined;
};
const makerKey = (name) =>
  (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const isNamed = (name) => !!name && !/unknown|unidentified|anonymous|not known|various/i.test(name);

/**
 * The week number salts every shuffle, so each weekly rebuild picks a
 * different selection from the same pools, while two builds in the
 * same week agree. SHELF_WEEK overrides it (to rebuild a past week).
 */
const WEEK = Number(process.env.SHELF_WEEK) || Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

/** Shuffle seeded by `seed` and the week. */
const seeded = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const shuffled = (arr, seed = 1) => {
  const rand = seeded(seed + WEEK * 7919);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
/** At most `max` per maker; unnamed makers are capped as one loose group. */
const capPerMaker = (items, max, unnamedMax = Infinity) => {
  const seen = new Map();
  let unnamed = 0;
  return items.filter((it) => {
    const k = makerKey(it.maker);
    if (!k) return unnamed++ < unnamedMax;
    const n = seen.get(k) ?? 0;
    if (n >= max) return false;
    seen.set(k, n + 1);
    return true;
  });
};
const dedupe = (items) => [...new Map(items.map((i) => [i.uid, i])).values()];
/** At most `max` works sharing a title: archives hold many prints and views of one thing. */
const capPerTitle = (items, max = 1) => {
  const seen = new Map();
  return items.filter((it) => {
    const k = (it.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
    const n = seen.get(k) ?? 0;
    if (n >= max) return false;
    seen.set(k, n + 1);
    return true;
  });
};

/**
 * Works that should not hang on a public wall without context: wartime
 * race caricature and slurs. A human pass still follows every build.
 */
const UNFIT = /\bjaps?\b|\bnips?\b|death.?trap|\bhuns?\b|negro|darkie|coon\b|savage|venereal|syphilis|gonorrh/i;

/* ───────────────────── Art Institute of Chicago ───────────────────── */

const AIC_FIELDS = [
  'id', 'title', 'artist_display', 'artist_title', 'date_display', 'date_start', 'image_id',
  'is_public_domain', 'classification_titles', 'department_title', 'thumbnail', 'medium_display',
  'dimensions', 'credit_line', 'short_description', 'style_titles', 'place_of_origin',
  'is_boosted', 'has_not_been_viewed_much',
].join(',');
const aicImg = (id, size) => `https://www.artic.edu/iiif/2/${id}/full/${size},/0/default.jpg`;
const term = (field, value) => ({ term: { [field]: value } });

const aicSearch = async (must, { maxPages = 10, extra = {} } = {}) => {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const params = { query: { bool: { must: [...must, { exists: { field: 'image_id' } }] } }, ...extra };
    const qs = new URLSearchParams({ params: JSON.stringify(params), limit: '100', page: String(page), fields: AIC_FIELDS });
    const d = await getJSON(`https://api.artic.edu/api/v1/artworks/search?${qs}`);
    out.push(...(d.data || []));
    if (page >= (d.pagination?.total_pages ?? 1)) break;
  }
  return out;
};

const aicItem = (a, src) => {
  const pd = !!a.is_public_domain;
  const maker = a.artist_title && isNamed(a.artist_title) ? a.artist_title : undefined;
  return {
    uid: `aic:${a.id}`,
    src,
    maker,
    year: yearOf(a.date_start, a.date_display),
    title: a.title,
    description: a.artist_display || maker || undefined,
    // In-copyright works never ask for more than 843px (AIC's own ceiling).
    imageUrl: aicImg(a.image_id, pd ? 1686 : 843),
    thumbnailUrl: aicImg(a.image_id, 400),
    fallbackUrl: aicImg(a.image_id, 843),
    lqip: a.thumbnail?.lqip,
    imageWidth: a.thumbnail?.width,
    imageHeight: a.thumbnail?.height,
    collectionSource: 'Art Institute of Chicago',
    url: `https://www.artic.edu/artworks/${a.id}`,
    date: a.date_display,
    shortDescription: clip(stripTags(a.short_description)),
    medium: a.medium_display || undefined,
    dimensions: a.dimensions || undefined,
    creditLine: a.credit_line || undefined,
    styleTitles: a.style_titles?.length ? a.style_titles.slice(0, 3) : undefined,
    classificationTitles: a.classification_titles?.length ? a.classification_titles.slice(0, 3) : undefined,
    culture: a.place_of_origin || undefined,
    copyrightStatus: pd ? 'public_domain' : 'in_copyright',
  };
};
const aicUsable = (a) => typeof a.image_id === 'string' && a.image_id.length >= 8 && !!a.title && !UNFIT.test(a.title);

const aicDesign = async () => {
  const graphic = (await aicSearch([term('classification_titles.keyword', 'graphic design')])).filter(aicUsable);
  const posters = (await aicSearch([term('classification_titles.keyword', 'poster')])).filter(aicUsable);
  const books = (
    await aicSearch([term('classification_titles.keyword', 'book'), term('department_title.keyword', 'Architecture and Design')], { maxPages: 3 })
  ).filter(aicUsable);

  // The poster holdings are one third wartime TASS windows. A few belong
  // on the wall; three hundred would turn Design into a propaganda room.
  const isTass = (a) => /russia|soviet/i.test(a.place_of_origin || '') && a.date_start >= 1941 && a.date_start <= 1945;
  const tass = shuffled(posters.filter(isTass), 7).slice(0, 14);
  const otherPosters = posters.filter((a) => !isTass(a));

  const g = capPerMaker(shuffled(graphic, 3).map((a) => aicItem(a, 'aic')), 10, 60);
  const p = capPerMaker(shuffled([...otherPosters, ...tass], 5).map((a) => aicItem(a, 'aic')), 6, 40);
  const b = capPerMaker(shuffled(books, 9).map((a) => aicItem(a, 'aic')), 3, 10).slice(0, 60);
  console.log(`  AIC design: ${graphic.length} graphic design → ${g.length}, ${posters.length} posters → ${p.length}, ${books.length} design books → ${b.length}`);
  return dedupe([...g, ...p, ...b]);
};

const aicArt = async () => {
  const pd = term('is_public_domain', true);
  const paintings = (await aicSearch([term('classification_titles.keyword', 'painting'), pd])).filter(aicUsable);
  const boosted = paintings.filter((a) => a.is_boosted);
  const looked = paintings.filter((a) => !a.is_boosted && a.has_not_been_viewed_much === false);
  const woodblock = (await aicSearch([term('classification_titles.keyword', 'woodblock print'), pd], { maxPages: 4 }))
    .filter(aicUsable)
    .filter((a) => a.has_not_been_viewed_much === false || a.is_boosted);
  const picked = [
    ...capPerMaker(shuffled(boosted, 2).map((a) => aicItem(a, 'aic')), 6),
    ...capPerMaker(shuffled(looked, 4).map((a) => aicItem(a, 'aic')), 4, 30).slice(0, 320),
    ...capPerMaker(shuffled(woodblock, 6).map((a) => aicItem(a, 'aic')), 6, 10).slice(0, 110),
  ];
  console.log(`  AIC art: ${boosted.length} boosted + ${looked.length} well-viewed paintings, ${woodblock.length} woodblock prints → ${dedupe(picked).length}`);
  return dedupe(picked);
};

const aicPhoto = async () => {
  const pd = term('is_public_domain', true);
  const out = [];
  // By decade, so the shelf spans the medium's first century instead of
  // whatever the archive lists first.
  for (let from = 1840; from <= 1930; from += 10) {
    const range = { range: { date_start: { gte: from, lte: from + 9 } } };
    const page = (await aicSearch([term('classification_titles.keyword', 'photograph'), pd, range], { maxPages: 3 })).filter(aicUsable);
    const ranked = [...page.filter((a) => a.is_boosted), ...shuffled(page.filter((a) => !a.is_boosted && a.has_not_been_viewed_much === false), from), ...shuffled(page.filter((a) => !a.is_boosted && a.has_not_been_viewed_much !== false), from + 1)];
    out.push(...ranked.slice(0, 60).map((a) => aicItem(a, 'aic')));
  }
  const picked = capPerMaker(shuffled(dedupe(out), 12), 7, 40);
  console.log(`  AIC photo: ${out.length} public-domain photographs across ten decades → ${picked.length}`);
  return picked;
};

/* ───────────────────────────── V&A ───────────────────────────── */

/**
 * The V&A's poster holdings are vast and mostly West End playbills.
 * Asked by designer name they are a design-history canon. Each entry is
 * the search name and a needle that must appear in the record's maker.
 */
const VAM_DESIGNERS = {
  'Abram Games': 'games', 'Tom Eckersley': 'eckersley', 'Edward McKnight Kauffer': 'kauffer', 'Hans Schleger': 'schleger',
  'F H K Henrion': 'henrion', 'Josef Müller-Brockmann': 'brockmann', 'Armin Hofmann': 'hofmann', 'Max Bill': 'bill, max',
  'Herbert Matter': 'matter', 'Tadanori Yokoo': 'yokoo', 'Ikko Tanaka': 'tanaka', 'Shigeo Fukuda': 'fukuda',
  'Yusaku Kamekura': 'kamekura', 'Kazumasa Nagai': 'nagai', 'Makoto Saito': 'saito', 'Henryk Tomaszewski': 'tomaszewski',
  'Jan Lenica': 'lenica', 'Roman Cieslewicz': 'cieslewicz', 'Waldemar Swierzy': 'swierzy', 'Jan Mlodozeniec': 'mlodozeniec',
  'Franciszek Starowieyski': 'starowieyski', 'Wes Wilson': 'wilson, wes', 'Victor Moscoso': 'moscoso', 'Rick Griffin': 'griffin',
  'Martin Sharp': 'sharp, martin', 'Hapshash and the Coloured Coat': 'hapshash', 'Michael English': 'english, michael',
  'Milton Glaser': 'glaser', 'Seymour Chwast': 'chwast', 'Saul Bass': 'bass, saul', 'Ben Shahn': 'shahn', 'Lester Beall': 'beall',
  'Alan Fletcher': 'fletcher', 'Otl Aicher': 'aicher', 'A.M. Cassandre': 'cassandre', 'Ludwig Hohlwein': 'hohlwein',
  'Lucian Bernhard': 'bernhard', 'Jan Tschichold': 'tschichold', 'Herbert Bayer': 'bayer', 'Giovanni Pintori': 'pintori',
  'Max Huber': 'huber', 'Atelier Populaire': 'atelier populaire', 'Barney Bubbles': 'bubbles', 'Neville Brody': 'brody',
  'Vaughan Oliver': 'oliver, vaughan', 'April Greiman': 'greiman', 'Wolfgang Weingart': 'weingart', 'Grapus': 'grapus',
  'Paula Scher': 'scher', 'Jamie Reid': 'reid, jamie', 'Jonathan Barnbrook': 'barnbrook', 'Why Not Associates': 'why not',
  'Jules Chéret': 'chéret', 'Beggarstaff Brothers': 'beggarstaff', 'Dudley Hardy': 'hardy, dudley', 'Austin Cooper': 'cooper, austin',
  'Frank Newbould': 'newbould', 'David Gentleman': 'gentleman', 'Ken Garland': 'garland', 'Richard Hollis': 'hollis',
  'David King': 'king, david', 'See Red Womens Workshop': 'see red', 'Peter Saville': 'saville', 'Wim Crouwel': 'crouwel',
  'Bruno Munari': 'munari', 'Franco Grignani': 'grignani', 'Niklaus Troxler': 'troxler', 'Tom Purvis': 'purvis',
  'Fred Taylor': 'taylor, fred', 'Edward Bawden': 'bawden', 'Paul Nash': 'nash, paul', 'Graham Sutherland': 'sutherland',
  'Barnett Freedman': 'freedman', 'Pat Keely': 'keely', 'Reginald Mount': 'mount, reginald', 'Lewitt-Him': 'lewitt',
  'Zero': 'schleger', 'Eric Gill': 'gill, eric', 'Shepard Fairey': 'fairey', 'Guerrilla Girls': 'guerrilla girls',
  'Barbara Kruger': 'kruger', 'Keith Haring': 'haring', 'Sister Corita Kent': 'corita', 'Emory Douglas': 'douglas, emory',
  'OSPAAAL': 'ospaaal', 'Rene Mederos': 'mederos', 'Alfredo Rostgaard': 'rostgaard', 'Raul Martinez': 'martinez',
  'Peter Blake': 'blake, peter', 'Bob Gill': 'gill, bob', 'Pentagram': 'pentagram', 'Tibor Kalman': 'kalman',
  'Stefan Sagmeister': 'sagmeister', 'Michael Bierut': 'bierut', 'Experimental Jetset': 'experimental jetset',
  'Anthony Burrill': 'burrill', 'Morag Myerscough': 'myerscough', 'Margaret Calvert': 'calvert',
};
const VAM_PER_DESIGNER = 7;
const vamImg = (id, size) => `https://framemark.vam.ac.uk/collections/${id}/full/!${size},${size}/0/default.jpg`;

const vamDesign = async () => {
  const hits = [];
  for (const [name, needle] of Object.entries(VAM_DESIGNERS)) {
    try {
      const qs = new URLSearchParams({ q_actor: name, q_object_type: 'poster', images_exist: 'true', page_size: '60' });
      const d = await getJSON(`https://api.vam.ac.uk/v2/objects/search?${qs}`);
      // q_actor is a loose match: keep only posters actually credited to them.
      const mine = (d.records || []).filter(
        (r) => r._primaryImageId && /poster/i.test(r.objectType || '') && (r._primaryMaker?.name || '').toLowerCase().includes(needle),
      );
      hits.push(...shuffled(mine, name.length).slice(0, VAM_PER_DESIGNER).map((r) => ({ ...r, _designer: name })));
    } catch (err) {
      console.warn(`  V&A: ${name} skipped (${err.message})`);
    }
  }
  const unique = [...new Map(hits.map((r) => [r.systemNumber, r])).values()];

  const items = [];
  for (const brief of unique) {
    let full = null;
    try {
      const d = await getJSON(`https://api.vam.ac.uk/v2/museumobject/${encodeURIComponent(brief.systemNumber)}`);
      full = d.record || null;
    } catch {
      // A missing full record still leaves a good tile and a link.
    }
    const people = [...(full?.artistMakerPerson ?? []), ...(full?.artistMakerPeople ?? []), ...(full?.artistMakerOrganisations ?? [])]
      .map((m) => ({ name: m.name?.text || '', role: m.association?.text || 'maker' }))
      .filter((p) => p.name && isNamed(p.name));
    // "Games, Abram" → "Abram Games"
    const flip = (n) => (/^[^,]+, [^,]+$/.test(n) ? n.replace(/^([^,]+), (.+)$/, '$2 $1') : n);
    const rawMaker = people[0]?.name || brief._primaryMaker?.name || brief._designer;
    const maker = flip(rawMaker.replace(/\s*\((?:OBE|CBE|RDI|RA|Sir)[^)]*\)/gi, '').trim());
    const title = stripTags(full?.titles?.[0]?.title) || brief._primaryTitle || '';
    const date = full?.productionDates?.[0]?.date?.text || brief._primaryDate || '';
    const dims = (full?.dimensions ?? []).filter((x) => x.dimension && x.value).map((x) => `${x.dimension} ${x.value}${x.unit ? ` ${x.unit}` : ''}`).join(', ');
    const summary = stripTags(full?.summaryDescription) || stripTags(full?.briefDescription);
    const text = `${title} ${summary || ''}`;
    if (UNFIT.test(text)) continue;
    items.push({
      uid: `vam:${brief.systemNumber}`,
      src: 'vam',
      maker,
      year: yearOf(date),
      // Many V&A posters are catalogued as just "Poster"; the maker carries the label then.
      title: title && !/^poster$/i.test(title) ? title : `Poster by ${maker}`,
      description: `${maker}${date ? ` (${date})` : ''}`,
      // 768px is the V&A's limit for non-commercial digital use.
      imageUrl: vamImg(brief._primaryImageId, 768),
      thumbnailUrl: vamImg(brief._primaryImageId, 400),
      collectionSource: 'Victoria and Albert Museum, London',
      url: `https://collections.vam.ac.uk/item/${brief.systemNumber}`,
      date,
      shortDescription: clip(summary),
      labelText: clip(stripTags(full?.physicalDescription), 500),
      medium: stripTags(full?.materialsAndTechniques),
      dimensions: dims || stripTags(full?.dimensionsNote),
      creditLine: [stripTags(full?.creditLine), '© Victoria and Albert Museum, London'].filter(Boolean).join('. '),
      culture: full?.placesOfOrigin?.[0]?.place?.text || brief._primaryPlace || undefined,
      styleTitles: (full?.styles ?? []).map((s) => s.text).filter(Boolean).slice(0, 2),
      objectType: full?.objectType || brief.objectType,
      accessionNumber: brief.accessionNumber || full?.accessionNumber,
      participants: people.length ? people.map((p) => ({ ...p, name: flip(p.name) })) : undefined,
      copyrightStatus: 'unknown',
      rightsNote: 'Image © Victoria and Albert Museum, London. Shown at reduced size for non-commercial study.',
    });
  }
  const makers = new Set(items.map((i) => makerKey(i.maker)));
  console.log(`  V&A: ${unique.length} posters by named designers → ${items.length} (${makers.size} designers)`);
  return items;
};

/* ───────────────────────── Rijksmuseum ───────────────────────── */

const LD = { Accept: 'application/ld+json' };
const EN = 'http://vocab.getty.edu/aat/300388277';
const inEnglish = (x) => (x.language || []).some((l) => l.id === EN);
const RIJKS_ROLES = /^(designer|print maker|draughtsman|lithographer|after design by|after drawing by|after painting by|printer|publisher)\b[^:]*:\s*(.+)$/i;

const rijksPosters = async () => {
  // Walk the whole poster search (about 50 pages), then take an even spread.
  const ids = [];
  let url = 'https://data.rijksmuseum.nl/search/collection?type=affiche&imageAvailable=true';
  for (let page = 0; page < 60 && url; page++) {
    const d = await getJSON(url);
    ids.push(...(d.orderedItems || []).map((o) => o.id));
    url = d.next?.id;
  }
  // Only about one poster in five carries a public-domain notice, so
  // read well over a thousand to shelve a couple of hundred.
  const RIJKS_READ = 1400;
  const step = Math.max(1, Math.floor(ids.length / RIJKS_READ));
  const sample = shuffled(ids.filter((_, i) => i % step === WEEK % step), 21).slice(0, RIJKS_READ);

  const items = [];
  for (const id of sample) {
    let o;
    try {
      o = await getJSON(id, LD);
    } catch {
      continue;
    }
    // The picture and its rights notice sit together on the record.
    let image, cleared = false, page;
    for (const s of o.subject_of || []) {
      for (const dobj of s.digitally_carried_by || []) {
        const ap = dobj.access_point?.[0]?.id || '';
        if (ap.includes('iiif.micr.io')) {
          image = ap;
          cleared = (dobj.referred_to_by || []).some((r) => /public domain|cc0|publicdomain/i.test(`${r._label || ''} ${r.content || ''}`));
        } else if (dobj.format === 'text/html' || ap.includes('rijksmuseum.nl')) {
          page = page || ap;
        }
      }
    }
    if (!image || !cleared) continue;

    const names = (o.identified_by || []).filter((x) => x.type === 'Name' && x.content);
    const title = (names.find(inEnglish) || names[0])?.content;
    const objNumber = (o.identified_by || []).find((x) => x.type === 'Identifier' && /^[A-Z]{2}-/.test(x.content || ''))?.content;
    const date = (o.produced_by?.timespan?.identified_by || []).find(inEnglish)?.content || o.produced_by?.timespan?.identified_by?.[0]?.content;
    const year = yearOf(o.produced_by?.timespan?.begin_of_the_begin, date);
    if (!title || !year || year > 1945) continue;
    if (UNFIT.test(title)) continue;

    // Makers arrive as English statements: "designer: Jan Toorop, Amsterdam".
    const roles = [];
    for (const part of o.produced_by?.part || []) {
      for (const r of part.referred_to_by || []) {
        if (!inEnglish(r)) continue;
        const m = String(r.content || '').match(RIJKS_ROLES);
        if (m) roles.push({ role: m[1].toLowerCase(), name: m[2].replace(/\s*\([^)]*\)/g, '').split(',')[0].trim() });
      }
    }
    const order = ['designer', 'draughtsman', 'print maker', 'lithographer', 'after design by', 'after drawing by', 'after painting by'];
    const lead = roles.filter((r) => order.includes(r.role) && isNamed(r.name)).sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))[0];
    const description = (o.referred_to_by || []).find((r) => inEnglish(r) && (r.content || '').length > 40)?.content;
    const base = image.replace(/\/full\/[^/]+\/0\/default\.jpg$/, '');

    items.push({
      uid: `rijks:${objNumber || id}`,
      src: 'rijks',
      maker: lead?.name,
      year,
      title,
      description: lead ? `${lead.name}${date ? ` (${date})` : ''}` : date || undefined,
      imageUrl: `${base}/full/1600,/0/default.jpg`,
      thumbnailUrl: `${base}/full/400,/0/default.jpg`,
      collectionSource: 'Rijksmuseum, Amsterdam',
      url: objNumber ? `https://www.rijksmuseum.nl/en/collection/${objNumber}` : page || id,
      date,
      shortDescription: clip(description),
      creditLine: 'Rijksmuseum, Amsterdam',
      objectType: 'Poster',
      accessionNumber: objNumber,
      participants: roles.filter((r) => isNamed(r.name)).map((r) => ({ name: r.name, role: r.role })),
      copyrightStatus: 'public_domain',
    });
  }
  const picked = capPerMaker(items, 5).slice(0, 260);
  console.log(`  Rijksmuseum: ${ids.length} posters listed, ${sample.length} read, ${items.length} cleared as public domain → ${picked.length}`);
  return picked;
};

/* ───────────────── WPA posters (Library of Congress) ───────────────── */

const commons = (params) =>
  getJSON('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', formatversion: '2', ...params }));

const wpaPosters = async () => {
  const ROOT_CAT = 'Category:Work Projects Administration Poster Collection';
  const cats = [ROOT_CAT];
  const sub = await commons({ action: 'query', list: 'categorymembers', cmtitle: ROOT_CAT, cmtype: 'subcat', cmlimit: '100' });
  cats.push(...(sub.query?.categorymembers || []).map((c) => c.title));

  const files = [];
  for (const cat of cats) {
    let cont = {};
    for (let i = 0; i < 4; i++) {
      const d = await commons({
        action: 'query', generator: 'categorymembers', gcmtitle: cat, gcmtype: 'file', gcmlimit: '200',
        prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '500',
        iiextmetadatafilter: 'LicenseShortName|Artist|DateTimeOriginal|ImageDescription', ...cont,
      });
      files.push(...(d.query?.pages || []));
      if (!d.continue) break;
      cont = d.continue;
    }
  }

  const items = [];
  for (const p of files) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/jpe?g|png/i.test(ii.mime || '') || ii.width < 700) continue;
    const meta = ii.extmetadata || {};
    const licence = meta.LicenseShortName?.value || '';
    if (!/public domain|cc0|no restrictions/i.test(licence)) continue;
    const lccn = p.title.match(/LCCN\s?(\d{8,10})/i)?.[1];
    const rawTitle = p.title.replace(/^File:/, '').replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').replace(/\s*LCCN\s?\d+.*/i, '').trim();
    const blurb = stripTags(meta.ImageDescription?.value) || '';
    if (UNFIT.test(`${rawTitle} ${blurb}`)) continue;
    // Titles straight from file names are only usable when they read as words.
    if (rawTitle.length < 6 || !/\s/.test(rawTitle)) continue;
    const artist = stripTags(meta.Artist?.value) || '';
    const named = /work projects|works progress|wpa|federal art|library of congress|government|unknown/i.test(artist) ? undefined : artist.split(/[,(;]/)[0].trim();
    const dateText = (stripTags(meta.DateTimeOriginal?.value) || '').replace(/date QS.*$/i, '').trim();
    const stem = ii.thumburl.split('?')[0];
    const large = ii.width > 1280 ? stem.replace(/\/\d+px-/, '/1280px-') : ii.url;
    items.push({
      uid: `wpa:${p.pageid}`,
      src: 'wpa',
      maker: named && named.length < 40 && isNamed(named) ? named : undefined,
      year: yearOf(dateText, blurb) || 1939,
      title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
      description: `${named && named.length < 40 ? `${named}, ` : ''}WPA Federal Art Project${dateText ? ` (${dateText})` : ''}`,
      imageUrl: large,
      thumbnailUrl: stem,
      imageWidth: ii.width,
      imageHeight: ii.height,
      collectionSource: 'Library of Congress, WPA Poster Collection',
      url: lccn ? `https://www.loc.gov/item/${lccn}/` : ii.descriptionurl,
      date: dateText || '1936–1943',
      shortDescription: clip(blurb, 600),
      medium: 'Silkscreen poster',
      creditLine: 'Library of Congress, Prints & Photographs Division, WPA Poster Collection. Image via Wikimedia Commons.',
      objectType: 'Poster',
      styleTitles: ['WPA Federal Art Project'],
      copyrightStatus: 'public_domain',
    });
  }
  // The collection is large; a few hundred is plenty for seasoning and
  // keeps the human pass over it manageable.
  // Human pass, 23 Nov 2026: wartime caricature, a swastika, yellowface
  // staging. The weekly rebuild rotates which 240 hang, so works nobody
  // has looked at will appear; add to this list when one should not.
  const WPA_HELD_BACK = /mikado|stamp .em out|australia and the war|don.?t tell him what you know|androcles and the lion/i;
  const fit = items.filter((i) => !WPA_HELD_BACK.test(`${i.title} ${i.shortDescription || ''}`));
  const picked = capPerTitle(shuffled(dedupe(fit), 61)).slice(0, 240);
  console.log(`  WPA posters: ${files.length} files in ${cats.length} categories, ${items.length} cleared and titled → ${picked.length}`);
  return picked;
};

/* ───────────────────── Harvard Art Museums ───────────────────── */

const norm = (v) => (v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const harvardFetch = (qs) => getJSON(`https://api.harvardartmuseums.org/object?apikey=${HARVARD_KEY}&${qs}`);
const harvardImg = (o, size) => (o.primaryimageurl ? `${o.primaryimageurl}${o.primaryimageurl.includes('?') ? '&' : '?'}width=${size}` : null);

const isDocumentation = (o) => {
  const text = norm([o.title, o.medium, o.technique, o.classification, o.department, o.division].filter(Boolean).join(' '));
  return ['x radiograph', 'x ray', 'radiograph', 'infrared reflectogram', 'ultraviolet', 'raking light', 'conservation', 'detail of', 'verso of', 'frame of', 'negative', 'contact sheet', 'clipping', 'tear sheet'].some((t) => text.includes(t));
};
const likelyColour = (o) => {
  const medium = norm(`${o.medium} ${o.technique}`);
  if (/chromogenic|cibachrome|dye transfer|pigment print|inkjet|polaroid|color/.test(medium)) return true;
  const hues = new Set((o.colors || []).filter((c) => c.percent >= 0.04).map((c) => norm(c.hue || c.css3 || c.spectrum)).filter((h) => h && !['gray', 'grey', 'black', 'white'].includes(h)));
  return hues.size >= 2;
};
const harvardItem = (o, src, label) => {
  const people = (o.people || []).filter((p) => p.name && isNamed(p.name));
  const artist = people.find((p) => /artist|photographer|designer|maker/i.test(p.role || '')) || people[0];
  return {
    uid: `harvard:${o.objectid || o.id}`,
    src,
    maker: artist?.name,
    year: yearOf(o.datebegin, o.dated),
    title: o.title,
    description: [artist?.name, o.dated].filter(Boolean).join(', ') || undefined,
    imageUrl: harvardImg(o, 1600),
    thumbnailUrl: harvardImg(o, 400),
    imageWidth: o.images?.[0]?.width,
    imageHeight: o.images?.[0]?.height,
    collectionSource: label,
    url: o.url,
    date: o.dated || o.century || undefined,
    shortDescription: clip(stripTags(o.description)),
    medium: o.medium || o.technique || undefined,
    dimensions: o.dimensions || undefined,
    creditLine: [o.creditline, o.copyright].filter(Boolean).join('. ') || undefined,
    classificationTitles: o.classification ? [o.classification] : undefined,
    styleTitles: [o.culture, o.period, o.century].filter(Boolean).slice(0, 3),
    participants: people.map((p) => ({ name: p.name, role: p.role })),
    copyrightStatus: 'unknown',
    rightsNote: 'Image courtesy of the Harvard Art Museums. Shown for non-commercial study.',
  };
};
const harvardUsable = (o) =>
  !!o.primaryimageurl && o.imagepermissionlevel === 0 && !!o.title && norm(o.title) !== 'untitled' && (o.people || []).length > 0 && !isDocumentation(o) && !UNFIT.test(o.title);

const HARVARD_PHOTO_BUCKETS = {
  colour: ['chromogenic print', 'dye transfer print', 'pigment print', 'inkjet print', 'Polaroid', 'Cibachrome', 'color photography'],
  postwar: ['contemporary photography', 'conceptual photography', 'fashion photography', 'street photography', 'documentary photography', 'still life photography'],
  people: ['portrait photography', 'self portrait photography', 'studio portrait', 'photographic portrait'],
  place: ['landscape photography', 'interior photography', 'urban photography', 'city photography'],
  experimental: ['abstract photography', 'photogram', 'photomontage', 'solarized photograph'],
};

const harvardPhoto = async () => {
  if (!HARVARD_KEY) {
    console.warn('  Harvard: no key in .env, skipped');
    return [];
  }
  const found = [];
  for (const [bucket, terms] of Object.entries(HARVARD_PHOTO_BUCKETS)) {
    for (const t of terms) {
      for (const page of [1, 2]) {
        try {
          const d = await harvardFetch(`size=100&page=${page}&hasimage=1&classification=Photographs&q=${encodeURIComponent(t)}`);
          found.push(...(d.records || []).filter(harvardUsable).map((o) => ({ o, bucket })));
          if ((d.info?.pages ?? 1) <= page) break;
        } catch (err) {
          console.warn(`  Harvard photo "${t}" p${page} skipped (${err.message})`);
        }
      }
    }
  }
  const unique = [...new Map(found.map((f) => [f.o.objectid || f.o.id, f])).values()];
  // Colour and post-1950 work first: without the lean the wall settles
  // into nineteenth-century studio portraits.
  const modern = unique.filter((f) => likelyColour(f.o) || f.o.datebegin >= 1950);
  const earlier = unique.filter((f) => !modern.includes(f));
  const items = [
    ...capPerMaker(shuffled(modern, 31).map((f) => harvardItem(f.o, 'harvard', 'Harvard Art Museums')), 6).slice(0, 320),
    // Uncredited early prints here are mostly album pages; keep the named.
    ...capPerMaker(shuffled(earlier, 32).map((f) => harvardItem(f.o, 'harvard', 'Harvard Art Museums')), 3, 0).slice(0, 80),
  ];
  console.log(`  Harvard photo: ${unique.length} usable (${modern.length} colour or post-1950) → ${items.length}`);
  return dedupe(items);
};

const HARVARD_DESIGN_THEMES = ['Bauhaus', 'Lyonel Feininger', 'Moholy-Nagy', 'Josef Albers', 'Anni Albers', 'Marianne Brandt', 'Werkbund', 'De Stijl', 'New European Graphics', 'Bauhaus weaving', 'Herbert Bayer'];

const harvardDesign = async () => {
  if (!HARVARD_KEY) return [];
  const found = [];
  for (const theme of HARVARD_DESIGN_THEMES) {
    for (const page of [1, 2, 3]) {
      try {
        const d = await harvardFetch(`size=100&page=${page}&hasimage=1&q=${encodeURIComponent(theme)}`);
        found.push(
          ...(d.records || []).filter(
            (o) =>
              harvardUsable(o) &&
              o.classification !== 'Photographs' &&
              !/^photographs? of/i.test(o.title) &&
              !/^(paintings|sculpture|vessels|coins)$/i.test(o.classification || '') &&
              // The search is loose (a query for "De Stijl" returns Dutch
              // old masters); the thread is the modern movement only.
              o.datebegin >= 1905 &&
              o.datebegin <= 1975,
          ),
        );
        if ((d.info?.pages ?? 1) <= page) break;
      } catch (err) {
        console.warn(`  Harvard design "${theme}" p${page} skipped (${err.message})`);
      }
    }
  }
  const unique = [...new Map(found.map((o) => [o.objectid || o.id, o])).values()];
  // Whole runs share one title ("Apartment House", "Werkbund Exhibition"):
  // two of each is enough, and uncredited archive views stay few.
  const items = capPerTitle(
    capPerMaker(
      shuffled(unique, 41).map((o) => harvardItem(o, 'harvard', /busch/i.test(`${o.division} ${o.creditline}`) ? 'Harvard Art Museums, Busch-Reisinger Museum' : 'Harvard Art Museums')),
      8,
      12,
    ),
    2,
  ).slice(0, 170);
  console.log(`  Harvard Bauhaus thread: ${unique.length} usable → ${items.length}`);
  return items;
};

/* ───────────────────── Cleveland Museum of Art ───────────────────── */

const cmaArt = async () => {
  const fields = 'id,accession_number,title,creators,creation_date,creation_date_earliest,url,share_license_status,images,technique,creditline,type,culture,did_you_know,measurements,current_location';
  const grab = async (extra, pages = 1) => {
    const out = [];
    for (let i = 0; i < pages; i++) {
      const d = await getJSON(`https://openaccess-api.clevelandart.org/api/artworks/?cc0=1&has_image=1&limit=500&skip=${i * 500}&fields=${fields}&${extra}`);
      out.push(...(d.data || []));
      if ((d.data || []).length < 500) break;
    }
    return out;
  };
  const types = new Set(['Painting', 'Print', 'Drawing']);
  const highlights = (await grab('highlight=1', 3)).filter((r) => types.has(r.type));
  const onView = (await grab('type=Painting&currently_on_view=1', 2)).filter((r) => r.current_location);
  const rows = [...new Map([...highlights, ...onView].map((r) => [r.id, r])).values()].filter(
    (r) => r.share_license_status === 'CC0' && r.images?.web?.url && r.title && !UNFIT.test(r.title),
  );
  const items = rows.map((r) => {
    const artist = (r.creators || []).find((c) => /artist|painter|printmaker|draftsman/i.test(c.role || '')) || (r.creators || [])[0];
    const makerFull = artist?.description || '';
    const maker = makerFull.replace(/\s*\(.*$/, '').trim();
    return {
      uid: `cma:${r.id}`,
      src: 'cma',
      maker: isNamed(maker) ? maker : undefined,
      year: yearOf(r.creation_date_earliest, r.creation_date),
      title: r.title,
      description: makerFull || r.culture?.[0] || undefined,
      imageUrl: r.images.print?.url || r.images.web.url,
      thumbnailUrl: r.images.web.url,
      fallbackUrl: r.images.web.url,
      imageWidth: Number(r.images.web.width) || undefined,
      imageHeight: Number(r.images.web.height) || undefined,
      collectionSource: 'Cleveland Museum of Art',
      url: r.url,
      date: r.creation_date || undefined,
      shortDescription: clip(stripTags(r.did_you_know)),
      medium: r.technique || undefined,
      dimensions: r.measurements || undefined,
      creditLine: r.creditline || undefined,
      classificationTitles: r.type ? [r.type] : undefined,
      culture: r.culture?.[0]?.split(',')[0] || undefined,
      copyrightStatus: 'public_domain',
    };
  });
  const picked = capPerMaker(shuffled(items, 51), 4, 40).slice(0, 320);
  console.log(`  Cleveland: ${highlights.length} highlights + ${onView.length} paintings on view → ${picked.length}`);
  return picked;
};

/* ───────────────────────────── assemble ───────────────────────────── */

const clean = (item) => {
  const out = {};
  for (const [k, v] of Object.entries(item)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
};

const safely = async (label, fn) => {
  try {
    return await fn();
  } catch (err) {
    console.error(`  ${label} failed: ${err.message}`);
    return [];
  }
};

const main = async () => {
  const started = Date.now();
  console.log('Gathering the Design shelf');
  const design = [
    ...(await safely('AIC design', aicDesign)),
    ...(await safely('V&A', vamDesign)),
    ...(await safely('Rijksmuseum', rijksPosters)),
    ...(await safely('WPA', wpaPosters)),
    ...(await safely('Harvard Bauhaus', harvardDesign)),
  ];
  console.log('Gathering the Art shelf');
  const art = [...(await safely('AIC art', aicArt)), ...(await safely('Cleveland', cmaArt))];
  console.log('Gathering the Photo shelf');
  const photo = [...(await safely('Harvard photo', harvardPhoto)), ...(await safely('AIC photo', aicPhoto))];

  const shelves = { design, art, photo };
  const count = (list, src) => list.filter((i) => i.src === src).length;
  const total = design.length + art.length + photo.length;
  const vamShare = count(design, 'vam') / Math.max(total, 1);

  // A shelf that lost its lead source is worse than last week's shelf:
  // refuse to overwrite a good file with a thin one.
  const FLOORS = { design: 500, art: 300, photo: 250 };
  const LEADS = { design: ['aic', 'vam'], art: ['aic'], photo: ['harvard', 'aic'] };
  const problems = [];
  for (const [lens, list] of Object.entries(shelves)) {
    if (list.length < FLOORS[lens]) problems.push(`${lens} has only ${list.length} works (floor ${FLOORS[lens]})`);
    for (const lead of LEADS[lens]) if (count(list, lead) < 60) problems.push(`${lens} is missing its ${lead} works (${count(list, lead)})`);
  }
  if (vamShare > 0.25) problems.push(`V&A is ${(vamShare * 100).toFixed(0)}% of the shelf (their terms cap it at 25%)`);

  console.log('\nShelf');
  for (const [lens, list] of Object.entries(shelves)) {
    const by = {};
    for (const i of list) by[i.src] = (by[i.src] || 0) + 1;
    console.log(`  ${lens.padEnd(6)} ${String(list.length).padStart(5)}  ${JSON.stringify(by)}`);
  }
  console.log(`  V&A share of whole shelf: ${(vamShare * 100).toFixed(1)}%`);
  console.log(`  Requests made: ${JSON.stringify(calls)}`);

  if (problems.length) {
    console.error('\nNot written. The existing shelf stays in place:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [lens, list] of Object.entries(shelves)) {
    fs.writeFileSync(path.join(OUT_DIR, `${lens}.json`), JSON.stringify(list.map(clean)));
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        week: WEEK,
        // Harvard's terms: stored data no older than two weeks.
        refreshBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        counts: Object.fromEntries(Object.entries(shelves).map(([lens, list]) => [lens, list.length])),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`\nWritten to ${path.relative(ROOT, OUT_DIR) || OUT_DIR} in ${Math.round((Date.now() - started) / 1000)}s (week ${WEEK})`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
