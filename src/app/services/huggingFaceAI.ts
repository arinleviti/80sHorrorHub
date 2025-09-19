

import { PrismaClient } from '../../generated/prisma/client';
const prisma = new PrismaClient();

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_MINUTE_MS = 1000 * 60; // 1 minute
const HUGGING_FACE_KEY = process.env.HUGGING_FACE_KEY;

export interface HFSuggestionItem {
  title: string;
  posterUrl?: string;
  year?: string;
  movieId?: string;
}
export interface HFChoiceMessage {
  role: string;
  content: string;
}

export interface HFChoice {
  index: number;
  finish_reason: string | null;
  message: HFChoiceMessage;
}

export interface HFApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: HFChoice[];
}
export interface HFApiResponseItem {
  generated_text: string;
}

interface HFDBSuggestionItem {
  title: string;
  year: string | undefined;
  posterUrl: string;
  movieId: string; // required because this comes from the DB
}

export async function getHFSuggestions(movieId: string, title: string, year: string): Promise<HFSuggestionItem[] | null> {
  console.log("HF API Key loaded:", HUGGING_FACE_KEY?.slice(0, 5) + "…"); // ✅ check if key is loaded
  //check if we have it cached
  const cached = await prisma.hFSuggestion.findUnique({
    where: { movieId },
    include: { suggestions: true },
  });
  if (cached && cached.suggestions.length > 0 && (Date.now() - cached.updatedAt.getTime() < ONE_DAY_MS)) {
    console.log("✅ Using cached suggestions for movieId:", movieId);
    console.log("Cached suggestions:", cached.suggestions.map(s => ({ title: s.title, releaseDate: s.releaseDate, posterPath: s.posterPath })));
    return cached.suggestions.map(s => ({
      title: s.title,
      posterUrl: s.imagekitPosterPath || undefined,
      year: s.releaseDate || undefined,
      movieId: s.id || undefined,
    }));
  }
  //fetch from hugging face API
  console.log("ℹ️ No valid cache found. Fetching from Hugging Face...");
  let apiResponse: HFApiResponse;
  try {
    apiResponse = await fetchHFSuggestions(title, year);
    console.log("🤖 Hugging Face API response:", JSON.stringify(apiResponse, null, 2));
  } catch (err) {
    console.error("Failed to fetch Hugging Face API response:", err);
    return null;
  }
  let suggestions: HFSuggestionItem[] = [];
  if (apiResponse.choices?.length > 0) {
    //Inside content, the model has written what looks like JSON
    //To JavaScript/TypeScript, it’s just a normal string containing brackets, braces, quotes, and commas.
    //That’s why you need JSON.parse(rawText) — to turn the string into a usable JavaScript array of objects.
    const rawText = apiResponse.choices[0].message.content.trim();

    // ✅ ADDED: normalize year to string to avoid invalid type issues
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        suggestions = parsed.map(item => ({
          title: item.title,
          year: item.year != null ? String(item.year) : undefined, // ✅ normalize number -> string
        }));
        console.log("✅ Parsed and normalized HF suggestions:", suggestions);
      } else {
        console.warn("⚠️ Hugging Face returned invalid structure (not an array). Falling back to cache.");
      }
    } catch {
      console.warn("⚠️ Hugging Face returned unparsable JSON. Falling back to cache if available.");
    }
  
}
 // ---------- FALLBACK TO CACHE IF AI FAILED ----------
 if (suggestions.length === 0 && cached && cached.suggestions.length >0) {
  console.log("✅ Falling back to cached suggestions due to AI output failure.");
  return cached.suggestions.map( s => ({
    title: s.title,
    posterUrl: s.imagekitPosterPath || undefined,
    year: s.releaseDate || undefined,
    movieId: s.id || undefined,
  }));
 }
 if (suggestions.length === 0) {
    console.warn("⚠️ No suggestions available (AI failed and no cache). Returning null.");
    return null;
  }

// After parsing HuggingFace output into `suggestions: HFSuggestionItem[]`
// matchedMovies is a collections of objects of type {id: string} | null
// where id is the matched movie's id in our database
// if no match, the entry is null
const matchedMovies = await Promise.all(
  suggestions.map(async (s) => {
    const match = await prisma.movie.findFirst({
      where: { title: s.title },  // <-- filter condition
      //Only give me these fields back
      select: {
        id: true,
        title: true,
        releaseDate: true,
        imagekitPosterPath: true,
      },
    });
    return match ? {
      id: match.id,
      title: match.title,
      releaseDate: match.releaseDate,
      imagekitPosterPath: match.imagekitPosterPath,
    } : null;
  })
);
// Filter out nulls from matchedMovies to get an array of objects of type {id: string}
//If m !== null, then you can safely treat m as having this shape: { id, title, releaseDate, imagekitPosterPath }."
const connects = matchedMovies.filter((m): m is { id: string, title: string, releaseDate: string, imagekitPosterPath: string } => m !== null);

const dbSuggestions: HFDBSuggestionItem[] = suggestions
  .map(s => {
    const match = connects.find(m => m.title === s.title);
    if (!match) return null; // skip if movie not in DB
    return {
      title: s.title,
      year: s.year,
      posterUrl: match.imagekitPosterPath,
      movieId: match.id,
    };
  })
  .filter((s): s is HFDBSuggestionItem => s !== null)
  .filter(s => s.movieId !== movieId); // remove the original movie

console.log("✅ Final suggestions (DB only):", dbSuggestions);
// Upsert into DB
await prisma.hFSuggestion.upsert({
  where: { movieId },
  update: {
    updatedAt: new Date(),
    suggestions: {
      //clears existing suggestions
      set: [],
      //connect: [{ id: 'movie1' }, { id: 'movie2' }]
      //connect = “take these existing Movies by ID and link them to this HFSuggestion via the join table.”
      connect: connects,
    },
  },
  create: {
    movieId,
    createdAt: new Date(),
    suggestions: { connect: connects },
  },
});

return dbSuggestions;
}


async function fetchHFSuggestions(movieTitle: string, year: string) {
  const yearString = parseInt(year) ? year : "unknown year";
  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGING_FACE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: [
          {
            role: "user",
            content: `Suggest exactly 5 horror movies released between 1975 and 1995 that are similar in tone, style, and themes to "${movieTitle}" (${yearString}).
Return your answer as a valid JSON array with 5 objects.
Each object must have two fields: "title" (string) and "year" (string).
Do not include any extra text or explanation.`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    }
  );
  const result = await response.json();
  return result;
}

function isHFSuggestionItemArray(data: unknown): data is HFSuggestionItem[] {
  return Array.isArray(data) &&
    data.every(item =>
      typeof item.title === "string" &&
      (typeof item.posterUrl === "string" || item.posterUrl === undefined) &&
      (typeof item.year === "string" || item.year === undefined) &&
      (typeof item.movieId === "string" || item.movieId === undefined)
    );
}