function ComposeDialog({ mode, initial, onClose, onSend, onError }) {
  const [to, setTo] = useState(initial?.to || '');
  const [cc, setCc] = useState(initial?.cc || '');
  const [bcc, setBcc] = useState(initial?.bcc || '');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initial?.subject || '');
  const [body, setBody] = useState(initial?.body || '');
  const [sending, setSending] = useState(false);
  const dialogRef = useRef(null);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => {
      const target = mode === 'forward' ? dialogRef.current?.querySelector('textarea') : dialogRef.current?.querySelector('input[name="to"]');
      target?.focus();
    }, 50);
  }, [mode]);

  // Esc to close, focus trap
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        tryClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (recipientsValid()) handleSend();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const recipientsValid = () => /\S+@\S+\.\S+/.test(to);

  const tryClose = () => {
    if (body.trim().length > 0) {
      const ok = window.confirm('Discard this message?');
      if (!ok) return;
    }
    onClose();
  };

  const handleSend = async () => {
    setSending(true);
    await sleep(800);
    onSend({ to: to.split(',').map((s) => s.trim()).filter(Boolean), cc: cc ? [cc] : [], bcc: bcc ? [bcc] : [], subject, body });
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 overlay-in" style={{ background: 'rgba(2, 6, 23, 0.55)', backdropFilter: 'blur(4px)' }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'forward' ? 'Forward message' : 'New message'}
        className="dialog-in w-[640px] max-h-[88vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
      >
        <div className="h-11 px-4 flex items-center gap-2 border-b border-slate-800">
          <I.Send size={13} className="text-slate-400" />
          <span className="text-[13px] font-semibold text-slate-100">
            {mode === 'forward' ? 'Forward' : 'New message'}
          </span>
          <button onClick={tryClose} className="ml-auto text-slate-500 hover:text-slate-200" aria-label="Close">
            <I.X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FieldRow label="To">
            <input
              name="to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="name@example.com"
              className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
            {!showCcBcc && (
              <button onClick={() => setShowCcBcc(true)} className="text-[11px] text-slate-500 hover:text-slate-300">Cc/Bcc</button>
            )}
          </FieldRow>
          {showCcBcc && (
            <>
              <FieldRow label="Cc">
                <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none" />
              </FieldRow>
              <FieldRow label="Bcc">
                <input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none" />
              </FieldRow>
            </>
          )}
          <FieldRow label="Subject">
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-600 focus:outline-none" />
          </FieldRow>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={12}
            className="w-full px-4 py-3.5 bg-transparent text-[13.5px] text-slate-100 placeholder:text-slate-600 leading-[1.7] resize-y focus:outline-none min-h-[240px]"
            style={{ fontFeatureSettings: '"ss01"' }}
          />
        </div>

        <div className="px-3 py-2.5 flex items-center gap-2 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={handleSend}
            disabled={!recipientsValid() || sending}
            className="h-8 px-3.5 rounded-md bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            {sending ? <I.Refresh size={12} className="spin" /> : <I.Send size={12} strokeWidth={2.2} />}
            {sending ? 'Sending…' : 'Send'}
          </button>
          <kbd>⌘</kbd><span className="text-[10.5px] text-slate-500 -ml-1">+</span><kbd>↵</kbd>
          <span className="text-[10.5px] text-slate-500">to send</span>
          <div className="ml-auto flex items-center gap-1.5 text-slate-500">
            <button className="hover:text-slate-200 transition-colors p-1" title="Attach"><I.Paperclip size={13} /></button>
            <button onClick={tryClose} className="hover:text-slate-200 transition-colors text-[11.5px] px-2">Discard</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="h-10 px-4 flex items-center gap-3 border-b border-slate-800/60">
      <span className="text-[11.5px] text-slate-500 w-12">{label}</span>
      {children}
    </div>
  );
}

window.ComposeDialog = ComposeDialog;
