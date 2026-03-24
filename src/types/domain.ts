export interface Domain {
  id: string;
  domain: string;
  name: string;
  tld: string;
  length: number;
  has_numbers: boolean;
  is_number_only: boolean;
  has_hyphen: boolean;
  registrar: string;
  keywords: string[];
  created_at: string;
}

export interface FilterState {
  trendingOnly: boolean;
  tlds: string[];
  minLength: number;
  maxLength: number;
  numbers: 'any' | 'none' | 'only' | 'contains';
  hyphens: 'include' | 'exclude';
  keywords: string[];
  startsWith: string;
  endsWith: string;
  sortBy: 'created_at' | 'domain' | 'length';
  sortOrder: 'asc' | 'desc';
}
