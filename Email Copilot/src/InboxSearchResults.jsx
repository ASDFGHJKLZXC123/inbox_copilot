function InboxSearchResults({ query, results, pending, selectedThreadId, onSelectThread, hasActiveReminder }) {
  if (pending) {
    return (
      <div className="px-4 py-3 space-y-3">
        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <I.Refresh size={11} className="spin" />
          Searching local mailbox…
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-2 w-[70%]" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
          <I.Search size={16} />
        </div>
        <div className="text-[12.5px] font-medium text-slate-300 mb-1">No matches</div>
        <div className="text-[11.5px] text-slate-500 max-w-[260px] mx-auto leading-relaxed">
          No matches in your synced mail. Try refreshing or expanding sync.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2 text-[10.5px] uppercase tracking-wide text-slate-500 font-medium border-b border-slate-900/80">
        {results.length} {results.length === 1 ? 'result' : 'results'} · local mailbox
      </div>
      <ul>
        {results.map((r) => (
          <SearchResultRow
            key={r.thread.id}
            result={r}
            query={query}
            selected={r.thread.id === selectedThreadId}
            onSelect={() => onSelectThread(r.thread)}
            hasReminder={hasActiveReminder(r.thread.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function highlight(text, query) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-sky-400/25 text-sky-100 px-0.5 rounded">{p}</mark>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function SearchResultRow({ result, query, selected, onSelect, hasReminder }) {
  const { thread, score } = result;
  return (
    <li>
      <button
        onClick={onSelect}
        className={
          'group relative w-full px-4 py-3 text-left border-b border-slate-900/80 transition-colors ' +
          (selected ? 'bg-slate-900/80' : 'hover:bg-slate-900/50')
        }
      >
        {selected && <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-sky-400 rounded-r" />}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[12.5px] text-slate-200 font-medium truncate flex-1">
            {MOCK.nameOf(thread.participants[0])}
          </span>
          <span className="text-[10px] tabular-nums text-slate-500 px-1.5 h-4 rounded bg-slate-800 flex items-center">
            {Math.round(score * 100)}
          </span>
        </div>
        <div className="text-[12.5px] text-slate-100 mb-0.5 truncate">{highlight(thread.subject, query)}</div>
        <div className="text-[11.5px] text-slate-500 line-clamp-1">{highlight(thread.preview || '', query)}</div>
      </button>
    </li>
  );
}

window.InboxSearchResults = InboxSearchResults;
