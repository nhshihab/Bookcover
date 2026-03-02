
export enum TrimSize {
  SIZE_5_8 = "5x8",
  SIZE_55_85 = "5.5x8.5",
  SIZE_6_9 = "6x9",
  SIZE_85_11 = "8.5x11"
}

export enum Genre {
  ROMANCE = "Romance",
  THRILLER = "Thriller",
  SCIFI = "Sci-Fi",
  FANTASY = "Fantasy",
  HORROR = "Horror",
  HISTORY = "History",
  NON_FICTION = "Non-Fiction",
  MYSTERY = "Mystery",
  LITERARY = "Literary"
}

export interface BookConfig {
  trimSize: TrimSize;
  pageCount: number;
  title: string;
  subtitle: string;
  author: string;
  blurb: string;
  genre: Genre;
  fontFamily: string;
  spineFontFamily: string;
  fontStyle: 'Serif' | 'Sans-Serif' | 'Capitals';
  mainColor: string;
  accentColor: string;
  aiPrompt: string;
  generatedImageUrl?: string;
}

export const TRIM_DIMENSIONS = {
  [TrimSize.SIZE_5_8]: { w: 5, h: 8 },
  [TrimSize.SIZE_55_85]: { w: 5.5, h: 8.5 },
  [TrimSize.SIZE_6_9]: { w: 6, h: 9 },
  [TrimSize.SIZE_85_11]: { w: 8.5, h: 11 },
};

export const GENRE_FONTS: Record<Genre, string[]> = {
  [Genre.ROMANCE]: ['Great Vibes', 'Playfair Display', 'Crimson Text'],
  [Genre.THRILLER]: ['Montserrat', 'Bebas Neue', 'Special Elite'],
  [Genre.SCIFI]: ['Orbitron', 'Montserrat', 'Bebas Neue'],
  [Genre.FANTASY]: ['Cinzel', 'Playfair Display', 'Libre Baskerville'],
  [Genre.HORROR]: ['Special Elite', 'Crimson Text', 'Cinzel'],
  [Genre.HISTORY]: ['Libre Baskerville', 'Crimson Text', 'Playfair Display'],
  [Genre.NON_FICTION]: ['Montserrat', 'Libre Baskerville', 'Crimson Text'],
  [Genre.MYSTERY]: ['Special Elite', 'Playfair Display', 'Cinzel'],
  [Genre.LITERARY]: ['Crimson Text', 'Playfair Display', 'Libre Baskerville'],
};
