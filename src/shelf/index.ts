import { PortfolioItem } from '../types';
import { shuffle } from '../utils/shuffle';

/**
 * The shelf.
 *
 * Works are gathered ahead of time by scripts/build-shelf.mjs and ship
 * with the site as three small files (public/shelf/). The wall is dealt
 * from them, so a visit never waits on, or fails with, a museum's data
 * service. Only the pictures come from the museums' own image servers.
 *
 * Still a handful, still unexpected: every room is a fresh deal of
 * works this visit has not hung yet. Nothing here ranks, recommends or
 * learns.
 */

export type Lens = 'design' | 'art' | 'photo';
export type RoomMode = Lens | 'mixed';

/** A shelved work: a PortfolioItem without a place on the wall yet. */
export type ShelfItem = Omit<PortfolioItem, 'id' | 'x' | 'y'> & { uid: string; src: string };

/**
 * How many works each archive hangs in a room of 24. Design leads with
 * the Art Institute's graphic design and the V&A's named designers;
 * the V&A's terms cap its share of the project at a quarter, so it
 * never takes more than six.
 */
const RECIPES: Record<Lens, Record<string, number>> = {
  design: { aic: 10, vam: 6, rijks: 3, wpa: 3, harvard: 2 },
  art: { aic: 16, cma: 8 },
  photo: { harvard: 14, aic: 10 },
};
const RECIPE_SIZE = 24;
const MAX_PER_MAKER = 2;

const shelves = new Map<Lens, Promise<ShelfItem[]>>();

