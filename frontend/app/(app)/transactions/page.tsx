"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { companyLabel, exportCsv, formatDate, formatINR, monthStart, toInputDate, todayIso } from "@/lib/utils";
import { ApiError, api, qs } from "@/services/api";
import type { ApiList, Party, PaymentMode, Transaction, Vehicle } from "@/types";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Analytics = {
  summary: {
    totalBillAmount: number;
    totalAmountReceived: number;
    totalPendingAmount: number;
    totalTransactions: number;
  };
  notes: Record<string, string>;
  charts: {
    monthlyBilling: { month: string; amount: number }[];
    monthlyCollection: { month: string; amount: number }[];
    paymentModeBreakdown: { NEFT: number; UPI: number; CASH: number; CHEQUE: number };
  };
  partyWise: { partyId: string; name: string; company: string; billAmount: number }[];
  vehicleWise: { vehicleId: string; registrationNumber: string; vehicleType: string; billAmount: number }[];
  companyWise: { JAY_ROADWAYS: number; JAY_INFRA: number };
};

const emptyTx = {
  vehicleId: "",
  partyId: "",
  fromDate: todayIso(),
  toDate: todayIso(),
  billNumber: "",
  billAmount: "",
  paymentReceivedDate: "",
  paymentReceivedAmount: "0",
  paymentMode: "" as "" | PaymentMode,
};

