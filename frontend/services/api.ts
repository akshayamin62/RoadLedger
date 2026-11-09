export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type ApiSuccess<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
  summary?: { totalExpenditure: number; monthlyExpenditure: { month: string; amount: number }[] };
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<ApiSuccess<T>> {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const json = (await response.json().catch(() => ({}))) as ApiSuccess<T> & { message?: string; details?: unknown };
  if (!response.ok || json.success === false) {
    throw new ApiError(response.status, json.message || "Request failed", json.details);
  }
  return json;
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}
