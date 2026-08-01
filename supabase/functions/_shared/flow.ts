const encoder = new TextEncoder();

export function flowBaseUrl() {
  return Deno.env.get('FLOW_ENV') === 'production'
    ? 'https://www.flow.cl/api'
    : 'https://sandbox.flow.cl/api';
}

export async function signFlow(params: Record<string, string | number>, secretKey: string) {
  const source = Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(source));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function flowPost(path: string, params: Record<string, string | number>) {
  const apiKey = Deno.env.get('FLOW_API_KEY') || '';
  const secretKey = Deno.env.get('FLOW_SECRET_KEY') || '';
  if (!apiKey || !secretKey) throw new Error('Flow no está configurado.');
  const signed = { apiKey, ...params };
  const s = await signFlow(signed, secretKey);
  const body = new URLSearchParams(Object.entries({ ...signed, s }).map(([k, v]) => [k, String(v)]));
  const response = await fetch(`${flowBaseUrl()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Flow respondió ${response.status}.`);
  return data;
}

export async function flowGet(path: string, params: Record<string, string | number>) {
  const apiKey = Deno.env.get('FLOW_API_KEY') || '';
  const secretKey = Deno.env.get('FLOW_SECRET_KEY') || '';
  if (!apiKey || !secretKey) throw new Error('Flow no está configurado.');
  const signed = { apiKey, ...params };
  const s = await signFlow(signed, secretKey);
  const query = new URLSearchParams(Object.entries({ ...signed, s }).map(([k, v]) => [k, String(v)]));
  const response = await fetch(`${flowBaseUrl()}${path}?${query}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Flow respondió ${response.status}.`);
  return data;
}