export default function TransactionsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({
    search: "",
    vehicleId: "",
    partyId: "",
    company: "",
    paymentStatus: "",
    fromDate: "",
    toDate: "",
    sort: "newest",
    page: 1,
  });
  const [range, setRange] = useState({ fromDate: monthStart(), toDate: todayIso() });
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyTx);
  const [serial, setSerial] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" as PaymentMode });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const loadLookups = async () => {
    const [v, p] = await Promise.all([
      api<Vehicle[]>(`/api/vehicles${qs({ limit: 500 })}`),
      api<Party[]>(`/api/parties${qs({ limit: 500 })}`),
    ]);
    setVehicles(v.data);
    setParties(p.data);
  };

  const loadTable = async () => {
    const res = await api<Transaction[]>(
      `/api/transactions${qs({ ...filters, page: filters.page, limit: 10 })}`,
    );
    setItems(res.data);
    setMeta(res.meta as ApiList<Transaction>["meta"]);
  };

  const loadAnalytics = async () => {
    const res = await api<Analytics>(`/api/transactions/analytics${qs(range)}`);
    setAnalytics(res.data);
  };

  useEffect(() => {
    void loadLookups().catch((error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    void loadTable().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    void loadAnalytics().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const setFilter = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, page: 1, ...patch }));

  const openCreate = async () => {
    setEditing(null);
    setForm(emptyTx);
    setErrors({});
    const res = await api<{ serialNumber: number }>("/api/transactions/next-serial");
    setSerial(res.data.serialNumber);
    setOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setSerial(tx.serialNumber);
    setForm({
      vehicleId: tx.vehicleId,
      partyId: tx.partyId,
      fromDate: toInputDate(tx.fromDate),
      toDate: toInputDate(tx.toDate),
      billNumber: tx.billNumber,
      billAmount: String(tx.billAmount),
      paymentReceivedDate: "",
      paymentReceivedAmount: "0",
      paymentMode: "",
    });
    setErrors({});
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.vehicleId) next.vehicleId = "Select a vehicle";
    if (!form.partyId) next.partyId = "Select a party";
    if (!form.billNumber.trim()) next.billNumber = "Bill number is required";
    if (!Number(form.billAmount) || Number(form.billAmount) <= 0) next.billAmount = "Bill amount must be greater than zero";
    if (form.toDate < form.fromDate) next.toDate = "To date cannot be earlier than from date";
    const received = Number(form.paymentReceivedAmount || 0);
    if (!editing && received > 0) {
      if (!form.paymentReceivedDate) next.paymentReceivedDate = "Payment date is required";
      if (!form.paymentMode) next.paymentMode = "Payment mode is required";
      if (received > Number(form.billAmount)) next.paymentReceivedAmount = "Payment cannot exceed bill amount";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (editing) {
        await api(`/api/transactions/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            vehicleId: form.vehicleId,
            partyId: form.partyId,
            fromDate: form.fromDate,
            toDate: form.toDate,
            billNumber: form.billNumber,
            billAmount: Number(form.billAmount),
          }),
        });
        toast.success("Transaction updated");
      } else {
        await api("/api/transactions", {
          method: "POST",
          body: JSON.stringify({
            vehicleId: form.vehicleId,
            partyId: form.partyId,
            fromDate: form.fromDate,
            toDate: form.toDate,
            billNumber: form.billNumber,
            billAmount: Number(form.billAmount),
            paymentReceivedDate: received > 0 ? form.paymentReceivedDate : undefined,
            paymentReceivedAmount: received,
            paymentMode: received > 0 ? form.paymentMode : undefined,
          }),
        });
        toast.success("Transaction created");
      }
      setOpen(false);
      await Promise.all([loadTable(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save transaction");
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!viewing) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return toast.error("Payment amount must be greater than zero");
    try {
      const path = editingPaymentId
        ? `/api/transactions/${viewing.id}/payments/${editingPaymentId}`
        : `/api/transactions/${viewing.id}/payments`;
      const res = await api<Transaction>(path, {
        method: editingPaymentId ? "PUT" : "POST",
        body: JSON.stringify(paymentForm),
      });
      setViewing(res.data);
      setPaymentForm({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" });
      setEditingPaymentId(null);
      toast.success(editingPaymentId ? "Payment updated" : "Payment recorded");
      await Promise.all([loadTable(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save payment");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/transactions/${deleting.id}`, { method: "DELETE" });
      toast.success("Transaction deleted");
      setDeleting(null);
      await Promise.all([loadTable(), loadAnalytics()]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to delete transaction");
    }
  };

  const exportRows = async () => {
    const res = await api<Transaction[]>(`/api/transactions${qs({ ...filters, page: 1, limit: 500 })}`);
    const rows: Record<string, unknown>[] = [];
    for (const tx of res.data) {
      if (!tx.payments?.length) {
        rows.push({
          serialNumber: tx.serialNumber,
          billNumber: tx.billNumber,
          vehicle: tx.vehicle?.registrationNumber,
          party: tx.party?.name,
          company: tx.party?.company,
          fromDate: formatDate(tx.fromDate),
          toDate: formatDate(tx.toDate),
          billAmount: tx.billAmount,
          paymentAmount: 0,
          paymentDate: "",
          paymentMode: "",
          totalReceived: tx.totalReceivedAmount,
          pending: tx.pendingAmount,
          status: tx.paymentStatus,
        });
      } else {
        for (const payment of tx.payments) {
          rows.push({
            serialNumber: tx.serialNumber,
            billNumber: tx.billNumber,
            vehicle: tx.vehicle?.registrationNumber,
            party: tx.party?.name,
            company: tx.party?.company,
            fromDate: formatDate(tx.fromDate),
            toDate: formatDate(tx.toDate),
            billAmount: tx.billAmount,
            paymentAmount: payment.amount,
            paymentDate: formatDate(payment.receivedDate),
            paymentMode: payment.paymentMode,
            totalReceived: tx.totalReceivedAmount,
            pending: tx.pendingAmount,
            status: tx.paymentStatus,
          });
        }
      }
    }
    exportCsv("transactions.csv", rows);
  };

  const pieData = useMemo(
    () =>
      analytics
        ? [
            { name: "NEFT", value: analytics.charts.paymentModeBreakdown.NEFT },
            { name: "UPI", value: analytics.charts.paymentModeBreakdown.UPI },
            { name: "Cash", value: analytics.charts.paymentModeBreakdown.CASH },
            { name: "Cheque", value: analytics.charts.paymentModeBreakdown.CHEQUE },
          ]
        : [],
    [analytics],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Transactions</h2>
          <p className="text-sm text-slate-500">Billing, partial collections, and period analytics.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void exportRows()}>
            Export CSV
          </Button>
          <Button onClick={() => void openCreate()}>
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        </div>
      </div>

      <Card className="bg-navy text-white">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-blue-200">Analytics date range</p>
            <p className="text-xs text-blue-100">Billing uses overlapping trip dates. Collections use payment received dates.</p>
          </div>
          <div className="flex gap-3">
            <Input type="date" className="bg-white text-navy" value={range.fromDate} onChange={(e) => setRange({ ...range, fromDate: e.target.value })} />
            <Input type="date" className="bg-white text-navy" value={range.toDate} onChange={(e) => setRange({ ...range, toDate: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Bill Amount", formatINR(analytics?.summary.totalBillAmount ?? 0)],
            ["Total Amount Received", formatINR(analytics?.summary.totalAmountReceived ?? 0)],
            ["Total Pending Amount", formatINR(analytics?.summary.totalPendingAmount ?? 0)],
            ["Total Transactions", analytics?.summary.totalTransactions ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white/10 p-4">
              <p className="text-xs text-blue-100">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="mb-4 font-semibold text-navy">Monthly billing vs collections</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={Array.from(
                  new Set([
                    ...(analytics?.charts.monthlyBilling.map((x) => x.month) ?? []),
                    ...(analytics?.charts.monthlyCollection.map((x) => x.month) ?? []),
                  ]),
                )
                  .sort()
                  .map((month) => ({
                    month,
                    billing: analytics?.charts.monthlyBilling.find((x) => x.month === month)?.amount ?? 0,
                    collections: analytics?.charts.monthlyCollection.find((x) => x.month === month)?.amount ?? 0,
                  }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Legend />
                <Line dataKey="billing" stroke="#0B1F3A" name="Billing" />
                <Line dataKey="collections" stroke="#059669" name="Collections" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold text-navy">Payment mode breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "NEFT"
                          ? "#1D4ED8"
                          : entry.name === "UPI"
                            ? "#0B1F3A"
                            : entry.name === "Cheque"
                              ? "#D97706"
                              : "#059669"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatINR(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-semibold text-navy">Company-wise billing</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "JR", amount: analytics?.companyWise.JAY_ROADWAYS ?? 0 },
                { name: "JI", amount: analytics?.companyWise.JAY_INFRA ?? 0 },
              ]}>
                <XAxis dataKey="name" />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Bar dataKey="amount" fill="#1D4ED8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-navy">Party-wise billing</h3>
          {(analytics?.partyWise.length ?? 0) ? analytics!.partyWise.slice(0, 6).map((row) => (
            <div key={row.partyId} className="flex justify-between border-t border-slate-100 py-2 text-sm">
              <span>{row.name}</span>
              <span className="font-medium">{formatINR(row.billAmount)}</span>
            </div>
          )) : <EmptyState title="No party data" description="Bills in this range will appear here." />}
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-navy">Vehicle-wise billing</h3>
          {(analytics?.vehicleWise.length ?? 0) ? analytics!.vehicleWise.slice(0, 6).map((row) => (
            <div key={row.vehicleId} className="flex justify-between border-t border-slate-100 py-2 text-sm">
              <span>{row.registrationNumber}</span>
              <span className="font-medium">{formatINR(row.billAmount)}</span>
            </div>
          )) : <EmptyState title="No vehicle data" description="Vehicle billing will appear here." />}
        </Card>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Input placeholder="Search serial, bill, vehicle, party" value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} />
          <Select value={filters.vehicleId} onChange={(e) => setFilter({ vehicleId: e.target.value })}>
            <option value="">All vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber} · {vehicle.vehicleType}
              </option>
            ))}
          </Select>
          <Select value={filters.partyId} onChange={(e) => setFilter({ partyId: e.target.value })}>
            <option value="">All parties</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </Select>
          <Select value={filters.company} onChange={(e) => setFilter({ company: e.target.value })}>
            <option value="">All companies</option>
            <option value="JAY_ROADWAYS">Jay Roadways (JR)</option>
            <option value="JAY_INFRA">Jay Infra (JI)</option>
          </Select>
          <Select value={filters.paymentStatus} onChange={(e) => setFilter({ paymentStatus: e.target.value })}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
          </Select>
          <Input type="date" value={filters.fromDate} onChange={(e) => setFilter({ fromDate: e.target.value })} />
          <Input type="date" value={filters.toDate} onChange={(e) => setFilter({ toDate: e.target.value })} />
          <Select value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="bill_high">Highest bill</option>
            <option value="bill_low">Lowest bill</option>
          </Select>
        </div>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3">Serial</th>
                  <th className="pb-3">Bill</th>
                  <th className="pb-3">Vehicle</th>
                  <th className="pb-3">Party</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Bill amount</th>
                  <th className="pb-3">Received</th>
                  <th className="pb-3">Pending</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr key={tx.id} className="border-t border-slate-100">
                    <td className="py-3">{tx.serialNumber}</td>
                    <td>{tx.billNumber}</td>
                    <td>{tx.vehicle?.registrationNumber}</td>
                    <td>
                      {tx.party?.name}
                      <div className="text-xs text-slate-400">{companyLabel(tx.party?.company ?? "JAY_ROADWAYS")}</div>
                    </td>
                    <td>
                      {formatDate(tx.fromDate)} – {formatDate(tx.toDate)}
                    </td>
                    <td>{formatINR(tx.billAmount)}</td>
                    <td className="text-emerald-700">{formatINR(tx.totalReceivedAmount)}</td>
                    <td className="text-red-600">{formatINR(tx.pendingAmount)}</td>
                    <td>
                      <StatusBadge status={tx.paymentStatus} />
                    </td>
                    <td className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setViewing(tx);
                          setEditingPaymentId(null);
                          setPaymentForm({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(tx)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(tx)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No transactions found" description="Create a bill to start tracking collections." />
        )}
        <Pagination page={filters.page} totalPages={meta.totalPages} onPage={(page) => setFilters((c) => ({ ...c, page }))} />
      </Card>

      <Dialog open={open} title={editing ? "Edit transaction" : "Add transaction"} onClose={() => setOpen(false)} className="max-w-3xl">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Serial number">
            <Input readOnly value={serial ?? "Auto"} />
          </Field>
          <Field label="Bill number" required error={errors.billNumber}>
            <Input value={form.billNumber} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} />
          </Field>
          <Field label="Select vehicle" required error={errors.vehicleId}>
            <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
              <option value="">Choose vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} · {vehicle.vehicleType}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Select party" required error={errors.partyId}>
            <Select value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value })}>
              <option value="">Choose party</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name} · {companyLabel(party.company)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From date" required>
            <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
          </Field>
          <Field label="To date" required error={errors.toDate}>
            <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
          </Field>
          <Field label="Bill amount" required error={errors.billAmount}>
            <Input type="number" min="0.01" step="0.01" value={form.billAmount} onChange={(e) => setForm({ ...form, billAmount: e.target.value })} />
          </Field>
          {!editing ? (
            <>
              <Field label="Payment received amount" error={errors.paymentReceivedAmount}>
                <Input type="number" min="0" step="0.01" value={form.paymentReceivedAmount} onChange={(e) => setForm({ ...form, paymentReceivedAmount: e.target.value })} />
              </Field>
              <Field label="Payment received date" error={errors.paymentReceivedDate}>
                <Input type="date" value={form.paymentReceivedDate} onChange={(e) => setForm({ ...form, paymentReceivedDate: e.target.value })} />
              </Field>
              <Field label="Payment mode" error={errors.paymentMode}>
                <Select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as typeof form.paymentMode })}>
                  <option value="">Select if payment received</option>
                  <option value="NEFT">NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </Select>
              </Field>
            </>
          ) : null}
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(viewing)} title="Transaction details" onClose={() => setViewing(null)} className="max-w-3xl">
        {viewing ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p><span className="text-slate-500">Serial:</span> {viewing.serialNumber}</p>
              <p><span className="text-slate-500">Bill:</span> {viewing.billNumber}</p>
              <p><span className="text-slate-500">Vehicle:</span> {viewing.vehicle?.registrationNumber} ({viewing.vehicle?.vehicleType})</p>
              <p><span className="text-slate-500">Party:</span> {viewing.party?.name}</p>
              <p><span className="text-slate-500">Period:</span> {formatDate(viewing.fromDate)} – {formatDate(viewing.toDate)}</p>
              <p><span className="text-slate-500">Status:</span> <StatusBadge status={viewing.paymentStatus} /></p>
              <p><span className="text-slate-500">Bill amount:</span> {formatINR(viewing.billAmount)}</p>
              <p><span className="text-slate-500">Received:</span> {formatINR(viewing.totalReceivedAmount)}</p>
              <p><span className="text-slate-500">Pending:</span> {formatINR(viewing.pendingAmount)}</p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-navy">Payment history</h4>
              {viewing.payments.length ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Mode</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.payments.map((payment, index) => (
                      <tr key={payment.id ?? index} className="border-t border-slate-100">
                        <td className="py-2">{formatDate(payment.receivedDate)}</td>
                        <td>{payment.paymentMode}</td>
                        <td>{formatINR(payment.amount)}</td>
                        <td className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingPaymentId(payment.id ?? null);
                              setPaymentForm({
                                amount: String(payment.amount),
                                receivedDate: toInputDate(payment.receivedDate),
                                paymentMode: payment.paymentMode,
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              )}
            </div>
            {(viewing.pendingAmount > 0 || editingPaymentId) ? (
              <form onSubmit={savePayment} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
                <Field label="Amount">
                  <Input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                </Field>
                <Field label="Received date">
                  <Input type="date" value={paymentForm.receivedDate} onChange={(e) => setPaymentForm({ ...paymentForm, receivedDate: e.target.value })} />
                </Field>
                <Field label="Mode">
                  <Select value={paymentForm.paymentMode} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value as PaymentMode })}>
                    <option value="NEFT">NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </Select>
                </Field>
                <div className="flex items-end gap-2">
                  {editingPaymentId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEditingPaymentId(null);
                        setPaymentForm({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" });
                      }}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  <Button type="submit" className="w-full" variant="success">
                    {editingPaymentId ? "Update" : "Add payment"}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete transaction?"
        description="This will remove the bill and all associated payment records."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
