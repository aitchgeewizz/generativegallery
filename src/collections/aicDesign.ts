import { CollectionDefinition } from './types';
import { generateAicDesignItems, searchAicDesignItemsByTag } from '../data/aicDesignItems';

/**
 * Art Institute of Chicago's graphic-design holdings — posters, design
 * books, magazines and the "graphic design" classification, in or out
 * of copyright (in-copyright works are shown at AIC's 843px ceiling).
 * Hangs under the Design lens; the fine-art AIC door stays on Art.
 */
export const aicDesignCollection: CollectionDefinition = {
  id: 'aic-design',
  lens: 'design',
  lensWeight: 0.7,
  name: 'Posters & Print',
  description: 'Art Institute of Chicago — Graphic design, posters & design books',
  icon: 'AD',
  fetchItems: generateAicDesignItems,
  searchByTag: searchAicDesignItemsByTag,
};
