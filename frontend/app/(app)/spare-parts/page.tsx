"use client";

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
import type { ApiList, SparePart } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const emptyForm = { partName: "", providerName: "", purchaseDate: todayIso(), amount: "" };

export default function SparePartsPage() {
  const [items, setItems] = useState<SparePart[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [summary, setSummary] = useState({ totalExpenditure: 0, monthlyExpenditure: [] as { month: string; amount: number }[] });
  const [filters, setFilters] = useState({ search: "", fromDate: "", toDate: "", sort: "date_desc", page: 1 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SparePart | null>(null);

  const load = async () => {
    const res = await api<SparePart[]>(`/api/spare-parts${qs({ ...filters, limit: 10 })}`);
    setItems(res.data);
    setMeta(res.meta as ApiList<SparePart>["meta"]);
    const extra = res as typeof res & { summary?: { totalExpenditure: number; monthlyExpenditure: { month: string; amount: number }[] } };
    if (extra.summary) setSummary(extra.summary);
  };

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.partName.trim().length < 2) next.partName = "Part name is required";
    if (form.providerName.trim().length < 2) next.providerName = "Provider name is required";
    if (!Number(form.amount) || Number(form.amount) <= 0) next.amount = "Amount must be greater than zero";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await api(editing ? `/api/spare-parts/${editing.id}` : "/api/spare-parts", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      toast.success(editing ? "Record updated" : "Spare part added");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save record");
    } finally {
      setSaving(false);
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
    exportCsv(
      "spare-parts.csv",
      res.data.map((row) => ({
        partName: row.partName,
        providerName: row.providerName,
        purchaseDate: formatDate(row.purchaseDate),
        amount: row.amount,
      })),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Spare Parts</h2>
          <p className="text-sm text-slate-500">Track purchase expenses independently of billing collections.</p>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total spare parts expenditure</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{formatINR(summary.totalExpenditure)}</p>
        </Card>
        <Card className="xl:col-span-2">
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
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input placeholder="Search part or provider" value={filters.search} onChange={(e) => setFilters({ ...filters, page: 1, search: e.target.value })} />
          <Input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, page: 1, fromDate: e.target.value })} />
          <Input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, page: 1, toDate: e.target.value })} />
          <Select value={filters.sort} onChange={(e) => setFilters({ ...filters, page: 1, sort: e.target.value })}>
            <option value="date_desc">Newest purchase</option>
            <option value="date_asc">Oldest purchase</option>
            <option value="amount_high">Highest amount</option>
            <option value="amount_low">Lowest amount</option>
          </Select>
        </div>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3">Part</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Purchase date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-navy">{row.partName}</td>
                    <td>{row.providerName}</td>
                    <td>{formatDate(row.purchaseDate)}</td>
                    <td className="text-red-600">{formatINR(row.amount)}</td>
                    <td className="text-right">
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

      <Dialog open={open} title={editing ? "Edit spare part" : "Add spare part"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Part name" required error={errors.partName}>
            <Input value={form.partName} onChange={(e) => setForm({ ...form, partName: e.target.value })} />
          </Field>
          <Field label="Spare part provider name" required error={errors.providerName}>
            <Input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
          </Field>
          <Field label="Purchase date" required>
            <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          </Field>
          <Field label="Amount" required error={errors.amount}>
            <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete spare part record?"
        description="This expense record will be permanently removed."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
