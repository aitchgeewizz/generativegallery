import { useState, useCallback } from 'react';
import { PortfolioItem } from '../types';
import { extractArtistName } from '../utils/tagExtractor';
import {
  fetchArtistInfo,
  fetchArtworkContext,
  fetchRelatedWorks,
  ArtistInfo,
  ArtworkContext,
  RelatedWork,
} from '../services/enrichmentApi';

interface EnrichmentState {
  // Artist
  artistInfo: ArtistInfo | null;
  artistLoading: boolean;
  artistError: boolean;
  artistFetched: boolean;

  // Artwork
  artworkContext: ArtworkContext | null;
  artworkLoading: boolean;
  artworkError: boolean;
  artworkFetched: boolean;

  // Related works
  relatedWorks: RelatedWork[];
  relatedLoading: boolean;
  relatedError: boolean;
  relatedFetched: boolean;
}

const initialState: EnrichmentState = {
  artistInfo: null,
  artistLoading: false,
  artistError: false,
  artistFetched: false,
  artworkContext: null,
  artworkLoading: false,
  artworkError: false,
  artworkFetched: false,
  relatedWorks: [],
  relatedLoading: false,
  relatedError: false,
  relatedFetched: false,
};

/**
 * Hook for on-demand enrichment data fetching
 * Each fetch function is called manually (not automatically)
 * Results are cached in the enrichment service layer
 */
export const useEnrichment = (item: PortfolioItem | null) => {
  const [state, setState] = useState<EnrichmentState>(initialState);

  const artistName = item ? extractArtistName(item) : null;

  const loadArtistInfo = useCallback(async () => {
    if (!artistName || state.artistFetched) return;

    setState(s => ({ ...s, artistLoading: true, artistError: false }));

    try {
      const info = await fetchArtistInfo(artistName);
      setState(s => ({
        ...s,
        artistInfo: info,
        artistLoading: false,
        artistFetched: true,
      }));
    } catch {
      setState(s => ({
        ...s,
        artistLoading: false,
        artistError: true,
        artistFetched: true,
      }));
    }
  }, [artistName, state.artistFetched]);

  const loadArtworkContext = useCallback(async () => {
    if (!item || state.artworkFetched) return;

    setState(s => ({ ...s, artworkLoading: true, artworkError: false }));

    try {
      const context = await fetchArtworkContext(item.title, artistName || undefined);
      setState(s => ({
        ...s,
        artworkContext: context,
        artworkLoading: false,
        artworkFetched: true,
      }));
    } catch {
      setState(s => ({
        ...s,
        artworkLoading: false,
        artworkError: true,
        artworkFetched: true,
      }));
    }
  }, [item, artistName, state.artworkFetched]);

  const loadRelatedWorks = useCallback(async () => {
    if (!item || !artistName || state.relatedFetched) return;

    setState(s => ({ ...s, relatedLoading: true, relatedError: false }));

    try {
      const works = await fetchRelatedWorks(artistName, item.collectionSource, item.id);
      setState(s => ({
        ...s,
        relatedWorks: works,
        relatedLoading: false,
        relatedFetched: true,
      }));
    } catch {
      setState(s => ({
        ...s,
        relatedLoading: false,
        relatedError: true,
        relatedFetched: true,
      }));
    }
  }, [item, artistName, state.relatedFetched]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    artistName,
    ...state,
    loadArtistInfo,
    loadArtworkContext,
    loadRelatedWorks,
    reset,
  };
};
