import { CollectionDefinition } from './types';
import { generateDesignItems, searchDesignItemsByTag } from '../data/designItems';

export const cooperHewittCollection: CollectionDefinition = {
  id: 'met-design',
  lens: 'design',
  name: 'Design',
  description: 'Cooper Hewitt - Modern Design & Graphic Design',
  icon: 'DS',
  fetchItems: generateDesignItems,
  searchByTag: searchDesignItemsByTag,
};
