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
import { companyLabel, formatDate } from "@/lib/utils";
import { ApiError, api, qs } from "@/services/api";
import type { ApiList, Party } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const emptyForm = { name: "", gstNumber: "", company: "JAY_ROADWAYS" as Party["company"] };
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function PartiesPage() {
  const [items, setItems] = useState<Party[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Party | null>(null);

  const load = async () => {
    const res = await api<Party[]>(`/api/parties${qs({ search, company, page, limit: 10 })}`);
    setItems(res.data);
    setMeta(res.meta as ApiList<Party>["meta"]);
  };

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, company, page]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (party: Party) => {
    setEditing(party);
    setForm({ name: party.name, gstNumber: party.gstNumber, company: party.company });
    setErrors({});
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Party name is required";
    if (!GST_REGEX.test(form.gstNumber.toUpperCase())) next.gstNumber = "Invalid GST number";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await api(editing ? `/api/parties/${editing.id}` : "/api/parties", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...form, gstNumber: form.gstNumber.toUpperCase() }),
      });
      toast.success(editing ? "Party updated" : "Party added");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save party");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/parties/${deleting.id}`, { method: "DELETE" });
      toast.success("Party deleted");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to delete party");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Parties</h2>
          <p className="text-sm text-slate-500">Buyers and customers billed for transportation services.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Party
        </Button>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Input placeholder="Search name or GST" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <Select value={company} onChange={(e) => { setPage(1); setCompany(e.target.value); }}>
            <option value="">All companies</option>
            <option value="JAY_ROADWAYS">Jay Roadways (JR)</option>
            <option value="JAY_INFRA">Jay Infra (JI)</option>
          </Select>
        </div>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3">Party</th>
                  <th className="pb-3">GST</th>
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((party) => (
                  <tr key={party.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-navy">{party.name}</td>
                    <td>{party.gstNumber}</td>
                    <td>{companyLabel(party.company)}</td>
                    <td>{formatDate(party.createdAt)}</td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(party)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(party)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No parties found" description="Add a buyer to start creating bills." />
        )}
        <Pagination page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
      </Card>

      <Dialog open={open} title={editing ? "Edit party" : "Add party"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Party name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="GST number" required error={errors.gstNumber}>
            <Input
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
              placeholder="24ABCDE1234F1Z5"
            />
          </Field>
          <Field label="Company / business belongs to" required>
            <Select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value as Party["company"] })}>
              <option value="JAY_ROADWAYS">Jay Roadways (JR)</option>
              <option value="JAY_INFRA">Jay Infra (JI)</option>
            </Select>
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
        title="Delete party?"
        description="This cannot be undone. Parties used in transactions cannot be deleted."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
