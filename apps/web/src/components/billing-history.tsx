"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, ReceiptText } from "lucide-react";
import type { BillingHistoryItem } from "@nexora/shared-types";
import { SubscriptionService } from "@/lib/api/subscription";

const date = (v: string | null) =>
  v ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(v)) : "—";
const money = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export function BillingHistory({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);setError("");
    try { setRows(await SubscriptionService.history(businessId)); }
    catch { setError("Could not load payment history. Your records have not changed."); }
    finally { setLoading(false); }
  },[businessId]);
  useEffect(() => { void reload(); },[reload]);
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-7" aria-labelledby="billing-history-title">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="billing-history-title" className="flex items-center gap-2 text-xl font-bold"><ReceiptText size={20} aria-hidden="true"/> Payment history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Latest 20 payment attempts and verified renewals. Only confirmed payments grant access.</p>
      </div>
      <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCcw size={15} aria-hidden="true"/> Refresh</button>
    </div>
    {loading ? <p role="status" className="text-sm text-muted-foreground">Loading records…</p> :
      error ? <p role="alert" className="text-sm text-destructive">{error}</p> :
      !rows.length ? <div className="rounded-xl bg-muted px-5 py-7 text-center text-sm text-muted-foreground">No payment transactions have been recorded yet.</div> :
      <div className="overflow-x-auto"><table className="w-full min-w-[610px] text-left text-sm">
        <thead><tr className="border-b border-border text-muted-foreground">
          <th scope="col" className="py-3 pr-3 font-semibold">Date</th>
          <th scope="col" className="py-3 pr-3 font-semibold">Plan</th>
          <th scope="col" className="py-3 pr-3 font-semibold">Amount</th>
          <th scope="col" className="py-3 pr-3 font-semibold">Status</th>
          <th scope="col" className="py-3 font-semibold">Reference</th>
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.reference} className="border-b border-border/60">
          <td className="py-4 pr-3">{date(row.paidAt || row.createdAt)}</td>
          <td className="py-4 pr-3">{row.plan || "—"}</td>
          <td className="py-4 pr-3 font-semibold">{row.currency === "NGN" ? money(row.amountNgn) : row.amountNgn + " " + row.currency}</td>
          <td className="py-4 pr-3"><span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-semibold">{row.verified ? "Verified" : row.status}</span></td>
          <td className="py-4 font-mono text-xs text-muted-foreground break-all">{row.reference}</td>
        </tr>)}</tbody>
      </table></div>}
    <p className="mt-5 text-xs text-muted-foreground">This is an account transaction record, not a tax invoice or payment receipt. For disputes or refunds, contact support with your reference.</p>
  </section>;
}
