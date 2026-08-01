import { PortfolioItem } from '../types';

/**
 * Curatorial lens a collection hangs under. Lenses are how visitors
 * browse (Design / Art / Photo pills); collections are where works
 * come from. Many collections can feed one lens — new archives join
 * an existing lens rather than adding navigation.
 */
export type Lens = 'design' | 'art' | 'photo';

export interface CollectionDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  lens: Lens;
  fetchItems: (count: number, signal?: AbortSignal) => Promise<PortfolioItem[]>;
  searchByTag: (tag: string, count: number, signal?: AbortSignal) => Promise<PortfolioItem[]>;
}
