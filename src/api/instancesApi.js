const BASE = import.meta.env.VITE_API_URL;

export async function listInstances() {
  const res = await fetch(`${BASE}/instances`);
  return res.json();
}

export async function launchInstance(az) {
  const res = await fetch(`${BASE}/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ az }),
  });
  return res.json();
}

export async function terminateInstance(id) {
  const res = await fetch(`${BASE}/instances/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}