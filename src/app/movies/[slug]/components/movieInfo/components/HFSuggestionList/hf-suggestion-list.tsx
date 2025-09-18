import Image from "next/image";
import { HFSuggestionItem } from "@/app/services/huggingFaceAI";

interface HFSuggestionsListProps {
  suggestions: HFSuggestionItem[];
}

const HFSuggestionsList: React.FC<HFSuggestionsListProps> = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="hf-suggestions mt-6">
      <h2 className="text-xl font-bold mb-2">AI Suggested Movies</h2>
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          listStyle: "none",
          padding: 0,
        }}
      >
        {suggestions.map((s, index) => (
          <li
            key={s.title ?? index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 100,
            }}
          >
            {s.posterUrl ? (
              <Image
                src={s.posterUrl}
                alt={s.title}
                width={80}
                height={120}
                style={{ objectFit: "cover", borderRadius: "4px" }}
              />
            ) : (
              <div style={{ width: 80, height: 120, backgroundColor: "#ccc" }} />
            )}
            <span style={{ textAlign: "center", marginTop: 4 }}>
              {s.title} <br /> ({s.year})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HFSuggestionsList;
