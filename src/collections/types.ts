import { PortfolioItem } from '../types';

export interface CollectionDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  fetchItems: (count: number, signal?: AbortSignal) => Promise<PortfolioItem[]>;
  searchByTag: (tag: string, count: number, signal?: AbortSignal) => Promise<PortfolioItem[]>;
}
