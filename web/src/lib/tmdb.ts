export function posterUrl(path: string | null | undefined, size: "w92" | "w154" | "w185" = "w92"){
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
}
