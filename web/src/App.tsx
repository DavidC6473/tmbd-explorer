import { useEffect, useState } from 'react'
import './App.css'
import { fetchMeta } from './lib/api';
import type { MetaResponse } from './lib/api';
import FilterBar from './components/FilterBar';
import ScatterBudget from './components/ScatterBudget';
import ScatterRating from './components/ScatterRating';
import TopFilms from './components/TopFilms';
import { parseFiltersFromQS, stringifyFiltersToQS } from './lib/qs';

export default function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filters, setFilters] = useState<{ 
    genre?: string; ymin?: number; ymax?: number; limit: number 
  }>(() => {
    const fromQs = parseFiltersFromQS(window.location.search);
    return {
      genre: undefined,
      ymin: undefined,
      ymax: undefined,
      limit: 2000,
      ...fromQs,
    };
  });

  const srcFromQs = new URLSearchParams(window.location.search).get("source");
  const initialSource: "tmdb" | "imdb" = 
    srcFromQs === "tmdb" ? (srcFromQs as "tmdb" | "imdb") : "tmdb";
  const [ratingSource, setRatingSource] = useState<"tmdb" | "imdb">(initialSource);

  useEffect(() => {
    fetchMeta()
      .then((m) => setMeta(m))
      .catch((e) => setErr(e?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const qs = stringifyFiltersToQS(filters);
    const sp = new URLSearchParams(qs);

    sp.set("src", ratingSource);

  const nextUrl = `${window.location.pathname}${sp.toString() ? `?${sp}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);
}, [filters, ratingSource]);


  return (
    <div className='container-xl py-8 space-y-8'>
      <header className='flex items-center justify-between'>
        <h1 className='text-2xl md:text-3xl font-bold tracking-tight'>
          TMDB Explorer
        </h1>
        <div className='text-sm text-slate-600'>
          API: {import.meta.env.VITE_API_BASE}
        </div>
      </header>

      {loading && <div className='card'>Loading metadata...</div>}
      {err && <div className='card text-red-600'>Error: {err}</div>}

      {meta && (
        <>
          <section className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <Stat label="Year Min" value={String(meta.year_min ?? "-")} />
            <Stat label="Year Max" value={String(meta.year_max ?? "-")} />
            <Stat label="Genres" value={String(meta.genres.length)} />
            <Stat label="Languages" value={String(meta.languages.length)} />
          </section>

          <FilterBar meta={meta} value={filters} onChange={setFilters} />

          <section className="flex items-center gap-3">
            <label className="text-sm font-medium">Rating source</label>
            <select
              className="input"
              value={ratingSource}
              onChange={(e) => setRatingSource(e.target.value as "tmdb" | "imdb")}
            >
              <option value="tmdb">TMDB</option>
              <option value="imdb">IMDb</option>
            </select>
          </section>

          <ScatterBudget
            genre={filters.genre}
            ymin={filters.ymin}
            ymax={filters.ymax}
            limit={filters.limit}
          />

          <ScatterRating
            genre={filters.genre}
            ymin={filters.ymin}
            ymax={filters.ymax}
            limit={filters.limit}
            source={ratingSource}
          />

          <TopFilms
            genre={filters.genre}
            ymin={filters.ymin}
            ymax={filters.ymax}
            limit={filters.limit}
            source={ratingSource}
            sortBy="revenue"
            title="Top Grossing Films"
            count={12}
          />
          <TopFilms
            genre={filters.genre}
            ymin={filters.ymin}
            ymax={filters.ymax}
            limit={filters.limit}
            source={ratingSource}
            sortBy="rating"
            title={`Top Rated Films (${ratingSource.toUpperCase()})`}
            count={12}
          />
        </>
      )}
    </div>
  );
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="stat flex gap-2">
    <span className="font-semibold">{label}:</span>
    <span>{value}</span>
  </div>
);
