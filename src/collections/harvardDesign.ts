import { CollectionDefinition } from './types';
import { generateHarvardDesignItems, searchHarvardDesignItemsByTag } from '../data/harvardItems';

/**
 * Busch-Reisinger / Bauhaus design thread from Harvard Art Museums.
 * Hangs under the Design lens alongside Cooper Hewitt and the V&A —
 * the Photo pill stays pure photography.
 */
export const harvardDesignCollection: CollectionDefinition = {
  id: 'harvard-design',
  lens: 'design',
  name: 'Bauhaus & Design',
  description: 'Harvard Art Museums — Busch-Reisinger design holdings',
  icon: 'BR',
  fetchItems: generateHarvardDesignItems,
  searchByTag: searchHarvardDesignItemsByTag,
};
