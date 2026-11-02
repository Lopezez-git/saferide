const base = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  try {
    const r = await fetch(base + "/api/v1" + path, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(
        data.message ?? "Não foi possível concluir a solicitação.",
      );
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      throw new Error("A consulta demorou demais. Tente novamente.");
    throw e;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Não foi possível concluir. Tente novamente.";
export type User = {
  id: string;
  email: string;
  name: string;
  activity: string;
  vehicle: string;
  platforms: string[];
  role: string;
};
export type Report = {
  id: string;
  title: string;
  body: string;
  category: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  reviewedAt?: string;
  validUntil?: string;
  source?: string;
  status?: string;
};
export type Post = {
  id: string;
  authorId: string;
  author: string;
  platforms: string;
  category: string;
  body: string;
  createdAt: string;
  comments: number;
};
export type Comment = {
  id: string;
  authorId: string;
  author: string;
  body: string;
  createdAt: string;
};
export const when = (date: string) =>
  new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
