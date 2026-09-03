export type DisplayCategory =
  | "Posters & Prints"
  | "Physical Media"
  | "Lobby Cards & Press"
  | "Collectibles & Wearables"
  | "Model Kits"
  | "Magazines"
  | "Other";

// Order rows should render in when present
export const DISPLAY_CATEGORY_ORDER: DisplayCategory[] = [
  "Posters & Prints",
  "Physical Media",
  "Lobby Cards & Press",
  "Model Kits",
  "Magazines",
  "Collectibles & Wearables",
  "Other",
];

// Mirrors ItemType from getCuratedEbayItems.ts — kept as a plain string param
// to avoid a circular import between the two files.
export function getDisplayCategory(itemType: string): DisplayCategory {
  switch (itemType) {
    case "print":
      return "Posters & Prints";
    case "physical_media":
      return "Physical Media";
    case "lobby_card":
    case "press_kit":
    case "promo":
      return "Lobby Cards & Press";
    case "model_kit":
      return "Model Kits";
    case "magazine":
      return "Magazines";
    case "toy":
    case "apparel":
    case "prop":
      return "Collectibles & Wearables";
    default:
      return "Other";
  }
}