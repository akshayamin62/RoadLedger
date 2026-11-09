import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "PAID") return <Badge className="bg-emerald-50 text-emerald-700">Paid</Badge>;
  if (status === "PARTIALLY_PAID") return <Badge className="bg-orange-50 text-orange-700">Partially Paid</Badge>;
  return <Badge className="bg-red-50 text-red-700">Pending</Badge>;
}
