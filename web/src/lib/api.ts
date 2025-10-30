import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000",
    timeout: 90000,
});

export type MetaResponse = {
    year_min: number | null;
    year_max: number | null;
    genres: string[];
    languages: string[];
};

export async function fetchMeta(): Promise<MetaResponse> {
    const { data } = await api.get<MetaResponse>("/meta");
    return data;
}

export type Trend = { slope: number | null; r2: number | null; n: number };

export type ScatterPointBudget = {
    id: number;
    title: string;
    year: number | null;
    budget: number | null;
    revenue: number | null;
    poster_path: string | null;
};

export type ScatterBudgetResponse = {
    points: ScatterPointBudget[];
    trend: Trend;
};

export async function fetchScatterBudget(params?: {
    ymin?: number;
    ymax?: number;
    genre?: string;
    limit?: number;
}) {
    const { data } = await api.get<ScatterBudgetResponse>("/scatter/budget-revenue", {
        params,
    });
    return data;
}

export type ScatterPointRating = {
    id: number;
    title: string;
    year: number | null;
    rating: number | null;
    revenue: number | null;
    poster_path: string | null;
};

export type ScatterRatingResponse = {
    points: ScatterPointRating[];
    trend: Trend;
    source: "tmdb" | "imdb";
};

export async function fetchScatterRating(params?: {
    ymin?: number;
    ymax?: number;
    genre?: string;
    limit?: number;
    source?: "tmdb" | "imdb";
}) {
    const { data } = await api.get<ScatterRatingResponse>("/scatter/rating-revenue", {
        params,
    });
    return data;

}
