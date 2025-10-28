import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { fetchScatterRating, type ScatterRatingResponse } from "../lib/api";
import { posterUrl } from "../lib/tmdb";
import { boundsByPercentile } from "../lib/stats";

type Props = {
  genre?: string;
  ymin?: number;
  ymax?: number;
  limit?: number;
  source?: "tmdb" | "imdb";
};

function useDebounce<T>(value: T, delay: number = 400): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

function finiteMinMax(a: number[]) {
  let lo = Infinity, hi = -Infinity;
  for (const v of a) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 1, hi: 10 };
  return { lo, hi };
}

export default function ScatterRating({ genre, ymin, ymax, limit, source }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  const [data, setData] = useState<ScatterRatingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const filterParams = useMemo(() => ({ genre, ymin, ymax, limit, source }), [genre, ymin, ymax, limit, source]);
  const debounced = useDebounce(filterParams, 400);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    fetchScatterRating(debounced)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setErr(e?.message ?? "Error");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => {
      alive = false;
    };

  }, [debounced]);

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

    const revenues = pts.map((p) => p.revenue ?? 0);
    const [rLo, rHi] = boundsByPercentile(revenues, 0.01, 0.99);

    const trimmed = pts.filter((p) => {
        const r = p.revenue ?? 0;
        const rating = p.rating ?? 0;
        return r > 0 && r >= rLo && r <= rHi && rating >= 0 && rating <= 10;
    });

    const seriesData = trimmed.map((p) => ({
      value: [p.rating ?? 0, Math.max(1, p.revenue ?? 1)] as [number, number],
      name: p.title,
      year: p.year,
      poster: posterUrl(p.poster_path, "w92"),
    }));

    const ys = seriesData.map(s => (s.value as [number, number])[1]);
    const { lo: yLo, hi: yHi } = finiteMinMax(ys);
    const pad = 0.15;
    const yMinInit = Math.max(1, yLo / Math.pow(10, pad));
    const yMaxInit = yHi * Math.pow(10, pad);  

    const yMin = Math.max(1, Math.pow(10, Math.floor(Math.log10(yMinInit))));
    const yMax = Math.pow(10, Math.ceil(Math.log10(yMaxInit)));

    const r2 = data?.trend?.r2 ?? null;
    const slope = data?.trend?.slope ?? null;
    const n = trimmed.length;
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
        scale: true,
        name: `${ratingSource} Rating (0–10)`,
        nameLocation: "middle",
        nameGap: 30,
        axisLabel: { formatter: (v: number) => v.toFixed(1) },
      },
      yAxis: {
        type: "log",
        logBase: 10,
        min: yMin,
        max: yMax,
        scale: true,
        name: "Revenue (USD, log)",
        nameLocation: "middle",
        nameGap: 40,
        axisLabel: { formatter: (v: number) => "$" + v.toLocaleString() },
      },
      toolbox: { show: false },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          moveOnMouseMove: true,
          minSpan: 3,
          throttle: 50,
          preventDefaultMouseMove: true,
        },
        {
          type: "inside",
          yAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          moveOnMouseMove: true,
          minSpan: 3,
          throttle: 50,
          preventDefaultMouseMove: true,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          bottom: 0,
          filterMode: "none",
        },
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
