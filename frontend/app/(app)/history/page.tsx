"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { api, qs } from "@/services/api";
import type { Activity, ApiList } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function HistoryPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 });
  const [filters, setFilters] = useState({
    search: "",
    module: "",
    action: "",
    fromDate: "",
    toDate: "",
    page: 1,
  });

  const load = async () => {
    const res = await api<Activity[]>(`/api/history${qs({ ...filters, limit: 12 })}`);
    setItems(res.data);
    setMeta(res.meta as ApiList<Activity>["meta"]);
  };

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-navy">History</h2>
        <p className="text-sm text-slate-500">
          Immutable activity log generated automatically by the backend. These records cannot be edited or deleted.
        </p>
      </div>
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Input placeholder="Search description, user, or record ID" value={filters.search} onChange={(e) => setFilters({ ...filters, page: 1, search: e.target.value })} />
          <Select value={filters.module} onChange={(e) => setFilters({ ...filters, page: 1, module: e.target.value })}>
            <option value="">All modules</option>
            <option value="AUTH">Auth</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="PARTY">Party</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="PAYMENT">Payment</option>
            <option value="SPARE_PART">Spare part</option>
          </Select>
          <Select value={filters.action} onChange={(e) => setFilters({ ...filters, page: 1, action: e.target.value })}>
            <option value="">All actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATED">Created</option>
            <option value="UPDATED">Updated</option>
            <option value="DELETED">Deleted</option>
            <option value="PAYMENT_RECEIVED">Payment received</option>
            <option value="PAYMENT_MADE">Payment made</option>
          </Select>
          <Input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, page: 1, fromDate: e.target.value })} />
          <Input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, page: 1, toDate: e.target.value })} />
        </div>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3">Serial</th>
                  <th className="pb-3">Activity</th>
                  <th className="pb-3">Module</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Related ID</th>
                  <th className="pb-3">Date and time</th>
                  <th className="pb-3">Performed by</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3">{row.serialNumber}</td>
                    <td className="font-medium text-navy">{row.action.replaceAll("_", " ")}</td>
                    <td>{row.module.replaceAll("_", " ")}</td>
                    <td className="max-w-xs">{row.description}</td>
                    <td className="font-mono text-xs">{row.relatedRecordId ?? "—"}</td>
                    <td>{formatDateTime(row.dateTime)}</td>
                    <td>{row.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No activity yet" description="Login, billing, and record changes will appear automatically." />
        )}
        <Pagination page={filters.page} totalPages={meta.totalPages} onPage={(page) => setFilters((c) => ({ ...c, page }))} />
      </Card>
    </div>
  );
}
