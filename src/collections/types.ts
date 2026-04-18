import { PortfolioItem } from '../types';

export interface CollectionDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  fetchItems: (count: number) => Promise<PortfolioItem[]>;
  searchByTag: (tag: string, count: number) => Promise<PortfolioItem[]>;
}
