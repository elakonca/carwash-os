export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <button
        type="button"
        className="rounded-lg border px-3 py-1 disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Önceki
      </button>
      <span className="text-slate-500">
        {page} / {pages}
      </span>
      <button
        type="button"
        className="rounded-lg border px-3 py-1 disabled:opacity-40"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Sonraki
      </button>
    </div>
  );
}
