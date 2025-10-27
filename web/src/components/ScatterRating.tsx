import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { fetchScatterRating, type ScatterRatingResponse } from "../lib/api";
import { posterUrl } from "../lib/tmdb";

type Props = {
  genre?: string;
  ymin?: number;
  ymax?: number;
  limit?: number;
  source?: "tmdb" | "imdb";
};

export default function ScatterRating({ genre, ymin, ymax, limit, source }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const [data, setData] = useState<ScatterRatingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetchScatterRating({ genre, ymin, ymax, limit, source })
      .then(setData)
      .catch((e) => setErr(e?.message ?? "Error"))
      .finally(() => setLoading(false));
  }, [genre, ymin, ymax, limit, source]);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = echarts.init(ref.current);
    const dispose = () => chartRef.current?.dispose();
    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      dispose();
    };
  }, []);

  const handleExport = () => {
    if (!chartRef.current) return;
    const dataURL = chartRef.current.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff",
    });
    const slug = `${source ?? "tmdb"}-${genre ? genre.replace(/\s+/g, "-").toLowerCase() : "all"}`;
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `rating-vs-revenue_${slug}.png`;
    a.click();
  };

  const option = useMemo(() => {
    const pts = data?.points ?? [];

    const seriesData = pts.map((p) => ({
      value: [p.rating ?? 0, Math.max(1, p.revenue ?? 1)] as [number, number],
      name: p.title,
      year: p.year,
      poster: posterUrl(p.poster_path, "w92"),
    }));

    const r2 = data?.trend?.r2 ?? null;
    const slope = data?.trend?.slope ?? null;
    const n = data?.trend?.n ?? 0;
    const ratingSource = (source ?? "tmdb").toUpperCase();

    const opt = {
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (params: { data?: { poster?: string | null; year?: number | null }; name?: string; value: [number, number] }) => {
          const poster: string | undefined = params.data?.poster ?? undefined;
          const title: string = params.name ?? "";
          const year: number | string | null = params.data?.year ?? "";
          const [rating, rev] = params.value as [number, number];
          const revenue = rev.toLocaleString();
          const img = poster
            ? `<img src="${poster}" style="width:46px;height:auto;border-radius:6px;margin-right:8px;object-fit:cover;" />`
            : "";
          return `
            <div style="display:flex;align-items:flex-start;">
              ${img}
              <div>
                <div style="font-weight:600;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${title} ${year ? `(${year})` : ""}
                </div>
                <div style="opacity:.8">Rating: ${rating.toFixed(1)}</div>
                <div style="opacity:.8">Revenue: $${revenue}</div>
              </div>
            </div>
          `;
        },
      },
      grid: { left: 60, right: 20, top: 20, bottom: 50 },
      xAxis: {
        type: "value",
        min: 0,
        max: 10,
        name: `${ratingSource} Rating (0–10)`,
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: { formatter: (v: number) => v.toFixed(1) },
      },
      yAxis: {
        type: "log",
        logBase: 10,
        min: 1,
        name: "Revenue (USD, log)",
        nameLocation: "middle",
        nameGap: 40,
        axisLabel: { formatter: (v: number) => "$" + v.toLocaleString() },
      },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: "none" },
          restore: {},
          saveAsImage: {},
        },
        right: 10,
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "inside", yAxisIndex: 0 },
        { type: "slider", xAxisIndex: 0, bottom: 0 },
      ],
      series: [
        {
          type: "scatter",
          symbolSize: 8,
          data: seriesData,
          emphasis: { focus: "series" },
          animation: false,
        },
      ],
      title: {
        text: `Rating vs Revenue ${genre ? `— ${genre}` : ""}`,
        left: "center",
        top: 0,
        textStyle: { fontSize: 14, fontWeight: 600 },
        subtext:
          r2 != null && slope != null
            ? `Trend R²=${r2.toFixed(2)}, slope=${slope.toFixed(2)}, n=${n.toLocaleString()}`
            : `n=${n.toLocaleString()}`,
        subtextStyle: { color: "#64748b" },
      },
    };

    // Important: cast through unknown to satisfy TS2352 on ECharts unions
    return opt as unknown as echarts.EChartsOption;
  }, [data, genre, source]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true });
    }
  }, [option]);

  return (
    <section className="card">
      <div className="card-title flex items-center justify-between">
        <span>Rating vs Revenue</span>
        <button className="btn btn-sm" onClick={handleExport}>Export PNG</button>
      </div>
      {err && <div className="text-red-600 mb-3">Error: {err}</div>}
      {loading && <div className="text-slate-600">Loading chart...</div>}
      <div ref={ref} className="w-full" style={{ height: 400 }} />
    </section>
  );
}
