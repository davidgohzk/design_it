export type LandingSlide = {
  problem: string;
  country: string;
  image: string;
  alt: string;
  backgroundPosition?: string;
  introColor: string;
  verbColor: string;
  problemColor: string;
  countryColor: string;
};

export const LANDING_SLIDES: LandingSlide[] = [
  {
    problem: "clean water accessibility",
    country: "the Philippines",
    image: "https://images.unsplash.com/photo-1763838830585-3f9868063d84?auto=format&fit=crop&w=1800&q=80",
    alt: "Riverside informal settlement in the Philippines",
    backgroundPosition: "center",
    introColor: "#ffffff",
    verbColor: "#FCD116",
    problemColor: "#CE1126",
    countryColor: "#0038A8",
  },
  {
    problem: "environment conservation",
    country: "Thailand",
    image: "https://images.unsplash.com/photo-1551350952-b53990fa38b4?auto=format&fit=crop&w=1800&q=80",
    alt: "Elephants near water in Thailand",
    backgroundPosition: "center",
    introColor: "#ffffff",
    verbColor: "#A51931",
    problemColor: "#FFFFFF",
    countryColor: "#24408E",
  },
  {
    problem: "children's literacy",
    country: "Indonesia",
    image: "https://images.unsplash.com/photo-1644997933069-f5ede7b207ac?auto=format&fit=crop&w=1800&q=80",
    alt: "Empty classroom with desks and chalkboard",
    backgroundPosition: "center",
    introColor: "#ffffff",
    verbColor: "#CE1126",
    problemColor: "#FFFFFF",
    countryColor: "#CE1126",
  },
];

/** Where a slide sits relative to the active one: 0 active, 1 next, -1 any other. */
export const getLandingOffset = (index: number, activeIndex: number, total: number) => {
  const diff = (index - activeIndex + total) % total;
  if (diff === 0) return 0;
  if (diff === 1) return 1;
  return -1;
};
