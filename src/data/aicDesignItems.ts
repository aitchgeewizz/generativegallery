import { PortfolioItem } from '../types';
import {
  ArtworkData,
  fetchAicDesignWorks,
  searchAicDesignByTag,
  getImageUrl,
  AIC_TILE_SIZE,
  AIC_DETAIL_SIZE,
  AIC_FALLBACK_SIZE,
} from '../services/artInstituteApi';

/** Grid positions, 8 per row — same layout as the other adapters. */
const generateGridPositions = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    x: (i % 8) * 300,
    y: Math.floor(i / 8) * 300,
  }));

/**
 * In-copyright works never ask for more than 843px — the stage and its
 * fallback are the same image. Public-domain works keep the 1686 stage.
 */
const convertAicDesignWork = (
  artwork: ArtworkData,
  position: { x: number; y: number },
  index: number,
): PortfolioItem => {
  const stageSize = artwork.is_public_domain ? AIC_DETAIL_SIZE : AIC_FALLBACK_SIZE;
  return {
    id: index,
    x: position.x,
    y: position.y,
    title: artwork.title,
    description: artwork.artist_display,
    imageUrl: getImageUrl(artwork.image_id, stageSize),
    thumbnailUrl: getImageUrl(artwork.image_id, AIC_TILE_SIZE),
    fallbackUrl: getImageUrl(artwork.image_id, AIC_FALLBACK_SIZE),
    lqip: artwork.thumbnail?.lqip,
    imageWidth: artwork.thumbnail?.width,
    imageHeight: artwork.thumbnail?.height,
    collectionSource: 'Art Institute of Chicago',
    url: `https://www.artic.edu/artworks/${artwork.id}`,
    date: artwork.date_display,
    shortDescription: artwork.short_description || artwork.description,
    medium: artwork.medium_display,
    dimensions: artwork.dimensions,
    creditLine: artwork.credit_line,
    styleTitles: artwork.style_titles,
    classificationTitles: artwork.classification_titles,
    subjectTitles: artwork.subject_titles,
    themeTitles: artwork.theme_titles,
    copyrightStatus: artwork.is_public_domain ? 'public_domain' : 'in_copyright',
  };
};

export const generateAicDesignItems = async (
  count: number = 8,
  signal?: AbortSignal,
): Promise<PortfolioItem[]> => {
  const works = await fetchAicDesignWorks(count, signal);
  const positions = generateGridPositions(works.length);
  return works.map((w, i) => convertAicDesignWork(w, positions[i], i));
};

export const searchAicDesignItemsByTag = async (
  tag: string,
  count: number = 12,
): Promise<PortfolioItem[]> => {
  const works = await searchAicDesignByTag(tag, count);
  const positions = generateGridPositions(works.length);
  return works.map((w, i) => convertAicDesignWork(w, positions[i], i));
};
