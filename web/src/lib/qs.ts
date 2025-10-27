export type Filters = {
    genre?: string;
    ymin?: number;
    ymax?: number;
    limit?: number;
};

const toNum = (v: string | null | undefined): number | undefined => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export function parseFiltersFromQS(search: string): Partial<Filters> {
    const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const genre = sp.get("genre") || undefined;
    const ymin = toNum(sp.get("ymin"));
    const ymax = toNum(sp.get("ymax"));
    const limit = toNum(sp.get("limit"));
    
    const out: Partial<Filters> = {};
    if (genre) out.genre = genre;
    if (ymin !== undefined) out.ymin = ymin;
    if (ymax !== undefined) out.ymax = ymax;
    if (limit !== undefined) out.limit = limit;
    return out;
}

export function stringifyFiltersToQS(filters: Filters): string {
    const sp = new URLSearchParams();
    if (filters.genre) sp.set("genre", filters.genre);
    if (filters.ymin !== undefined) sp.set("ymin", String(filters.ymin));
    if (filters.ymax !== undefined) sp.set("ymax", String(filters.ymax));
    sp.set("limit", String(filters.limit));
    const s = sp.toString();
    return s;
}