export const loadShelf = (lens: Lens): Promise<ShelfItem[]> => {
  const cached = shelves.get(lens);
  if (cached) return cached;
  const request = fetch(`/shelf/${lens}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`The ${lens} shelf did not load (${res.status})`);
      return res.json() as Promise<ShelfItem[]>;
    })
    .catch((err) => {
      // A failed load must not be remembered, or "Try again" could never work.
      shelves.delete(lens);
      throw err;
    });
  shelves.set(lens, request);
  return request;
};

const ALL_LENSES: Lens[] = ['design', 'art', 'photo'];

/** Same signature the session's seen-list uses. */
export const signatureOf = (item: { imageUrl?: string; url?: string; uid?: string }): string =>
  item.imageUrl || item.url || item.uid || '';

const makerKeyOf = (item: ShelfItem): string =>
  (item.maker || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const interleave = <T,>(lists: T[][]): T[] => {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const list of lists) if (i < list.length) out.push(list[i]);
  return out;
};

/**
 * Picture servers that are refusing this visitor right now. Some museums
 * turn away browsers they take for robots, or pages that send no
 * referrer; a museum can also simply be down. After a few failures an
 * archive sits out the rest of the visit, so later rooms are dealt
 * from the archives that are answering.
 */
const DOWN_AFTER = 3;
const failures = new Map<string, number>();
const isDown = (src: string): boolean => (failures.get(src) ?? 0) >= DOWN_AFTER;

/**
 * Deal `count` works from one lens: each archive's share first, short
 * shares made up from the rest, never more than two by one maker.
 * Works already hung this visit are passed over until the shelf runs
 * dry, then repeats are allowed rather than leaving a gap.
 */
const dealLens = (shelf: ShelfItem[], lens: Lens, count: number, seen: Set<string>): ShelfItem[] => {
  const recipe = RECIPES[lens];
  // Leave out archives whose pictures are failing, unless that is all of them.
  const answering = shelf.filter((item) => !isDown(item.src));
  if (answering.length >= count) shelf = answering;

  const bySource = new Map<string, ShelfItem[]>();
  for (const item of shuffle(shelf)) {
    const list = bySource.get(item.src) ?? [];
    list.push(item);
    bySource.set(item.src, list);
  }

  const makers = new Map<string, number>();
  const taken = new Set<string>();
  const take = (pool: ShelfItem[], want: number, allowSeen: boolean): ShelfItem[] => {
    const out: ShelfItem[] = [];
    for (const item of pool) {
      if (out.length >= want) break;
      if (taken.has(item.uid)) continue;
      if (!allowSeen && seen.has(signatureOf(item))) continue;
      const maker = makerKeyOf(item);
      if (maker) {
        const n = makers.get(maker) ?? 0;
        if (n >= MAX_PER_MAKER) continue;
        makers.set(maker, n + 1);
      }
      taken.add(item.uid);
      out.push(item);
    }
    return out;
  };

  const groups: ShelfItem[][] = [];
  for (const [src, share] of Object.entries(recipe)) {
    const want = Math.round((share / RECIPE_SIZE) * count);
    groups.push(take(bySource.get(src) ?? [], want, false));
  }
  let room = interleave(groups);

  if (room.length < count) {
    // An archive ran short of unseen works: fill from the whole lens.
    const rest = shuffle(shelf);
    room = [...room, ...take(rest, count - room.length, false)];
    if (room.length < count) room = [...room, ...take(rest, count - room.length, true)];
  }
  return room.slice(0, count);
};

/**
 * Deal a room. `mixed` hangs a third from each lens, design first, so
 * the All room keeps its graphic-design spine.
 */
export const dealRoom = async (mode: RoomMode, count: number, seen: Set<string>): Promise<ShelfItem[]> => {
  if (mode !== 'mixed') return dealLens(await loadShelf(mode), mode, count, seen);

  const [design, art, photo] = await Promise.all(ALL_LENSES.map(loadShelf));
  const third = Math.ceil(count / 3);
  return interleave([
    dealLens(design, 'design', third, seen),
    dealLens(art, 'art', third, seen),
    dealLens(photo, 'photo', third, seen),
  ]).slice(0, count);
};

/**
 * A hung work's picture would not load. Note the failure against its
 * archive and hand back a stand-in from a different archive on the same
 * shelf, one that is not already on the wall. The pick is added to
 * `onWall`, which the caller keeps for the life of the room.
 */
export const standInFor = async (dead: { uid?: string; src?: string }, onWall: Set<string>, seen: Set<string>): Promise<ShelfItem | null> => {
  if (dead.src) failures.set(dead.src, (failures.get(dead.src) ?? 0) + 1);

  const loaded = await Promise.all(ALL_LENSES.map(loadShelf));
  // From here to the return nothing awaits, so when several tiles fail
  // at once each call sees the picks the others have already claimed.
  const home = loaded.find((shelf) => shelf.some((item) => item.uid === dead.uid)) ?? loaded.flat();
  const candidates = shuffle(home).filter((item) => item.src !== dead.src && !isDown(item.src) && !onWall.has(signatureOf(item)));
  const pick = candidates.find((item) => !seen.has(signatureOf(item))) ?? candidates[0] ?? null;
  if (pick) onWall.add(signatureOf(pick));
  return pick;
};

const tokens = (value: string): string[] =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

/** Every meaningful word of `needle` appears in `haystack`. */
const mentions = (haystack: string | undefined, needle: string): boolean => {
  if (!haystack) return false;
  const hay = haystack.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const want = tokens(needle);
  return want.length > 0 && want.every((t) => hay.includes(t));
};

const creditedTo = (item: ShelfItem, name: string): boolean =>
  mentions(item.maker, name) ||
  !!item.participants?.some((p) => mentions(p.name, name)) ||
  mentions(item.description?.split('\n')[0], name);

/**
 * Follow a catalogue thread across the whole shelf: more by this maker,
 * in this style, from this place, of this kind. Threads are the
 * catalogue's own fields, never "similar things".
 */
export const followThread = async (label: string, category: string | undefined, count: number): Promise<ShelfItem[]> => {
  const all = (await Promise.all(ALL_LENSES.map(loadShelf))).flat();
  const same = (value: string | undefined) => !!value && value.toLowerCase().trim() === label.toLowerCase().trim();

  let hits: ShelfItem[];
  switch (category) {
    case 'maker':
      hits = all.filter((item) => creditedTo(item, label));
      break;
    case 'style':
      hits = all.filter((item) => item.styleTitles?.some(same));
      break;
    case 'culture':
      hits = all.filter((item) => same(item.culture) || item.styleTitles?.some(same));
      break;
    case 'object':
      hits = all.filter((item) => same(item.objectType));
      break;
    default:
      hits = all.filter(
        (item) => creditedTo(item, label) || same(item.culture) || same(item.objectType) || item.styleTitles?.some(same) || mentions(item.title, label),
      );
  }
  const unique = [...new Map(hits.map((item) => [item.uid, item])).values()];
  return shuffle(unique).slice(0, count);
};

/** Other shelved works credited to the same maker, for the detail view. */
export const worksByMaker = async (name: string, excludeUrl: string | undefined, count: number): Promise<ShelfItem[]> => {
  const all = (await Promise.all(ALL_LENSES.map(loadShelf))).flat();
  const hits = all.filter((item) => item.url !== excludeUrl && creditedTo(item, name));
  return [...new Map(hits.map((item) => [item.uid, item])).values()].slice(0, count);
};
