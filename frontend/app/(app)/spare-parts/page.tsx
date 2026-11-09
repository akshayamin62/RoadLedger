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
import { exportCsv, formatDate, formatINR, toInputDate, todayIso } from "@/lib/utils";
import { ApiError, api, qs } from "@/services/api";
import type { ApiList, PaymentMode, SparePart } from "@/types";
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

const emptyForm = {
  partName: "",
  providerName: "",
  purchaseDate: todayIso(),
  amount: "",
  paymentReceivedAmount: "0",
  paymentReceivedDate: "",
  paymentMode: "" as "" | PaymentMode,
};

const PAYMENT_MODE_COLORS: Record<string, string> = {
  NEFT: "#1D4ED8",
  UPI: "#0B1F3A",
  CASH: "#059669",
  CHEQUE: "#D97706",
};

export default function SparePartsPage() {
  const [items, setItems] = useState<SparePart[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [summary, setSummary] = useState({
    totalExpenditure: 0,
    totalPaid: 0,
    totalPending: 0,
    totalRecords: 0,
    monthlyExpenditure: [] as { month: string; amount: number }[],
    monthlyPaid: [] as { month: string; amount: number }[],
    paymentModeBreakdown: { NEFT: 0, UPI: 0, CASH: 0, CHEQUE: 0 },
  });
  const [filters, setFilters] = useState({
    search: "",
    fromDate: "",
    toDate: "",
    paymentStatus: "",
    sort: "date_desc",
    page: 1,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [viewing, setViewing] = useState<SparePart | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SparePart | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    receivedDate: todayIso(),
    paymentMode: "NEFT" as PaymentMode,
  });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const load = async () => {
    const res = await api<SparePart[]>(`/api/spare-parts${qs({ ...filters, limit: 10 })}`);
    setItems(res.data);
    setMeta(res.meta as ApiList<SparePart>["meta"]);
    if (res.summary) {
      setSummary({
        totalExpenditure: res.summary.totalExpenditure ?? 0,
        totalPaid: (res.summary as { totalPaid?: number }).totalPaid ?? 0,
        totalPending: (res.summary as { totalPending?: number }).totalPending ?? 0,
        totalRecords: (res.summary as { totalRecords?: number }).totalRecords ?? 0,
        monthlyExpenditure: res.summary.monthlyExpenditure ?? [],
        monthlyPaid: (res.summary as { monthlyPaid?: { month: string; amount: number }[] }).monthlyPaid ?? [],
        paymentModeBreakdown: (res.summary as {
          paymentModeBreakdown?: { NEFT: number; UPI: number; CASH: number; CHEQUE: number };
        }).paymentModeBreakdown ?? { NEFT: 0, UPI: 0, CASH: 0, CHEQUE: 0 },
      });
    }
  };

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.partName.trim().length < 2) next.partName = "Part Name/Bill no. is required";
    if (form.providerName.trim().length < 1) next.providerName = "Party name is required";
    if (!Number(form.amount) || Number(form.amount) <= 0) next.amount = "Amount must be greater than zero";
    const received = Number(form.paymentReceivedAmount || 0);
    if (!editing && received > 0) {
      if (!form.paymentReceivedDate) next.paymentReceivedDate = "Payment date is required";
      if (!form.paymentMode) next.paymentMode = "Payment mode is required";
      if (received > Number(form.amount)) next.paymentReceivedAmount = "Payment cannot exceed bill amount";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/spare-parts/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            partName: form.partName,
            providerName: form.providerName,
            purchaseDate: form.purchaseDate,
            amount: Number(form.amount),
          }),
        });
        toast.success("Record updated");
      } else {
        await api("/api/spare-parts", {
          method: "POST",
          body: JSON.stringify({
            partName: form.partName,
            providerName: form.providerName,
            purchaseDate: form.purchaseDate,
            amount: Number(form.amount),
            paymentReceivedAmount: received,
            paymentReceivedDate: received > 0 ? form.paymentReceivedDate : undefined,
            paymentMode: received > 0 ? form.paymentMode : undefined,
          }),
        });
        toast.success("Spare part added");
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save record");
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
        ? `/api/spare-parts/${viewing.id}/payments/${editingPaymentId}`
        : `/api/spare-parts/${viewing.id}/payments`;
      const res = await api<SparePart>(path, {
        method: editingPaymentId ? "PUT" : "POST",
        body: JSON.stringify(paymentForm),
      });
      setViewing(res.data);
      setPaymentForm({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" });
      setEditingPaymentId(null);
      toast.success(editingPaymentId ? "Payment updated" : "Payment recorded");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save payment");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/spare-parts/${deleting.id}`, { method: "DELETE" });
      toast.success("Record deleted");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to delete record");
    }
  };

  const exportRows = async () => {
    const res = await api<SparePart[]>(`/api/spare-parts${qs({ ...filters, page: 1, limit: 500 })}`);
    const rows: Record<string, unknown>[] = [];
    for (const row of res.data) {
      if (!row.payments?.length) {
        rows.push({
          partName: row.partName,
          partyName: row.providerName,
          purchaseDate: formatDate(row.purchaseDate),
          billAmount: row.amount,
          paymentAmount: 0,
          paymentDate: "",
          paymentMode: "",
          totalPaid: row.totalPaidAmount,
          pending: row.pendingAmount,
          status: row.paymentStatus,
        });
      } else {
        for (const payment of row.payments) {
          rows.push({
            partName: row.partName,
            partyName: row.providerName,
            purchaseDate: formatDate(row.purchaseDate),
            billAmount: row.amount,
            paymentAmount: payment.amount,
            paymentDate: formatDate(payment.receivedDate),
            paymentMode: payment.paymentMode,
            totalPaid: row.totalPaidAmount,
            pending: row.pendingAmount,
            status: row.paymentStatus,
          });
        }
      }
    }
    exportCsv("spare-parts.csv", rows);
  };

  const chartData = useMemo(() => {
    const months = Array.from(
      new Set([...summary.monthlyExpenditure.map((x) => x.month), ...summary.monthlyPaid.map((x) => x.month)]),
    ).sort();
    return months.map((month) => ({
      month,
      billing: summary.monthlyExpenditure.find((x) => x.month === month)?.amount ?? 0,
      paid: summary.monthlyPaid.find((x) => x.month === month)?.amount ?? 0,
    }));
  }, [summary]);

  const pieData = [
    { name: "NEFT", value: summary.paymentModeBreakdown.NEFT },
    { name: "UPI", value: summary.paymentModeBreakdown.UPI },
    { name: "Cash", value: summary.paymentModeBreakdown.CASH },
    { name: "Cheque", value: summary.paymentModeBreakdown.CHEQUE },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Spare Parts</h2>
          <p className="text-sm text-slate-500">Purchase bills and partial payments to spare-part vendors.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void exportRows()}>
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setErrors({});
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Spare Part
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Total bill amount</p>
          <p className="mt-2 text-2xl font-semibold text-navy">{formatINR(summary.totalExpenditure)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Amount paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{formatINR(summary.totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending amount</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">{formatINR(summary.totalPending)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total records</p>
          <p className="mt-2 text-2xl font-semibold text-navy">{summary.totalRecords}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="mb-3 font-semibold text-navy">Monthly billing vs payments</h3>
          <div className="h-56">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatINR(Number(value))} />
                  <Legend />
                  <Line dataKey="billing" stroke="#0B1F3A" name="Billing" />
                  <Line dataKey="paid" stroke="#059669" name="Paid" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No chart data" description="Add spare part purchases to see trends." />
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold text-navy">Payment mode breakdown</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PAYMENT_MODE_COLORS[entry.name.toUpperCase() === "CASH" ? "CASH" : entry.name.toUpperCase() === "CHEQUE" ? "CHEQUE" : entry.name] ?? "#64748B"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatINR(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold text-navy">Monthly expenditure</h3>
        <div className="h-48">
          {summary.monthlyExpenditure.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyExpenditure}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Bar dataKey="amount" fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No expenses yet" description="Add spare part purchases to see monthly spend." />
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Input
            placeholder="Search Part Name/Bill no. or party name"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, page: 1, search: e.target.value })}
          />
          <Input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, page: 1, fromDate: e.target.value })} />
          <Input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, page: 1, toDate: e.target.value })} />
          <Select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, page: 1, paymentStatus: e.target.value })}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
          </Select>
          <Select value={filters.sort} onChange={(e) => setFilters({ ...filters, page: 1, sort: e.target.value })}>
            <option value="date_desc">Newest purchase</option>
            <option value="date_asc">Oldest purchase</option>
            <option value="amount_high">Highest amount</option>
            <option value="amount_low">Lowest amount</option>
          </Select>
        </div>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3">Part Name/Bill no.</th>
                  <th className="pb-3">Party name</th>
                  <th className="pb-3">Purchase date</th>
                  <th className="pb-3">Bill amount</th>
                  <th className="pb-3">Paid</th>
                  <th className="pb-3">Pending</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-navy">{row.partName}</td>
                    <td>{row.providerName}</td>
                    <td>{formatDate(row.purchaseDate)}</td>
                    <td>{formatINR(row.amount)}</td>
                    <td className="text-emerald-700">{formatINR(row.totalPaidAmount)}</td>
                    <td className="text-red-600">{formatINR(row.pendingAmount)}</td>
                    <td>
                      <StatusBadge status={row.paymentStatus} />
                    </td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setViewing(row); setEditingPaymentId(null); setPaymentForm({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" }); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(row);
                          setForm({
                            partName: row.partName,
                            providerName: row.providerName,
                            purchaseDate: toInputDate(row.purchaseDate),
                            amount: String(row.amount),
                            paymentReceivedAmount: "0",
                            paymentReceivedDate: "",
                            paymentMode: "",
                          });
                          setErrors({});
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(row)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No spare part records" description="Record purchases to track maintenance spend." />
        )}
        <Pagination page={filters.page} totalPages={meta.totalPages} onPage={(page) => setFilters((c) => ({ ...c, page }))} />
      </Card>

      <Dialog open={open} title={editing ? "Edit spare part" : "Add spare part"} onClose={() => setOpen(false)} className="max-w-2xl">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field label="Part Name/Bill no." required error={errors.partName}>
            <Input value={form.partName} onChange={(e) => setForm({ ...form, partName: e.target.value })} />
          </Field>
          <Field label="Party name" required error={errors.providerName}>
            <Input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
          </Field>
          <Field label="Purchase date" required>
            <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </Field>
          <Field label="Bill amount" required error={errors.amount}>
            <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          {!editing ? (
            <>
              <Field label="Payment amount" error={errors.paymentReceivedAmount}>
                <Input type="number" min="0" step="0.01" value={form.paymentReceivedAmount} onChange={(e) => setForm({ ...form, paymentReceivedAmount: e.target.value })} />
              </Field>
              <Field label="Payment date" error={errors.paymentReceivedDate}>
                <Input type="date" value={form.paymentReceivedDate} onChange={(e) => setForm({ ...form, paymentReceivedDate: e.target.value })} />
              </Field>
              <Field label="Payment mode" error={errors.paymentMode}>
                <Select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as typeof form.paymentMode })}>
                  <option value="">Select if payment made</option>
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

      <Dialog open={Boolean(viewing)} title="Spare part details" onClose={() => setViewing(null)} className="max-w-3xl">
        {viewing ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p><span className="text-slate-500">Part Name/Bill no.:</span> {viewing.partName}</p>
              <p><span className="text-slate-500">Party name:</span> {viewing.providerName}</p>
              <p><span className="text-slate-500">Purchase date:</span> {formatDate(viewing.purchaseDate)}</p>
              <p><span className="text-slate-500">Status:</span> <StatusBadge status={viewing.paymentStatus} /></p>
              <p><span className="text-slate-500">Bill amount:</span> {formatINR(viewing.amount)}</p>
              <p><span className="text-slate-500">Paid:</span> {formatINR(viewing.totalPaidAmount)}</p>
              <p><span className="text-slate-500">Pending:</span> {formatINR(viewing.pendingAmount)}</p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-navy">Payment history</h4>
              {viewing.payments?.length ? (
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
                <Field label="Payment date">
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
                    <Button type="button" variant="outline" className="w-full" onClick={() => { setEditingPaymentId(null); setPaymentForm({ amount: "", receivedDate: todayIso(), paymentMode: "NEFT" }); }}>
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
        title="Delete spare part record?"
        description="This expense record and its payment history will be permanently removed."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
