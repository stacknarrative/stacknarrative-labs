import { useState } from 'react';

type Status = 'pending' | 'scanning' | 'scanned' | 'duplicate' | 'no_url' | 'error';

interface Row {
  name: string;
  status: Status;
  detail?: string;
  companyId?: string;
}

const STATUS_STYLE: Record<Status, string> = {
  pending: 'text-neutral-500',
  scanning: 'text-sky-400',
  scanned: 'text-emerald-400',
  duplicate: 'text-amber-400',
  no_url: 'text-amber-400',
  error: 'text-red-400',
};

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Waiting',
  scanning: 'Scanning…',
  scanned: 'Saved (verified)',
  duplicate: 'Already in DB',
  no_url: 'No match — scan separately',
  error: 'Failed',
};

export function BulkUpload() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  function loadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => setText(t));
  }

  async function start() {
    const names = text
      .split(/\r?\n/)
      .map((s) => s.replace(/^[\s,;-]+|[\s,;]+$/g, '').trim())
      .filter(Boolean);
    if (names.length === 0) return;

    const initial: Row[] = names.map((name) => ({ name, status: 'pending' }));
    setRows(initial);
    setRunning(true);

    for (let i = 0; i < names.length; i++) {
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'scanning' } : r)));
      try {
        const res = await fetch('/api/bulk-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: names[i] }),
        });
        const data = (await res.json()) as { status: Status; companyId?: string; url?: string; error?: string; companyName?: string };
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: data.status,
                  companyId: data.companyId,
                  detail: data.error || data.url || data.companyName,
                }
              : r
          )
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'error', detail: err instanceof Error ? err.message : 'failed' } : r))
        );
      }
    }
    setRunning(false);
  }

  const done = rows.filter((r) => r.status !== 'pending' && r.status !== 'scanning').length;

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="text-lg font-semibold">Bulk add by company name</h2>
      <p className="text-sm text-neutral-500">
        Paste company names (one per line) or upload a .txt/.csv. Each one is looked up, its website found, scanned, and
        saved — one at a time.
      </p>

      <textarea
        className="min-h-[120px] w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        placeholder={'Mews\nCloudbeds\nLighthouse'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={running}
      />

      <div className="flex items-center gap-3">
        <input type="file" accept=".txt,.csv" onChange={loadFile} disabled={running} className="text-sm text-neutral-400" />
        <button
          onClick={start}
          disabled={running || text.trim() === ''}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {running ? `Scanning ${done}/${rows.length}…` : 'Start scan'}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded border border-neutral-800">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-neutral-800">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    {r.companyId ? (
                      <a href={`/companies/${r.companyId}`} className="hover:underline">
                        {r.name}
                      </a>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className={`px-3 py-2 ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</td>
                  <td className="px-3 py-2 text-xs text-neutral-500">{r.detail || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
