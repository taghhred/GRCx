import { apiBaseUrl } from "./config";

export class ApiError extends Error {
  status: number;
  body: unknown;
  code: "http" | "network" | "database" | "server";

  constructor(
    status: number,
    message: string,
    body?: unknown,
    code: ApiError["code"] = "http"
  ) {
    super(message);
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  form?: URLSearchParams | FormData;
  auth?: boolean;
};

function detailFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  return null;
}

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-GRCx-CSRF": "1",
      },
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  const auth = opts.auth !== false;
  const method = opts.method ?? (opts.body || opts.form ? "POST" : "GET");
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(
    method.toUpperCase()
  );
  if (mutating) {
    headers["X-GRCx-CSRF"] = "1";
  }

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const doFetch = async () =>
    fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      body,
      credentials: "include",
    });

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new ApiError(0, "Cannot connect to GRCx server.", null, "network");
  }

  if (res.status === 401 && auth) {
    const ok = await refreshSession();
    if (ok) {
      try {
        res = await doFetch();
      } catch {
        throw new ApiError(0, "Cannot connect to GRCx server.", null, "network");
      }
    }
  }

  if (!res.ok) {
    const errBody: unknown = await res
      .clone()
      .json()
      .catch(async () => res.text().catch(() => null));
    const detail = detailFromBody(errBody)?.toLowerCase() ?? "";

    if (res.status === 503 || detail.includes("database")) {
      throw new ApiError(
        res.status,
        "Database connection unavailable.",
        errBody,
        "database"
      );
    }
    if (res.status >= 500) {
      throw new ApiError(
        res.status,
        "Unexpected server error.",
        errBody,
        "server"
      );
    }
    throw new ApiError(
      res.status,
      detailFromBody(errBody) || `API ${res.status}`,
      errBody,
      "http"
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
