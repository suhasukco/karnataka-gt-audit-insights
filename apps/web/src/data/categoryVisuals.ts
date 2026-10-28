// Visual identity for the 22 censused categories.
//
// The NUMBERS for these categories are never stored here — availability and SKU
// depth come live from `/api/categories/availability`. This file only carries
// presentation (a colour pair, four glyphs for the card mosaic, and a plain
// descriptive line), keyed by the exact `category_name` the API returns.
//
// Adding real product photography later: give an entry a `photos: string[4]` of
// image URLs and the card will use them in place of the glyph tiles.

export interface CategoryVisual {
  /** Gradient start — also the accent used for the active card's backdrop. */
  c1: string;
  /** Gradient end. */
  c2: string;
  /** Four glyphs, one per mosaic tile. */
  tiles: [string, string, string, string];
  /** Plain description of what the category contains. No statistics. */
  blurb: string;
  photos?: string[];
}

export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  "Branded Staple": {
    c1: "#FFCA28",
    c2: "#F57F17",
    tiles: ["🌾", "🍚", "🫘", "📦"],
    blurb: "Packaged everyday staples carrying a brand name.",
  },
  "Atta Flour": {
    c1: "#F2C14E",
    c2: "#9A6212",
    tiles: ["🌾", "🫓", "🥖", "🥣"],
    blurb: "Wheat and milled flours — the base of the daily meal.",
  },
  "Dal Pulses": {
    c1: "#A3B565",
    c2: "#4C6317",
    tiles: ["🫘", "🍲", "🥣", "🌱"],
    blurb: "Lentils and pulses, sold loose and packaged.",
  },
  Rice: {
    c1: "#D7CCC8",
    c2: "#6D4C41",
    tiles: ["🍚", "🌾", "🍛", "🥡"],
    blurb: "The staple grain, from everyday to premium varieties.",
  },
  "Dry Fruits": {
    c1: "#C67C4E",
    c2: "#6D3B12",
    tiles: ["🌰", "🥜", "🍇", "🥥"],
    blurb: "Nuts and dried fruit, usually bought in small quantities.",
  },
  Papad: {
    c1: "#F0C987",
    c2: "#A05A2C",
    tiles: ["🫓", "🍽️", "🔥", "🧂"],
    blurb: "Sun-dried crisps, an accompaniment on most plates.",
  },
  "Fruit Juice": {
    c1: "#FF8A3D",
    c2: "#C43E00",
    tiles: ["🧃", "🍊", "🍹", "🍎"],
    blurb: "Packaged juices and fruit-based drinks.",
  },
  "Masala Mix": {
    c1: "#EF5350",
    c2: "#B71C1C",
    tiles: ["🌶️", "🧂", "🍛", "🥄"],
    blurb: "Blended spice mixes for named dishes.",
  },
  Snacks: {
    c1: "#FFA726",
    c2: "#E65100",
    tiles: ["🍟", "🍪", "🍿", "🥨"],
    blurb: "Chips, namkeen and biscuits — the fastest-moving shelf.",
  },
  "Spreads & Sauces": {
    c1: "#D81B60",
    c2: "#6A1B4A",
    tiles: ["🍅", "🍯", "🥫", "🍓"],
    blurb: "Ketchups, jams and table sauces.",
  },
  Beverages: {
    c1: "#29B6F6",
    c2: "#0277BD",
    tiles: ["🥤", "🧋", "🫧", "☕"],
    blurb: "Soft drinks, energy drinks and packaged water.",
  },
  Egg: {
    c1: "#FFD166",
    c2: "#B07400",
    tiles: ["🥚", "🍳", "🧺", "🐣"],
    blurb: "Loose and trayed eggs — a daily-purchase protein.",
  },
  "Health Mix": {
    c1: "#66BB6A",
    c2: "#2E7D32",
    tiles: ["🥣", "🌱", "🥛", "💪"],
    blurb: "Malted and nutritional drink mixes.",
  },
  Stationery: {
    c1: "#AB47BC",
    c2: "#4A148C",
    tiles: ["🖊️", "📒", "✏️", "📎"],
    blurb: "Pens, notebooks and school supplies.",
  },
  "Personal Care": {
    c1: "#F06292",
    c2: "#AD1457",
    tiles: ["🧼", "🧴", "🪥", "🌸"],
    blurb: "Soap, shampoo, oral care and grooming.",
  },
  "Home Care": {
    c1: "#26C6DA",
    c2: "#00838F",
    tiles: ["🧺", "🧽", "🧹", "🦟"],
    blurb: "Detergents, cleaners and household hygiene.",
  },
  "Frozen Food": {
    c1: "#80DEEA",
    c2: "#0097A7",
    tiles: ["🧊", "🍦", "🥟", "🫛"],
    blurb: "Frozen snacks, vegetables and desserts — cold-chain dependent.",
  },
  Vegetables: {
    c1: "#9CCC65",
    c2: "#558B2F",
    tiles: ["🍅", "🥬", "🥕", "🧅"],
    blurb: "Fresh produce, sourced and sold daily.",
  },
  "Pooja Category": {
    c1: "#FFB300",
    c2: "#6A1B9A",
    tiles: ["🪔", "🕯️", "🌼", "🔥"],
    blurb: "Agarbatti, camphor, lamp oil and prayer-room essentials.",
  },
  "Ready to Cook": {
    c1: "#FF7043",
    c2: "#BF360C",
    tiles: ["🍜", "🍝", "🥣", "🍛"],
    blurb: "Instant mixes and batters that shorten cooking.",
  },
  "Milk Products": {
    c1: "#9FA8DA",
    c2: "#3949AB",
    tiles: ["🥛", "🧀", "🧈", "🥣"],
    blurb: "Milk, curd, butter and paneer.",
  },
  "OTC Products": {
    c1: "#5C6BC0",
    c2: "#283593",
    tiles: ["💊", "🩹", "🧪", "🤧"],
    blurb: "Over-the-counter relief and everyday medicine.",
  },
};

/** Neutral identity so a category the API adds later still renders. */
export const FALLBACK_VISUAL: CategoryVisual = {
  c1: "#94A3B8",
  c2: "#334155",
  tiles: ["📦", "🏷️", "🛒", "📊"],
  blurb: "Tracked in the field census.",
};
