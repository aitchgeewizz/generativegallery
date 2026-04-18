import { CollectionDefinition } from './types';
import { PortfolioItem, ShapeType } from '../types';

const shapes: ShapeType[] = ['box', 'sphere', 'torus', 'cone', 'cylinder', 'octahedron'];

const colors = [
  '#FF0000', '#0000FF', '#FFFF00', '#000000', '#FFFFFF',
  '#FF6B35', '#004E89', '#F7B267', '#00D1FF', '#FF006E',
  '#FFBE0B', '#2EC4B6', '#E71D36', '#FF9F1C', '#8B5CF6',
  '#A855F7', '#EC4899', '#10B981', '#F59E0B', '#6366F1',
];

const APP_NAME = 'MuseumArtBrowser/1.0 (museum-art-browser@github)';

/**
 * Genre + decade search terms for digging through the archives.
 * Each load picks a random handful — like browsing different
 * sections and bins of a record store.
 */
const GENRE_BINS = [
  // Genre tags (MusicBrainz tag search)
  'jazz', 'blues', 'soul', 'funk', 'r&b',
  'rock', 'punk', 'post-punk', 'new wave', 'shoegaze',
  'electronic', 'ambient', 'trip hop', 'house', 'techno',
  'hip hop', 'rap',
  'folk', 'country', 'bluegrass',
  'reggae', 'dub', 'ska',
  'classical', 'opera',
  'afrobeat', 'bossa nova', 'latin', 'world music',
  'metal', 'grunge', 'alternative',
  'indie rock', 'indie pop', 'dream pop',
  'psychedelic', 'krautrock', 'progressive rock',
  'disco', 'synthpop', 'new age',
  'experimental', 'noise', 'avant-garde',
];

type AlbumResult = { mbid: string; artist: string; title: string; year: string; genre: string };

/**
 * Search MusicBrainz for release groups matching a genre tag.
 * Uses a random offset so each call surfaces different albums.
 */
const searchByGenre = async (genre: string, limit: number = 12): Promise<AlbumResult[]> => {
  const offset = Math.floor(Math.random() * 200);

  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/release-group/?query=tag:${encodeURIComponent(genre)}&type=album&limit=${limit}&offset=${offset}&fmt=json`,
      {
        headers: { 'User-Agent': APP_NAME, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const releaseGroups = data['release-groups'] || [];

    return releaseGroups.map((rg: Record<string, unknown>) => ({
      mbid: rg.id as string,
      artist: ((rg['artist-credit'] as Array<Record<string, unknown>>)?.[0]?.name as string) || 'Unknown Artist',
      title: (rg.title as string) || 'Untitled',
      year: ((rg['first-release-date'] as string)?.substring(0, 4)) || '',
      genre,
    }));
  } catch {
    return [];
  }
};

const generateGridPositions = (count: number, centered: boolean = false) => {
  if (count === 0) return [];

  const positions = [];
  const itemsPerRow = 8;
  const itemWidth = 200;
  const itemHeight = 200;
  const gap = 100;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / itemsPerRow);
    const col = i % itemsPerRow;
    positions.push({
      x: col * (itemWidth + gap),
      y: row * (itemHeight + gap),
    });
  }

  if (centered) {
    const rows = Math.ceil(count / itemsPerRow);
    const cols = Math.min(count, itemsPerRow);
    const totalWidth = cols * itemWidth + (cols - 1) * gap;
    const totalHeight = rows * itemHeight + (rows - 1) * gap;
    const offsetX = -totalWidth / 2;
    const offsetY = -totalHeight / 2;

    return positions.map(pos => ({
      x: pos.x + offsetX,
      y: pos.y + offsetY,
    }));
  }

  return positions;
};

const albumToItem = (album: AlbumResult, index: number, pos: { x: number; y: number }): PortfolioItem => ({
  id: `album-${album.mbid}-${index}`,
  x: pos.x,
  y: pos.y,
  shape: shapes[Math.floor(Math.random() * shapes.length)],
  color: colors[Math.floor(Math.random() * colors.length)],
  title: album.title,
  description: `${album.artist}${album.year ? ` (${album.year})` : ''}`,
  imageUrl: `https://coverartarchive.org/release-group/${album.mbid}/front`,
  collectionSource: 'Album Covers',
  url: `https://musicbrainz.org/release-group/${album.mbid}`,
  styleTitles: [album.genre, album.year ? `${album.year.substring(0, 3)}0s` : ''].filter(Boolean),
  participants: [{ name: album.artist, role: 'Artist' }],
});

/**
 * Fetch album covers by searching random genre bins.
 * Picks 6 genres at random, searches each with a random offset,
 * then shuffles everything together — different every time.
 */
const fetchAlbumCoverItems = async (count: number = 32): Promise<PortfolioItem[]> => {
  // Pick 6 random genre bins
  const shuffledGenres = [...GENRE_BINS].sort(() => Math.random() - 0.5);
  const selectedGenres = shuffledGenres.slice(0, 6);

  console.log(`Digging through: ${selectedGenres.join(', ')}`);

  // Search in batches of 3 to respect MusicBrainz rate limit (1 req/sec)
  const allAlbums: AlbumResult[] = [];
  const seen = new Set<string>();

  for (let batch = 0; batch < selectedGenres.length; batch += 3) {
    const batchGenres = selectedGenres.slice(batch, batch + 3);
    const searches = batchGenres.map(genre => searchByGenre(genre, 15));
    const results = await Promise.allSettled(searches);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const album of result.value) {
          if (!seen.has(album.mbid)) {
            seen.add(album.mbid);
            allAlbums.push(album);
          }
        }
      }
    }

    if (batch + 3 < selectedGenres.length) {
      await new Promise(r => setTimeout(r, 1100));
    }
  }

  // Shuffle and take what we need
  const shuffled = allAlbums.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  const positions = generateGridPositions(selected.length);
  const items = selected.map((album, i) => albumToItem(album, i, positions[i]));

  const genreNames = [...new Set(selected.map(a => a.genre))];
  console.log(`Found ${items.length} album covers from: ${genreNames.join(', ')}`);
  return items;
};

/**
 * Search for albums matching a tag/keyword
 */
const searchAlbumsByTag = async (tag: string, count: number = 32): Promise<PortfolioItem[]> => {
  console.log(`Searching album covers for: "${tag}"`);

  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(tag)}&type=album&fmt=json&limit=${count}`,
      {
        headers: { 'User-Agent': APP_NAME, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const releaseGroups = data['release-groups'] || [];

    const albums: AlbumResult[] = releaseGroups.map((rg: Record<string, unknown>) => ({
      mbid: rg.id as string,
      artist: ((rg['artist-credit'] as Array<Record<string, unknown>>)?.[0]?.name as string) || 'Unknown Artist',
      title: (rg.title as string) || 'Untitled',
      year: ((rg['first-release-date'] as string)?.substring(0, 4)) || '',
      genre: tag,
    }));

    const selected = albums.slice(0, count);
    const positions = generateGridPositions(selected.length, true);
    const items = selected.map((album, i) => albumToItem(album, i, positions[i]));

    console.log(`Found ${items.length} album covers for "${tag}"`);
    return items;
  } catch (error) {
    console.error('Album cover search failed:', error);
    return [];
  }
};

export const albumCoversCollection: CollectionDefinition = {
  id: 'album-covers',
  name: 'Album Covers',
  description: 'Curated record sleeves from iconic labels',
  icon: 'AC',
  fetchItems: fetchAlbumCoverItems,
  searchByTag: searchAlbumsByTag,
};
