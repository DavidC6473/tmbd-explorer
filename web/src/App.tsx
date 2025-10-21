import { useEffect, useState } from 'react'
import './App.css'
import { fetchMeta } from './lib/api';
import type { MetaResponse } from './lib/api';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl bg-white shadow-soft p-4'>
      <div className='text-xs uppercase text-slate-500'>{label}</div>
      <div className='text-xl font-semibold'>{value}</div>
    </div>
  );
}

export default function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMeta()
      .then((m) => setMeta(m))
      .catch((e) => setErr(e?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, []);

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
          <section className='grid grid-cols-2 md:grid-cold-4 gap-4'>
            <Stat label="Year Min" value={String(meta.year_min ?? "-")} />
            <Stat label="Year Max" value={String(meta.year_max ?? "-")} />
            <Stat label="Genres" value={String(meta.genres.length)} />
            <Stat label="Languages" value={String(meta.languages.length)} />
          </section>

          <section className='card'>
            <div className='card-title'>Charts</div>
            <p className='text-slate-600'>
              Placeholder
            </p>
          </section>
        </>
      )}
    </div>
  );
}
