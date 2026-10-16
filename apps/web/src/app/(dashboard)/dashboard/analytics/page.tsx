"use client";
import { useEffect, useState } from "react";
import type { AnalyticsReport } from "@nexora/shared-types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { apiFetch } from "@/lib/api/client";
export default function AnalyticsPage() {
  const businessId = useAuth().user?.businesses?.[0]?.id;
  const [days, setDays] = useState<7 | 30 | 90>(30),
    [reload, setReload] = useState(0);
  const [report, setReport] = useState<AnalyticsReport | null>(null),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState("");
  const requestKey = `${businessId}:${days}:${reload}`;
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    apiFetch<AnalyticsReport>(
      `/businesses/${businessId}/analytics/report?days=${days}`,
    )
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReport(null);
          setError("Analytics could not be loaded. Try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, days, reload, requestKey]);
  const loading = loaded !== requestKey,
    max = Math.max(1, ...(report?.series.map((d) => d.pageViews) || []));
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-violet-700">
            YOUR WEBSITE, IN NUMBERS
          </p>
          <h1 className="mt-2 text-3xl font-bold">Analytics</h1>
          <p className="mt-2 text-sm text-slate-600">
            Opt-in activity and real enquiries. All dates use UTC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Date range
            <select
              className="ml-3 rounded-lg border bg-white p-2"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
            >
              {[7, 30, 90].map((n) => (
                <option key={n} value={n}>
                  Last {n} days
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setReload((v) => v + 1)}
            className="rounded-xl border bg-white px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>
      </header>
      {loading ? (
        <p role="status">Loading analytics…</p>
      ) : error ? (
        <div role="alert" className="rounded-xl bg-red-50 p-5">
          <p>{error}</p>
          <button
            className="mt-3 underline"
            onClick={() => setReload((v) => v + 1)}
          >
            Retry analytics
          </button>
        </div>
      ) : (
        report && (
          <>
            {!report.collectionEnabled && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                Optional visit collection is off for this release. Previously
                collected totals remain visible. Enquiries still work.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Opt-in page views", report.totals.pageViews],
                ["Opt-in WhatsApp clicks", report.totals.whatsappClicks],
                ["Enquiries received", report.totals.enquiries],
              ].map(([label, value]) => (
                <section
                  key={label}
                  className="rounded-2xl border bg-white p-6"
                >
                  <h2 className="text-sm text-slate-600">{label}</h2>
                  <p className="mt-3 text-4xl font-bold tracking-tight">
                    {Number(value).toLocaleString()}
                  </p>
                </section>
              ))}
            </div>
            <section className="rounded-2xl border bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Page views over time</h2>
                <p className="text-xs text-slate-500">
                  {report.from} — {report.through} · UTC
                </p>
              </div>
              {report.totals.pageViews === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No processed opt-in page views in this period.
                </p>
              ) : (
                <div
                  className="mt-7 flex h-48 items-end gap-1 border-b"
                  role="img"
                  aria-label={`Daily opt-in page views: ${report.totals.pageViews} total. Exact counts are in the table below.`}
                >
                  {report.series.map((day) => (
                    <div
                      key={day.date}
                      className="min-w-0 flex-1 rounded-t bg-violet-500"
                      style={{ height: `${(day.pageViews / max) * 100}%` }}
                      title={`${day.date}: ${day.pageViews}`}
                    />
                  ))}
                </div>
              )}
              <p className="mt-5 text-xs text-slate-600">
                Counts are events, not unique visitors. Only visitors who allow
                counting are included in views/clicks. Enquiries count retained,
                undeleted messages and are not a conversion rate.
              </p>
            </section>
            <section className="rounded-2xl border bg-white p-6">
              <h2 className="font-bold">Processing status</h2>
              <p className="mt-3 text-sm">
                {report.processing.pending} events waiting ·{" "}
                {report.processing.review} events need operator review.
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {report.processing.lastAggregatedAt
                  ? `Latest update in this period: ${new Date(report.processing.lastAggregatedAt).toLocaleString(undefined, { timeZone: 'UTC', timeZoneName: 'short' })}`
                  : "No activity has been aggregated in this period."}{" "}
                Counts update after background processing; use Refresh to check
                again.
              </p>
              {report.processing.oldestPendingAt && (
                <p className="mt-2 text-xs text-amber-900">
                  Oldest waiting event:{" "}
                  {new Date(report.processing.oldestPendingAt).toLocaleString(undefined, { timeZone: 'UTC', timeZoneName: 'short' })}
                  . Persistent delays need operator attention.
                </p>
              )}
            </section>
            <details className="rounded-2xl border bg-white p-6">
              <summary className="cursor-pointer font-semibold">
                Daily counts and accessible table
              </summary>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="mb-3 text-left text-xs text-slate-500">
                    Daily totals in UTC; current day is partial.
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Date",
                        "Page views",
                        "WhatsApp clicks",
                        "Enquiries",
                      ].map((v) => (
                        <th key={v} scope="col" className="border-b p-2">
                          {v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.series.map((day) => (
                      <tr key={day.date}>
                        <th
                          scope="row"
                          className="whitespace-nowrap p-2 font-normal"
                        >
                          {day.date}
                        </th>
                        <td className="p-2">{day.pageViews}</td>
                        <td className="p-2">{day.whatsappClicks}</td>
                        <td className="p-2">{day.enquiries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )
      )}
    </div>
  );
}
