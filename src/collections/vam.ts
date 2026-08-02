import { CollectionDefinition } from './types';
import { generateVamItems, searchVamItemsByTag } from '../data/vamItems';

export const vamCollection: CollectionDefinition = {
  id: 'vam',
  lens: 'design',
  lensWeight: 0.75,
  name: 'Print & Pattern',
  description: 'Victoria and Albert Museum — Posters, Pattern & Printed Ephemera',
  icon: 'VA',
  fetchItems: generateVamItems,
  searchByTag: searchVamItemsByTag,
};
