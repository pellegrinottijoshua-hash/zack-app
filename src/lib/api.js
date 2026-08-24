/**
 * @fastify/multipart exposes sibling fields on the file part only when they
 * were appended BEFORE it. Order matters here — do not move the file append.
 */
function form(fields, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('file', file);
  return fd;
}

async function post(url, fd) {
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res;
}

export async function removeBg(file, model) {
  const res = await post('/api/remove-bg', form({ model }, file));
  return res.blob();
}

export async function exportPreset(file, preset) {
  const res = await post('/api/export', form({ preset }, file));
  const meta = JSON.parse(res.headers.get('X-Export-Meta') || '{}');
  return { blob: await res.blob(), meta };
}

export async function health() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('API non raggiungibile');
  return res.json();
}
