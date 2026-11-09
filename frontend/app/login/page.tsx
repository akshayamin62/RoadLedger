"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, api } from "@/services/api";
import type { User } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!email) nextErrors.email = "Email is required";
    if (!password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const res = await api<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(res.data);
      toast.success("Welcome back");
      router.replace("/");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-200">RoadLedger</p>
          <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">
            Commercial vehicle operations, billing, and collections in one place.
          </h1>
        </div>
        <p className="max-w-md text-sm text-blue-100">
          Track TM and dumper usage, party billing, partial payments, spare parts, and a complete activity trail for Jay
          Roadways and Jay Infra.
        </p>
      </div>
      <div className="flex items-center justify-center bg-surface p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
          <h2 className="text-2xl font-semibold text-navy">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your administrator email and password.</p>
          <div className="mt-6 space-y-4">
            <Field label="Email" required error={errors.email}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" />
            </Field>
            <Field label="Password" required error={errors.password}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          <Button className="mt-6 w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="mt-4 text-center text-sm text-slate-500">
            First time here?{" "}
            <Link href="/register" className="font-medium text-accent">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
