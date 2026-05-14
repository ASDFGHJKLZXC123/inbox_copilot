function EmailDetail({
  card,
  threadMessages,
  showComposer,
  setShowComposer,
  position,
  total,
  onPrev,
  onNext,
  onModify,
  onForward,
  onSendReply,
  onError,
  replyText,
  setReplyText,
  modifying,
  syncing,
  aiPanelSlot,
  reminderPanelSlot,
  authError,
}) {
  const [expandedIds, setExpandedIds] = useState(() =>
    threadMessages.length ? new Set([threadMessages[threadMessages.length - 1].id]) : new Set()
  );
  const [sending, setSending] = useState(false);

  // Expand only the latest message when thread changes
  useEffect(() => {
    if (threadMessages.length) {
      setExpandedIds(new Set([threadMessages[threadMessages.length - 1].id]));
    }
  }, [card?.id]);

  if (!card) {
    return <EmptyDetail />;
  }

  const lastMessage = threadMessages[threadMessages.length - 1];
  const replyTo = lastMessage ? MOCK.nameOf(lastMessage.from) : '';

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    setSending(true);
    await sleep(700);
    onSendReply();
    setSending(false);
  };

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-slate-950">
      {/* Auth error banner (polish pass) */}
      {authError && (
        <div className="px-4 py-2 bg-amber-400/10 border-b border-amber-400/20 flex items-center gap-2 text-[11.5px] text-amber-200">
          <I.Bell size={12} />
          <span>Your Google scopes changed. Reconnect to enable send.</span>
          <button className="ml-auto h-6 px-2.5 rounded bg-amber-300 text-slate-950 font-medium text-[11px]">Reconnect</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="h-14 px-4 flex items-center gap-1.5 border-b border-slate-800/80">
        <ToolbarButton icon={I.ChevronLeft} label="Previous" onClick={onPrev} disabled={position <= 1} />
        <ToolbarButton icon={I.ChevronRight} label="Next" onClick={onNext} disabled={position >= total} />
        <span className="text-[11px] text-slate-500 tabular-nums mx-2">{position} / {total}</span>

        <div className="w-px h-5 bg-slate-800 mx-1" />

        <ToolbarButton icon={I.Archive} label="Archive (E)" onClick={() => onModify('archive')} disabled={modifying} />
        <ToolbarButton icon={I.Trash} label="Trash (#)" onClick={() => onModify('trash')} disabled={modifying} />
        <ToolbarButton icon={I.Clock} label="Snooze" />
        <ToolbarButton icon={I.Bell} label="Mark unread" onClick={() => onModify('mark-unread')} disabled={modifying} />

        <div className="w-px h-5 bg-slate-800 mx-1" />

        <ToolbarButton icon={I.Reply} label="Reply (R)" onClick={() => setShowComposer(true)} />
        <ToolbarButton icon={I.Forward} label="Forward" onClick={onForward} />

        <div className="ml-auto flex items-center gap-1.5">
          {reminderPanelSlot}
        </div>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto">
        {/* Thread header */}
        <header className="px-6 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-2">
            {card.labels.includes('IMPORTANT') && (
              <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-rose-400/10 text-rose-300 border border-rose-400/20">
                <I.Star size={10} strokeWidth={2.2} />
                Important
              </span>
            )}
            <span className="text-[10.5px] text-slate-500 uppercase tracking-[0.08em] font-medium">
              {card.labels.filter((l) => !['IMPORTANT'].includes(l)).map((l) => l.toLowerCase()).join(' · ')}
            </span>
          </div>
          <h1 className="text-[20px] font-semibold text-slate-50 leading-tight tracking-tight">{card.subject}</h1>
          <div className="mt-2 text-[11.5px] text-slate-500">
            {card.participants.length} participants ·{' '}
            <span className="text-slate-400">{card.participants.map(MOCK.nameOf).join(', ')}</span>
          </div>
        </header>

        {/* AI panel slot (between header and messages, per spec) */}
        {aiPanelSlot}

        {/* Messages */}
        <div className="border-t border-slate-900">
          {threadMessages.map((m, idx) => (
            <EmailMessage
              key={m.id}
              message={m}
              expanded={expandedIds.has(m.id)}
              onToggle={() => toggleExpand(m.id)}
              isFirst={idx === 0}
            />
          ))}
        </div>

        {/* Reply composer */}
        {showComposer && (
          <ReplyComposer
            recipientLabel={replyTo}
            body={replyText}
            setBody={setReplyText}
            onDiscard={() => { setShowComposer(false); setReplyText(''); }}
            onSend={handleSend}
            onError={onError}
            sending={sending}
          />
        )}

        {!showComposer && (
          <div className="px-6 py-5 border-t border-slate-900 flex items-center gap-2">
            <button
              onClick={() => setShowComposer(true)}
              className="h-9 px-3.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[12.5px] font-medium text-slate-200 flex items-center gap-2 transition-colors"
            >
              <I.Reply size={13} />
              Reply
              <kbd>R</kbd>
            </button>
            <button
              onClick={onForward}
              className="h-9 px-3.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[12.5px] font-medium text-slate-200 flex items-center gap-2 transition-colors"
            >
              <I.Forward size={13} />
              Forward
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ToolbarButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="h-8 w-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      <Icon size={14} />
    </button>
  );
}

function EmptyDetail() {
  return (
    <section className="flex-1 flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
        <I.Inbox size={22} />
      </div>
      <h3 className="text-[15px] font-semibold text-slate-200 mb-1">Select a conversation</h3>
      <p className="text-[12.5px] text-slate-500 max-w-[320px] leading-relaxed">
        Pick a thread on the left to read it. Use <kbd>J</kbd>/<kbd>K</kbd> to navigate, <kbd>R</kbd> to reply, <kbd>E</kbd> to archive.
      </p>
    </section>
  );
}

window.EmailDetail = EmailDetail;
