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
import { formatDate } from "@/lib/utils";
import { ApiError, api, qs } from "@/services/api";
import type { ApiList, Vehicle } from "@/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

const emptyForm = { vehicleType: "TM" as "TM" | "DUMPER", registrationNumber: "" };

export default function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  const load = async () => {
    const res = await api<Vehicle[]>(`/api/vehicles${qs({ search, vehicleType, page, limit: 10 })}`);
    setItems(res.data);
    setMeta(res.meta as ApiList<Vehicle>["meta"]);
  };

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, vehicleType, page]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setForm({ vehicleType: vehicle.vehicleType, registrationNumber: vehicle.registrationNumber });
    setErrors({});
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.registrationNumber.trim()) next.registrationNumber = "Registration number is required";
    else if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i.test(form.registrationNumber)) {
      next.registrationNumber = "Use a format such as GJ06AB1234";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api(editing ? `/api/vehicles/${editing.id}` : "/api/vehicles", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          vehicleType: form.vehicleType,
          registrationNumber: form.registrationNumber.toUpperCase(),
        }),
      });
      toast.success(editing ? "Vehicle updated" : "Vehicle added");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/vehicles/${deleting.id}`, { method: "DELETE" });
      toast.success("Vehicle deleted");
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to delete vehicle");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Vehicles</h2>
          <p className="text-sm text-slate-500">Register TM and dumper vehicles used for transportation.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Input placeholder="Search registration number" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          <Select value={vehicleType} onChange={(e) => { setPage(1); setVehicleType(e.target.value); }}>
            <option value="">All types</option>
            <option value="TM">TM</option>
            <option value="DUMPER">Dumper</option>
          </Select>
        </div>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3">Registration</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Created</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((vehicle) => (
                  <tr key={vehicle.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-navy">{vehicle.registrationNumber}</td>
                    <td>{vehicle.vehicleType}</td>
                    <td>{formatDate(vehicle.createdAt)}</td>
                    <td className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(vehicle)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(vehicle)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No vehicles found" description="Add your first TM or dumper to start billing." />
        )}
        <Pagination page={meta.page} totalPages={meta.totalPages} onPage={setPage} />
      </Card>

      <Dialog open={open} title={editing ? "Edit vehicle" : "Add vehicle"} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Vehicle type" required>
            <Select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value as "TM" | "DUMPER" })}>
              <option value="TM">TM</option>
              <option value="DUMPER">Dumper</option>
            </Select>
          </Field>
          <Field label="Vehicle number plate" required error={errors.registrationNumber}>
            <Input
              value={form.registrationNumber}
              onChange={(e) => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })}
              placeholder="GJ06AB1234"
            />
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
        title="Delete vehicle?"
        description="This cannot be undone. Vehicles used in transactions cannot be deleted."
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
