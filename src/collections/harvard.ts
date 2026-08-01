import { CollectionDefinition } from './types';
import { generateHarvardItems, searchHarvardItemsByTag } from '../data/harvardItems';

export const harvardCollection: CollectionDefinition = {
  id: 'harvard',
  lens: 'photo',
  name: 'Photography',
  description: 'Harvard Art Museums \u2014 Photography Collection',
  icon: 'PH',
  fetchItems: generateHarvardItems,
  searchByTag: searchHarvardItemsByTag,
};
