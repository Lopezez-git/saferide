export type Occurrence = {
  id: number;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  precision: string;
  occurredAt: string;
  source: string;
};
export type Post = {
  id: number;
  author: string;
  category: string;
  body: string;
  createdAt: string;
  comments: number;
};
export type Profile = {
  demo: boolean;
  name: string;
  activity: string;
  vehicle: string;
  platforms: string[];
};
export type DemoList<T> = { demo: boolean; items: T[] };
const base = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8080";
export async function getDemo<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}/api/v1/demo/${path}`, { signal });
  if (!response.ok)
    throw new Error("Não foi possível consultar a demonstração.");
  const data = await response.json();
  if (data.demo !== true)
    throw new Error("Esta versão aceita somente dados de demonstração.");
  return data as T;
}
