import { useEffect, useMemo, useState } from "react";
import type { MetaResponse } from "../lib/api";

type Props = {
    meta: MetaResponse;
    value: { genre?: string; ymin?: number; ymax?: number; limit: number };
    onChange: (next: { genre?: string; ymin?: number; ymax?: number; limit: number }) => void;
};

export default function FilterBar({ meta, value, onChange }: Props) {
    const [genre, setGenre] = useState<string | undefined>(value.genre);
    const [ymin, setYmin] = useState<number | undefined>(value.ymin ?? meta.year_min ?? undefined);
    const [ymax, setYmax] = useState<number | undefined>(value.ymax ?? meta.year_max ?? undefined);
    const [limit, setLimit] = useState<number>(value.limit);

    const years = useMemo(() => ({
        min: meta.year_min ?? 1900,
        max: meta.year_max ?? new Date().getFullYear(),
    }), [meta]);

    useEffect(() => {
        onChange({ genre, ymin, ymax, limit });
    }, [genre, ymin, ymax, limit, onChange]);

    return (
        <div className="card grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <div className="text-xs text-slate-500 mb-1">Genre</div>
                <select className="w-full border rounded-xl px-3 py-2" value={genre ?? ""} onChange={(e) => setGenre(e.target.value || undefined)}>
                    <option value="">All genres</option>
                    {meta.genres.map((g) => (
                        <option key={g}>{g}</option>
                    ))}
                </select>
            </div>

            <div>
                <div className="text-xs text-slate-500 mb-1">Year min</div>
                <input type="number" className="w-full border rounded-xl px-3 py-2" min={years.min} max={years.max} value={ymin ??""} onChange={(e) => setYmin(e.target.value ? Number(e.target.value) : undefined)}/>
            </div>

            <div>
                <div className="text-xs text-slate-500 mb-1">Year max</div>
                <input type="number" className="w-full border rounded-xl px-3 py-2" min={years.min} max={years.max} value={ymax ??""} onChange={(e) => setYmax(e.target.value ? Number(e.target.value) : undefined)}/>                
            </div>

            <div>
                <div className="text-xs text-slate-500 mb-1">Limit</div>
                    <select className="w-full border rounded-xl px-3 py-2" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                        {[500, 1000, 2000, 5000, 10000, 20000].map((n) => (
                            <option
                                key={n} value={n}>{n.toLocaleString()}
                            </option>))}
                    </select>
            </div>
        </div>
    )
}