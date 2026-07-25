export interface PublicCreator {
  id: string;
  slug: string;
  handle: string;
  avatarPath?: string;
  avatarUrl?: string;
  /** Exact number of unique-browser visits to this creator's profile. */
  visitCount: number;
}

export interface ExploreCreatorsParams {
  query?: string;
  limit?: number;
}

export interface CreatorRepository {
  /** Lists creators for the explore page, optionally filtered by name or @. */
  searchExplore(params?: ExploreCreatorsParams): Promise<PublicCreator[]>;
}
