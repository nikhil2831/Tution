export async function send(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (response.ok) return response;
  const result = await response.json().catch(() => null);
  throw new Error(result?.error || "Something went wrong. Please try again.");
}
