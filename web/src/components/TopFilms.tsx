import { useEffect, useMemo, useState } from "react";
import { fetchScatterRating, type ScatterRatingResponse } from "../lib/api";
import { posterUrl } from "../lib/tmdb";

type Props = {
  genre?: string;
  ymin?: number;
  ymax?: number;
  limit?: number;
  source?: "tmdb" | "imdb";
  sortBy: "revenue" | "rating";
  count?: number; // how many cards to show
  title?: string;
};

const currency = (n: number | null | undefined) =>
  n ? "$" + n.toLocaleString() : "—";

export default function TopFilms({
  genre,
  ymin,
  ymax,
  limit = 2000,
  source = "tmdb",
  sortBy,
  count = 12,
  title,
}: Props) {
  const [resp, setResp] = useState<ScatterRatingResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetchScatterRating({ genre, ymin, ymax, limit, source })
      .then(setResp)
      .catch((e) => setErr(e?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, [genre, ymin, ymax, limit, source]);

  const items = useMemo(() => {
    const pts = resp?.points ?? [];
    const sorted = [...pts].sort((a, b) => {
      if (sortBy === "revenue") {
        return (b.revenue ?? 0) - (a.revenue ?? 0);
      }
      // rating
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return sorted.slice(0, count);
  }, [resp, sortBy, count]);

  return (
    <section className="card">
      <div className="card-title">
        {title ?? (sortBy === "revenue" ? "Top by Revenue" : "Top by Rating")}
      </div>
      {err && <div className="text-red-600 mb-3">Error: {err}</div>}
      {loading && <div className="text-slate-600">Loading…</div>}
      {!loading && !items.length && (
        <div className="text-slate-600">No films for this filter.</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((p, i) => {
          const poster = posterUrl(p.poster_path, "w185");
          return (
            <div key={p.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              {poster ? (
                <img
                  src={poster}
                  alt={p.title}
                  className="w-full h-56 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-56 bg-slate-100" />
              )}
              <div className="p-3 space-y-1">
                <div className="text-sm font-semibold line-clamp-2">
                  {i + 1}. {p.title} {p.year ? `(${p.year})` : ""}
                </div>
                <div className="text-xs text-slate-600">
                  Revenue: {currency(p.revenue)}{sortBy === "revenue" ? " • Top" : ""}
                </div>
                <div className="text-xs text-slate-600">
                  Rating: {p.rating != null ? p.rating.toFixed(1) : "—"}
                  {sortBy === "rating" ? " • Top" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
