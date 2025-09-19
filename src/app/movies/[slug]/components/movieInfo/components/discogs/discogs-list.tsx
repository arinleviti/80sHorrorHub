import Image from "next/image";

export interface ReturnedResult {
  title: string;
  year: number | null;
  format: string[];
  thumb?: string;
  uri: string;
}

interface DiscogsListProps {
  results: ReturnedResult[] | null;
}

 export function DiscogsList({ results }: DiscogsListProps) {
  if (!results || results.length === 0) return <p>No results found.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {results.slice(0, 5).map((item, index) => (
        <li key={index} style={{ marginBottom: "1rem" }}>
          <a
            href={`https://www.discogs.com${item.uri}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}
          >
            {item.thumb && (
              <div style={{ position: "relative", width: 50, height: 50, marginRight: "0.5rem" }}>
                <Image
                  src={item.thumb}
                  alt={item.title}
                  fill
                  style={{ objectFit: "cover", borderRadius: "4px" }}
                  sizes="50px"
                />
              </div>
            )}
            <div>
              <div style={{ fontWeight: "bold" }}>{item.title}</div>
              {item.year && <div>Year: {item.year}</div>}
              {item.format.length > 0 && <div>Format: {item.format.join(", ")}</div>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}