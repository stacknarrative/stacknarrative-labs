import { useState } from 'react';

export function ReviewsPanel({
  companyId,
  initialLikes,
  initialDislikes,
}: {
  companyId: string;
  initialLikes: string;
  initialDislikes: string;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes, dislikes }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Product reviews</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-emerald-400">Likes of product</span>
          <textarea
            className="min-h-[140px] rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="Paste what customers like about the product…"
            value={likes}
            onChange={(e) => setLikes(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-amber-400">Dislikes of product</span>
          <textarea
            className="min-h-[140px] rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100"
            placeholder="Paste what customers dislike or want improved…"
            value={dislikes}
            onChange={(e) => setDislikes(e.target.value)}
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save reviews'}
        </button>
        {saved && <span className="text-sm text-emerald-400">Saved.</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
