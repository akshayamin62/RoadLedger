"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { companyLabel, formatDate, formatINR, monthStart, todayIso } from "@/lib/utils";
import { api, qs } from "@/services/api";
import type { Transaction } from "@/types";
import { Banknote, Truck, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Summary = {
  cards: {
    totalVehicles: number;
    totalParties: number;
    totalTransactions: number;
    totalBillAmount: number;
    totalAmountReceived: number;
    totalPendingAmount: number;
    totalSparePartsExpenses: number;
  };
  recentTransactions: Transaction[];
  pendingPayments: Transaction[];
  recentCollections: {
    transactionId: string;
    serialNumber: number;
    billNumber: string;
    partyName: string;
    amount: number;
    receivedDate: string;
    paymentMode: string;
  }[];
  vehicleWise: { vehicleId: string; registrationNumber: string; transactions: number; billAmount: number }[];
};

type Charts = {
  monthly: { billing: { month: string; amount: number }[]; collections: { month: string; amount: number }[] };
};

export default function DashboardPage() {
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(todayIso());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const query = qs({ fromDate, toDate });
      const [summaryRes, chartRes] = await Promise.all([
        api<Summary>(`/api/dashboard/summary${query}`),
        api<Charts>(`/api/dashboard/charts${query}`),
      ]);
      setSummary(summaryRes.data);
      setCharts(chartRes.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const months = Array.from(
    new Set([...(charts?.monthly.billing.map((x) => x.month) ?? []), ...(charts?.monthly.collections.map((x) => x.month) ?? [])]),
  ).sort();
  const chartData = months.map((month) => ({
    month,
    billing: charts?.monthly.billing.find((x) => x.month === month)?.amount ?? 0,
    collections: charts?.monthly.collections.find((x) => x.month === month)?.amount ?? 0,
  }));

  const cards = [
    { label: "Total Vehicles", value: summary?.cards.totalVehicles ?? 0, icon: Truck },
    { label: "Total Parties", value: summary?.cards.totalParties ?? 0, icon: Users },
    { label: "Total Transactions", value: summary?.cards.totalTransactions ?? 0, icon: Wallet },
    { label: "Total Bill Amount", value: formatINR(summary?.cards.totalBillAmount ?? 0), icon: Banknote },
    { label: "Amount Received", value: formatINR(summary?.cards.totalAmountReceived ?? 0), tone: "text-emerald-700" },
    { label: "Pending Amount", value: formatINR(summary?.cards.totalPendingAmount ?? 0), tone: "text-red-600" },
    { label: "Spare Parts Expenses", value: formatINR(summary?.cards.totalSparePartsExpenses ?? 0), tone: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Dashboard</h2>
          <p className="text-sm text-slate-500">Live figures calculated from your MongoDB records.</p>
        </div>
        <div className="flex gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">From</p>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">To</p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : cards.map((card) => (
              <Card key={card.label}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${card.tone ?? "text-navy"}`}>{card.value}</p>
              </Card>
            ))}
      </div>

      <Card>
        <h3 className="mb-4 font-semibold text-navy">Monthly billing and collections</h3>
        <div className="h-72">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="billing" stroke="#0B1F3A" name="Billing" />
                <Line type="monotone" dataKey="collections" stroke="#059669" name="Collections" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No chart data" description="Add transactions to see monthly billing and collections." />
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-navy">Recent transactions</h3>
          {summary?.recentTransactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-2">Bill</th>
                    <th className="pb-2">Party</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-slate-100">
                      <td className="py-2">{tx.billNumber}</td>
                      <td>{tx.party?.name}</td>
                      <td>{formatINR(tx.billAmount)}</td>
                      <td>
                        <StatusBadge status={tx.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No transactions yet" description="Create your first transportation bill." />
          )}
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-navy">Recent payment collections</h3>
          {summary?.recentCollections.length ? (
            <div className="space-y-3">
              {summary.recentCollections.map((row) => (
                <div key={`${row.transactionId}-${row.receivedDate}-${row.amount}`} className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-navy">{row.partyName}</p>
                    <p className="text-xs text-slate-500">
                      {row.billNumber} · {row.paymentMode} · {formatDate(row.receivedDate)}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-700">{formatINR(row.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No collections yet" description="Payments will appear here as they are recorded." />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold text-navy">Pending payments</h3>
          {summary?.pendingPayments.length ? (
            <div className="space-y-3">
              {summary.pendingPayments.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-navy">{tx.party?.name}</p>
                    <p className="text-xs text-slate-500">
                      {tx.billNumber} · {companyLabel(tx.party?.company ?? "JAY_ROADWAYS")}
                    </p>
                  </div>
                  <p className="font-semibold text-red-700">{formatINR(tx.pendingAmount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No pending dues" description="All overlapping bills are fully collected." />
          )}
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-navy">Vehicle-wise transaction summary</h3>
          {summary?.vehicleWise.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">Vehicle</th>
                  <th className="pb-2">Trips</th>
                  <th className="pb-2">Billing</th>
                </tr>
              </thead>
              <tbody>
                {summary.vehicleWise.map((row) => (
                  <tr key={row.vehicleId} className="border-t border-slate-100">
                    <td className="py-2">{row.registrationNumber}</td>
                    <td>{row.transactions}</td>
                    <td>{formatINR(row.billAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No vehicle activity" description="Vehicle summaries appear after billing." />
          )}
        </Card>
      </div>
    </div>
  );
}
