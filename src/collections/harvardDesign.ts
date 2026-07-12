import { CollectionDefinition } from './types';
import { generateHarvardDesignItems, searchHarvardDesignItemsByTag } from '../data/harvardItems';

/**
 * Busch-Reisinger / Bauhaus design thread from Harvard Art Museums.
 * Registered so the mixed wall blends it in, but intentionally absent
 * from TopNav's SOURCE_OPTIONS — the Photography pill stays pure, and
 * this thread has no pill of its own.
 */
export const harvardDesignCollection: CollectionDefinition = {
  id: 'harvard-design',
  name: 'Bauhaus & Design',
  description: 'Harvard Art Museums — Busch-Reisinger design holdings',
  icon: 'BR',
  fetchItems: generateHarvardDesignItems,
  searchByTag: searchHarvardDesignItemsByTag,
};
