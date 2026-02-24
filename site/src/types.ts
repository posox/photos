export type PhotoItem = {
  slug: string;
  title: string;
  date: string | null;
  categories: string[];
  tags: string[];
  location: string;
  description: string;
  assetPath: string;
  imageUrl: string;
  webpUrl: string | null;
  width: number;
  height: number;
  aspectRatio: number;
};
