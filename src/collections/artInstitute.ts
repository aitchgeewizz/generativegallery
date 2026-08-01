import { CollectionDefinition } from './types';
import { generateArtworkItems, searchArtworkItemsByTag } from '../data/placeholderItems';

export const artInstituteCollection: CollectionDefinition = {
  id: 'art-institute',
  lens: 'art',
  name: 'Fine Art',
  description: 'Art Institute of Chicago - Paintings & Fine Art',
  icon: 'FA',
  fetchItems: generateArtworkItems,
  searchByTag: searchArtworkItemsByTag,
};
