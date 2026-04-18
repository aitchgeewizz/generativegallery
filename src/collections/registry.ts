import { CollectionDefinition } from './types';
import { artInstituteCollection } from './artInstitute';
import { cooperHewittCollection } from './cooperHewitt';
import { harvardCollection } from './harvard';
import { albumCoversCollection } from './albumCovers';

/**
 * Central registry of all available collections.
 * To add a new collection, create a file in src/collections/
 * that exports a CollectionDefinition, then import and add it here.
 */
export const collections: CollectionDefinition[] = [
  artInstituteCollection,
  cooperHewittCollection,
  harvardCollection,
  albumCoversCollection,
];

export const getCollection = (id: string): CollectionDefinition | undefined =>
  collections.find(c => c.id === id);

export const defaultCollectionId = collections[1].id; // Design collection
