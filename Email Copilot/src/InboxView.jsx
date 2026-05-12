// InboxView — the only owner of cross-feature state (per spec §7).
const { useState: _ivUS, useEffect: _ivUE, useRef: _ivUR, useMemo: _ivUM, useCallback: _ivUC } = React;

function InboxView({ session, onSignOut, onOpenPreferences }) {
  // Core state
  const [activeNav, setActiveNav] = useState('inbox');
  const [selectedThreadId, setSelectedThreadId] = useState('t_acq');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [compose, setCompose] = useState(null);
  const [showClearCache, setShowClearCache] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Store
  const [threads, setThreads] = useState(MOCK.THREADS);
  const [messages] = useState(MOCK.MESSAGES);
  const [reminders, setReminders] = useState(MOCK.REMINDERS);
  const [subscriptions, setSubscriptions] = useState(MOCK.SUBSCRIPTIONS);
  const [syncing, setSyncing] = useState(false);
  const [modifying, setModifying] = useState(false);

  // Reply drafts lifted from ReplyComposer
  const [replyDraftsByThread, setReplyDraftsByThread] = useState({});
  const setReplyText = (threadId, text) => {
    setReplyDraftsByThread((prev) => ({ ...prev, [threadId]: text }));
  };

  const pendingOptimisticThreadIdsRef = useRef(new Set());

  // Toast queue
  const { toasts, push: showToast, dismiss } = useToastQueue({ defaultDurationMs: 5000 });

  // Reminder panel (per-thread open state)
  const [reminderOpen, setReminderOpen] = useState(false);

  // Search state (debounce)
  const [searchPending, setSearchPending] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchSeq = useFeatureSeqRef();
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchPending(false);
      return;
    }
    setSearchPending(true);
    const req = searchSeq.next();
    const t = setTimeout(async () => {
      await sleep(280);
      if (!searchSeq.matches(req)) return;
      const q = searchQuery.toLowerCase();
      const hits = threads
        .filter((th) =>
          th.subject.toLowerCase().includes(q) ||
          (th.preview || '').toLowerCase().includes(q) ||
          th.participants.some((p) => p.toLowerCase().includes(q))
        )
        .map((th) => ({
          thread: th,
          score: 0.5 + 0.5 * Math.random(),
          unreadCount: th.unreadCount,
        }))
        .sort((a, b) => b.score - a.score);
      setSearchResults(hits);
      setSearchPending(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, threads]);

  const isSearchMode = searchQuery.trim().length > 0;

  // Folder cards (derived). For the prototype, just show all threads in inbox folder.
  const cards = useMemo(() => {
    const enriched = threads.map((t) => ({
      ...t,
      hasAttachment: messages.some((m) => m.threadId === t.id && m.attachments.length > 0),
    }));
    if (activeNav === 'inbox') return enriched.filter((t) => t.labels.includes('INBOX'));
    if (activeNav === 'sent') return [];
    if (activeNav === 'drafts') return [];
    if (activeNav === 'archive') return [];
    if (activeNav === 'trash') return [];
    return enriched;
  }, [threads, messages, activeNav]);

  const folderCounts = useMemo(() => ({
    inbox: threads.filter((t) => t.labels.includes('INBOX')).reduce((s, t) => s + t.unreadCount, 0),
  }), [threads]);

  // Selected thread / messages
  const selectedCard = cards.find((c) => c.id === selectedThreadId) || cards[0];
  const threadMessages = messages.filter((m) => m.threadId === selectedCard?.id);

  // Auto-pick first thread when none selected (guarded by !isSearchMode per spec pitfall)
  useEffect(() => {
    if (!isSearchMode && !cards.find((c) => c.id === selectedThreadId) && cards.length > 0) {
      setSelectedThreadId(cards[0].id);
    }
  }, [cards, selectedThreadId, isSearchMode]);

  // Position / total
  const visibleCards = activeFilter === 'unread' && !isSearchMode
    ? cards.filter((c) => c.unreadCount > 0)
    : cards;
  const position = Math.max(1, visibleCards.findIndex((c) => c.id === selectedCard?.id) + 1);
  const total = visibleCards.length;

  // Mark unread→read optimistically when thread opens
  useEffect(() => {
    if (!selectedCard || selectedCard.unreadCount === 0) return;
    setThreads((prev) => prev.map((t) => t.id === selectedCard.id ? { ...t, unreadCount: 0 } : t));
  }, [selectedCard?.id]);

  // Clear-on-thread-change effect (per spec)
  useEffect(() => {
    setReminderOpen(false);
    // ai-seed value reset; AiThreadPanel manages its own internal state.
  }, [selectedThreadId]);

  // Refresh / sync
  const runSync = useCallback(async (label) => {
    setSyncing(true);
    await sleep(700);
    setSyncing(false);
    showToast({ id: 'sync', message: `Mailbox refreshed · ${label || activeNav}`, variant: 'info', durationMs: 1800 });
  }, [activeNav, showToast]);

  const onPrev = () => {
    const idx = visibleCards.findIndex((c) => c.id === selectedCard?.id);
    if (idx > 0) setSelectedThreadId(visibleCards[idx - 1].id);
  };
  const onNext = () => {
    const idx = visibleCards.findIndex((c) => c.id === selectedCard?.id);
    if (idx >= 0 && idx < visibleCards.length - 1) setSelectedThreadId(visibleCards[idx + 1].id);
  };

  const onModify = async (action) => {
    if (!selectedCard) return;
    const id = selectedCard.id;
    setModifying(true);
    pendingOptimisticThreadIdsRef.current.add(id);
    const snapshot = threads;
    if (action === 'archive' || action === 'trash') {
      setThreads((prev) => prev.map((t) => t.id === id ? { ...t, labels: t.labels.filter((l) => l !== 'INBOX') } : t));
      const verb = action === 'archive' ? 'Archived' : 'Trashed';
      showToast({
        id: `modify_${id}`,
        message: `${verb} "${selectedCard.subject}"`,
        retry: () => { setThreads(snapshot); },
      });
    } else if (action === 'mark-unread') {
      setThreads((prev) => prev.map((t) => t.id === id ? { ...t, unreadCount: Math.max(1, t.unreadCount) } : t));
    }
    await sleep(400);
    setModifying(false);
    pendingOptimisticThreadIdsRef.current.delete(id);
  };

  // Compose
  const openCompose = (initial) => {
    setCompose({ mode: initial?.mode || 'new', initial });
  };
  const closeCompose = () => setCompose(null);

  // Reply / send
  const onSendReply = () => {
    const body = replyDraftsByThread[selectedCard?.id] || '';
    if (!body.trim()) return;
    showToast({ message: 'Reply sent.', durationMs: 2500 });
    setReplyText(selectedCard.id, '');
    setShowComposer(false);
  };

  // Use AI draft → reply
  const onUseDraft = (draft) => {
    if (!selectedCard) return;
    setReplyText(selectedCard.id, draft.body);
    setShowComposer(true);
    showToast({ message: 'Draft loaded into reply.', durationMs: 2200 });
  };

  // Forward
  const onForward = () => {
    if (!selectedCard) return;
    const last = threadMessages[threadMessages.length - 1];
    openCompose({
      mode: 'forward',
      subject: `Fwd: ${selectedCard.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${last.from}\nDate: ${MOCK.fullTimestamp(last.receivedAt)}\nSubject: ${last.subject}\n\n${last.bodyText}`,
    });
  };

  // Clear cache cascade
  const onClearCacheConfirmed = async () => {
    setThreads([]);
    setSelectedThreadId(null);
    setCompose(null);
    setShowComposer(false);
    setSearchQuery('');
    setActiveFilter('all');
    setReplyDraftsByThread({});
    setReminders([]);
    pendingOptimisticThreadIdsRef.current.clear();
    setShowClearCache(false);
    onSignOut();
  };

  // Live sync
  const [syncStatus, setSyncStatus] = useState('connected');
  const [lastSyncedAt, setLastSyncedAt] = useState(MOCK.NOW.toISOString());
  const simulateInbound = async () => {
    setSyncStatus('refreshed');
    await runSync(activeNav);
    setLastSyncedAt(new Date().toISOString());
    setTimeout(() => setSyncStatus('connected'), 1800);
  };
  const enableSync = async () => {
    showToast({ message: 'Subscription renewed · expires in 6 days', durationMs: 2400 });
    setSubscriptions(MOCK.SUBSCRIPTIONS);
  };

  // Search input ref for `/` keymap
  const searchInputRef = useRef(null);

  // Global keymap
  useGlobalKeymap({
    j: onNext,
    k: onPrev,
    r: () => setShowComposer(true),
    e: () => onModify('archive'),
    '#': () => onModify('trash'),
    c: () => openCompose(),
    '/': () => searchInputRef.current?.focus(),
    Escape: () => { setShowComposer(false); setAccountMenuOpen(false); },
  });

  const hasReminder = (tid) => MOCK.hasActiveReminder(tid, reminders);
  const replyHasUserContent = !!(replyDraftsByThread[selectedCard?.id] || '').trim();

  return (
    <div className="h-full w-full flex bg-slate-950 text-slate-200">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        session={session}
        folderCounts={folderCounts}
        onCompose={() => openCompose()}
        onSignOut={onSignOut}
        onClearCache={() => setShowClearCache(true)}
        onOpenPreferences={onOpenPreferences}
        accountMenuOpen={accountMenuOpen}
        setAccountMenuOpen={setAccountMenuOpen}
      />

      {/* Middle column: list or search results */}
      <section className="w-[392px] flex-shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col">
        {!isSearchMode ? (
          <EmailList
            cards={cards}
            selectedThreadId={selectedCard?.id}
            setSelectedThreadId={setSelectedThreadId}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            syncing={syncing}
            onRefresh={() => runSync(activeNav)}
            isSearchMode={isSearchMode}
            hasActiveReminder={hasReminder}
            activeNav={activeNav}
            searchInputRef={searchInputRef}
          />
        ) : (
          <>
            {/* Header in search mode */}
            <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800/80">
              <h2 className="text-[14px] font-semibold text-slate-100">Search</h2>
              <button
                onClick={() => setSearchQuery('')}
                className="ml-auto text-[11.5px] text-slate-500 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
            <div className="px-3 pt-3 pb-2.5 border-b border-slate-800/60 space-y-2.5">
              <div className="relative">
                <I.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mail"
                  autoFocus
                  className="w-full h-8 pl-8 pr-14 bg-slate-900 border border-slate-800 rounded-md text-[12.5px] text-slate-200 placeholder:text-slate-500 focus:border-slate-700 focus-ring"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2">esc</kbd>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-6 px-2.5 rounded-full bg-slate-900/50 text-slate-600 border border-slate-800/60 text-[11.5px] font-medium flex items-center">All</span>
                <span className="h-6 px-2.5 rounded-full bg-slate-900/50 text-slate-600 border border-slate-800/60 text-[11.5px] font-medium flex items-center">Unread</span>
                <span className="ml-auto text-[10.5px] text-slate-500 italic">Search active</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <InboxSearchResults
                query={searchQuery}
                results={searchResults}
                pending={searchPending}
                selectedThreadId={selectedCard?.id}
                onSelectThread={(t) => { setSelectedThreadId(t.id); }}
                hasActiveReminder={hasReminder}
              />
            </div>
          </>
        )}
      </section>

      {/* Detail */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top status bar */}
        <div className="h-9 px-4 flex items-center gap-2 border-b border-slate-800/80 bg-slate-950">
          <span className="text-[11px] text-slate-500">
            <span className="text-slate-400 font-medium">{session.user.email}</span>
            <span className="mx-1.5 text-slate-700">/</span>
            <span className="capitalize">{activeNav}</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LiveSyncPanel
              status={syncStatus}
              lastSyncedAt={lastSyncedAt}
              subscriptions={subscriptions}
              onEnable={enableSync}
              onSimulateEvent={simulateInbound}
            />
          </div>
        </div>

        <EmailDetail
          card={selectedCard}
          threadMessages={threadMessages}
          showComposer={showComposer}
          setShowComposer={setShowComposer}
          position={position}
          total={total}
          onPrev={onPrev}
          onNext={onNext}
          onModify={onModify}
          onForward={onForward}
          onSendReply={onSendReply}
          onError={(msg) => showToast({ message: msg, variant: 'error' })}
          replyText={replyDraftsByThread[selectedCard?.id] || ''}
          setReplyText={(t) => setReplyText(selectedCard.id, t)}
          modifying={modifying}
          syncing={syncing}
          aiPanelSlot={
            <AiThreadPanel
              selectedThreadId={selectedCard?.id}
              threadMessages={threadMessages}
              replyHasUserContent={replyHasUserContent}
              onUseDraft={onUseDraft}
              onError={(msg) => showToast({ message: msg, variant: 'error' })}
            />
          }
          reminderPanelSlot={
            <ReminderThreadPanel
              selectedThreadId={selectedCard?.id}
              reminders={reminders}
              onRemindersChange={setReminders}
              onError={(msg) => showToast({ message: msg, variant: 'error' })}
              open={reminderOpen}
              setOpen={setReminderOpen}
            />
          }
        />
      </div>

      {/* Overlays */}
      {compose && (
        <ComposeDialog
          mode={compose.mode}
          initial={compose.initial}
          onClose={closeCompose}
          onSend={(payload) => {
            closeCompose();
            showToast({ message: `Message sent to ${payload.to.join(', ')}`, durationMs: 2500 });
          }}
          onError={(msg) => showToast({ message: msg, variant: 'error' })}
        />
      )}
      {showClearCache && (
        <ClearCacheDialog
          onClose={() => setShowClearCache(false)}
          onConfirm={onClearCacheConfirmed}
        />
      )}

      <AppToast toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

window.InboxView = InboxView;
