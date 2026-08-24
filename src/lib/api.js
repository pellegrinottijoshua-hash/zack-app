/**
 * @fastify/multipart exposes sibling fields on the file part only when they
 * were appended BEFORE it. Order matters — do not move the file append.
 */
function form(fields, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  fd.append('file', file);
  return fd;
}

async function errorOf(res) {
  try {
    const j = await res.clone().json();
    return j.error || `HTTP ${res.status}`;
  } catch {
    const t = await res.text().catch(() => '');
    return t.slice(0, 300) || `HTTP ${res.status}`;
  }
}

async function post(url, fd) {
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await errorOf(res));
  return res;
}

function metaOf(res) {
  const raw = res.headers.get('X-Meta');
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return {};
  }
}

async function json(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await errorOf(res));
  return res.json();
}

export async function health() {
  return json('/api/health');
}

export async function removeBg(file, { model, detail, decontaminate }) {
  const res = await post('/api/remove-bg', form({ model, detail, decontaminate }, file));
  return { blob: await res.blob(), meta: metaOf(res) };
}

export async function vectorize(file, { preset, clean }) {
  const res = await post('/api/vectorize', form({ preset, clean }, file));
  return { text: await res.text(), meta: metaOf(res) };
}

export async function exportPreset(file, { preset, background, isVector }) {
  const res = await post('/api/export', form({ preset, background, isVector }, file));
  return { blob: await res.blob(), meta: metaOf(res) };
}

export async function cleanSvg(svg) {
  return json('/api/svg/clean', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ svg }),
  });
}

export async function saveSvg(svg, name) {
  return json('/api/svg/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ svg, name }),
  });
}

export async function library() {
  return json('/api/library');
}

export async function removeWork(id) {
  return json(`/api/library/${id}`, { method: 'DELETE' });
}

export const fileUrl = (id) => `/api/library/${id}/file`;
export const bundleUrl = () => '/api/library/bundle';

/** Trigger a browser download without leaving the page. */
export function download(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
