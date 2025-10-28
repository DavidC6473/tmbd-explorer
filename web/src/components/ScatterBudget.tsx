import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { fetchScatterBudget, type ScatterBudgetResponse } from "../lib/api";
import { posterUrl } from "../lib/tmdb";

type TooltipParams = {
    name?: string;
    value?: [number, number] | number[];
    data?: { poster?: string | null; year?: number | null };
};

type Props = {
  genre?: string;
  ymin?: number;
  ymax?: number;
  limit: number;
};

function useDebounce<T>(value: T, delay: number = 400): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

export default function ScatterBudget({ genre, ymin, ymax, limit }: Props) {
    const ref = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.EChartsType | null>(null);
    const [data, setData] = useState<ScatterBudgetResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const filterParams = useMemo(() => ({ genre, ymin, ymax, limit }), [genre, ymin, ymax, limit]);
    const debounced = useDebounce(filterParams, 400);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setErr(null);

        fetchScatterBudget(debounced)
        .then((d) => {
            if (alive) setData(d);
        })
        .catch((e) => {
            if (alive) setErr(e?.message ?? "Error");
        })
        .finally(() => {
            if (alive) setLoading(false);
        });

        return () => { alive = false; };

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
        const a = document.createElement("a");
        a.href = dataURL;
        const slug = genre ? genre.replace(/\s+/g, "-").toLowerCase() : "all";
        a.download = `budget-vs-revenue_${slug}.png`;
        a.click();
    };

    const option = useMemo<echarts.EChartsOption>(() => {
        const pts = data?.points ??[];

        const seriesData = pts.map((p) => ({
            value: [Math.max(1, p.budget ?? 1), Math.max(1, p.revenue ?? 1)],
            name: p.title,
            year: p.year,
            poster: posterUrl(p.poster_path, "w92"),
        }));

        const r2 = data?.trend?.r2 ?? null;
        const slope = data?.trend.slope ?? null;
        const n = data?.trend?.n ?? 0;

        return {
            tooltip: {
                trigger: "item",
                confine: true,
                formatter: (raw: unknown) => {
                const params = raw as TooltipParams | undefined;

                const title = params?.name ?? "";
                const [b, r] = (params?.value ?? [0, 0]) as [number, number];
                const year = params?.data?.year ?? "";
                const poster = params?.data?.poster;

                const budget = b.toLocaleString();
                const revenue = r.toLocaleString();
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
                        <div style="opacity:.8">Budget: $${budget}</div>
                        <div style="opacity:.8">Revenue: $${revenue}</div>
                    </div>
                    </div>
                `;
                },
            },
            grid: { left: 60, right: 20, top: 20, bottom: 50 },
            xAxis: {
                type: "log",
                logBase: 10,
                min: 1,
                name: "Budget (USD, log)",
                nameLocation: "middle",
                nameGap: 30,
                axisLabel: { formatter: (v: number) => "$" + v.toLocaleString() },
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
                text: `Budget vs Revenue ${genre ? `— ${genre}` : ""}`,
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
    }, [data, genre]);

    useEffect(() => {
        if (chartRef.current && option) {
            chartRef.current.setOption(option, { notMerge: true });
        }
    }, [option]);

    return (
        <section className="card">
            <div className="card-title flex items-center justify-between">
                <span>Budget vs Revenue</span>
                <button className="btn btn-sm" onClick={handleExport}>Export PNG</button>
            </div>
            {err && <div className="text-red-600 mb-3">Error: {err}</div>}
            {loading && <div className="text-slate-600">Loading chart...</div>}
            <div ref={ref} className="w-full" style={{ height: 400}} />
        </section>
    );
}
