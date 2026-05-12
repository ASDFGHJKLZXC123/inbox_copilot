function AppToast({ toasts, dismiss }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[60] flex flex-col-reverse gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, dismiss }) {
  const variantStyles = {
    error: 'bg-rose-900/90 border-rose-700/60 text-rose-50',
    info: 'bg-slate-900/95 border-slate-700/80 text-slate-100',
  }[toast.variant || 'info'];

  const Icon = toast.variant === 'error' ? I.X : I.Check;

  return (
    <div
      className={
        'toast-in pointer-events-auto min-w-[280px] max-w-[420px] px-3.5 py-2.5 rounded-lg border shadow-2xl shadow-black/60 backdrop-blur flex items-start gap-2.5 ' +
        variantStyles
      }
    >
      <div className={
        'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ' +
        (toast.variant === 'error' ? 'bg-rose-500/50' : 'bg-emerald-500/40')
      }>
        <Icon size={10} strokeWidth={2.6} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] leading-snug">{toast.message}</div>
        {toast.retry && (
          <button
            onClick={() => { toast.retry(); dismiss(toast.id); }}
            className="mt-1.5 text-[11.5px] font-semibold text-sky-300 hover:text-sky-200"
          >
            Undo
          </button>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        className="text-slate-400 hover:text-slate-100 flex-shrink-0 -mr-1"
        aria-label="Dismiss"
      >
        <I.X size={13} />
      </button>
    </div>
  );
}

window.AppToast = AppToast;
