export interface ConsumetEpisode {
  id: string;
  title: string;
  image: string;
  imageHash: string;
  number: number;
  createdAt?: string;
  description: string;
  url: string;
}

export interface EpisodeInfo extends ConsumetEpisode {
  dub: boolean;
  animeId: string;
  providers: string;
}

export type AnimeStatus = "RELEASING" | "FINISHED" | "NOT_YET_RELEASED";

export interface AnimeInfo {
  id: string;
  title: string;
  status: AnimeStatus;
  totalEps: number;
}
