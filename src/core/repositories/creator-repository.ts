export interface PublicCreator {
  id: string;
  slug: string;
  handle: string;
  avatarPath?: string;
  avatarUrl?: string;
}

export interface ExploreCreatorsParams {
  query?: string;
  limit?: number;
}

export interface CreatorRepository {
  /** Lists creators for the explore page, optionally filtered by name or @. */
  searchExplore(params?: ExploreCreatorsParams): Promise<PublicCreator[]>;
}
