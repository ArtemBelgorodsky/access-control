const base = 'https://c748fc988f763776.mokky.dev';
for (const name of ['employees', 'departments', 'positions', 'rooms', 'access_levels', 'permissions', 'face_templates', 'access_events']) {
  try {
    const response = await fetch(`${base}/${name}`, { signal: AbortSignal.timeout(15000) });
    const data = await response.json().catch(() => null);
    console.log(JSON.stringify({ resource: name, status: response.status, count: Array.isArray(data) ? data.length : undefined, fields: Array.isArray(data) && data[0] ? Object.keys(data[0]) : undefined }));
  } catch (error) { console.log(JSON.stringify({ resource: name, error: error.message })); }
}
