// AI Thread Panel — summary, draft, revise.
// Inlines simulated calls to /api/threads/[id]/summary, /draft, /draft/revise.
const { useState: _aiUS, useEffect: _aiUE, useRef: _aiUR } = React;

function simulateSummary(threadId, messages) {
  const m = messages[messages.length - 1];
  const text = m.bodyText || m.snippet;
  const sentences = text.split(/\n+|\.\s+/).filter((s) => s.trim().length > 10).slice(0, 3);
  // Build a deterministic summary from the thread.
  const summaryByThread = {
    t_acq: {
      headline: 'Kestrel held the 18% option pool, holding firm on 1x non-participating liq pref.',
      action: 'Confirm liquidation language before Wednesday 2pm PT call.',
      bullets: [
        'Dani returned v4 redlines; pool fixed at 18% — your ~16% counter was not accepted.',
        '1x non-participating is firm on their side; participating-with-cap is a non-starter.',
        'Independent board seat: agreed to right of first nomination with mutual approval.',
      ],
    },
    t_lin: {
      headline: 'Theo proposes Q3 platform/product split with federated query slipped to Q4.',
      action: 'Approve Friday review; ask Theo to bring tentative Q4 milestones for investors.',
      bullets: [
        'Allocation: 4 eng on pipelines, 3 on editor, 2 on integrations, 1.5 FTE reliability.',
        'Federated query layer deliberately slipped from Q3 to Q4 to avoid half-shipping.',
        'No staffing gaps flagged; needs sign-off this week to start sprint planning.',
      ],
    },
    t_des: {
      headline: 'Ana shared four brand directions; Direction 2 (editorial) is her recommendation.',
      action: 'Pick a 30-minute Thursday slot for the react session.',
      bullets: [
        'Direction 1 is a tightened version of the last round; lowest risk.',
        'Direction 2 leans into editorial typography — Ana\'s favorite.',
        'Directions 3 and 4 are flex/reset concepts, included for reactions only.',
      ],
    },
    t_hire: {
      headline: 'Jen introduced Priya Shankar, ex-Stripe Director, for Head of Eng.',
      action: 'Reply directly to Priya to schedule a first conversation.',
      bullets: [
        'Priya led products then platform at Stripe; winding down now.',
        'Looking specifically for a 0→1 platform role at Series B scale.',
        'Both calendars are cc\'d; Jen explicitly handed it off to the two of you.',
      ],
    },
  };
  return summaryByThread[threadId] || {
    headline: 'Recent thread activity summarized below.',
    action: 'Review and reply if needed.',
    bullets: sentences.length ? sentences.map((s) => s.trim().replace(/^[—•\s]+/, '')) : ['No content to summarize.'],
  };
}

function simulateDraft(threadId, tone, askClarifying) {
  const tonePrefix = {
    concise: '',
    friendly: 'Hey — quick reply: ',
    formal: 'Thank you for the update. ',
  };
  const drafts = {
    t_acq: {
      concise: {
        subject: 'Re: Series B term sheet — final markup',
        body: 'Dani —\n\nAcknowledged on pool and liq pref. Aligned on the independent seat language.\n\nI\'ll send three independent names tomorrow ahead of our 2pm call. Worth covering the founder vesting acceleration on Wednesday too — we hadn\'t closed that loop.\n\nMira',
      },
      friendly: {
        subject: 'Re: Series B term sheet — final markup',
        body: 'Dani — got it, thanks for the quick turn. Pool stays at 18%, liq pref noted, and the independent seat language works for us.\n\nI\'ll send three names tomorrow so we don\'t lose time on Wednesday. One thing I want to make sure we cover on the call: founder vesting acceleration on change-of-control. We left it open last round.\n\nSpeak soon,\nMira',
      },
      formal: {
        subject: 'Re: Series B term sheet — final markup',
        body: 'Dani,\n\nThank you for the prompt turnaround on v4. We accept the 18% pool, the 1x non-participating preference, and the right-of-first-nomination construction for the independent seat.\n\nWe will circulate three candidate names for the independent seat by end of day Tuesday. On the agenda for Wednesday, I would like to additionally address founder vesting acceleration on change-of-control, which remained open after the prior round.\n\nBest regards,\nMira Okafor',
      },
    },
    t_lin: {
      concise: {
        subject: 'Re: Q3 roadmap commitments — eng allocation',
        body: 'Theo —\n\nAllocation looks right. Approving the slip on federated query.\n\nFor Friday: bring tentative Q4 milestone dates (even directional). I need something concrete for the board update.\n\nM',
      },
      friendly: {
        subject: 'Re: Q3 roadmap commitments — eng allocation',
        body: 'Theo — looks good, allocations make sense. I\'d rather you slip federated query cleanly than rush it.\n\nFor Friday: please bring some tentative Q4 milestones, even directional. I need to give the board something concrete to point at.\n\nThanks,\nMira',
      },
      formal: {
        subject: 'Re: Q3 roadmap commitments — eng allocation',
        body: 'Theo,\n\nThe Q3 allocation aligns with my expectations. I support deferring federated query discovery to Q4 in preference to a partial Q3 ship.\n\nIn advance of Friday\'s review, please prepare tentative Q4 milestones for the federated query workstream, including directional dates. I need concrete artifacts to share with the board.\n\nBest,\nMira Okafor',
      },
    },
  };
  const base = drafts[threadId]?.[tone] || {
    subject: 'Re: thread',
    body: tonePrefix[tone] + 'Thanks for the note — I\'ll review and circle back tomorrow.\n\nMira',
  };
  if (askClarifying) {
    return {
      ...base,
      body: base.body + '\n\nQuick clarifying question before I move on this: is there a hard deadline I should be planning against?',
    };
  }
  return base;
}

function simulateRevision(currentDraft, instruction) {
  const instr = instruction.toLowerCase();
  let body = currentDraft.body;
  if (instr.includes('shorter') || instr.includes('concise')) {
    body = body.split('\n').slice(0, 3).join('\n') + '\n\n— Mira';
  } else if (instr.includes('warmer') || instr.includes('friendly')) {
    body = 'Hope you\'re well — ' + body;
  } else if (instr.includes('add') && instr.includes('vesting')) {
    body = body.replace(/(Mira[^\n]*)/m, 'One more thing — let\'s also close founder vesting acceleration on Wednesday.\n\n$1');
  } else {
    body = body + `\n\n[Revised per instruction: "${instruction}"]`;
  }
  return { ...currentDraft, body };
}

function AiThreadPanel({
  selectedThreadId,
  threadMessages,
  replyHasUserContent,
  onUseDraft,
  onError,
}) {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState('idle'); // 'idle' | 'summary' | 'draft'
  const [summaryResult, setSummaryResult] = useState(null);
  const [draftResult, setDraftResult] = useState(null);
  const [tone, setTone] = useState('concise');
  const [askClarifyingQuestion, setAskClarifyingQuestion] = useState(false);
  const [reviseInstruction, setReviseInstruction] = useState('');
  const [summaryPending, setSummaryPending] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [revisePending, setRevisePending] = useState(false);
  const seq = useFeatureSeqRef();

  // Clear panel state on thread change
  useEffect(() => {
    setSummaryResult(null);
    setDraftResult(null);
    setReviseInstruction('');
    setSummaryPending(false);
    setDraftPending(false);
    setRevisePending(false);
    setView('idle');
  }, [selectedThreadId]);

  const handleSummarize = async () => {
    if (!selectedThreadId) return;
    const myReq = seq.next();
    setSummaryPending(true);
    setView('summary');
    setSummaryResult(null);
    await sleep(900 + Math.random() * 600);
    if (!seq.matches(myReq)) return;
    const summary = simulateSummary(selectedThreadId, threadMessages);
    setSummaryResult({ meta: { source: 'claude', model: 'claude-haiku-4-5' }, summary });
    setSummaryPending(false);
  };

  const handleDraft = async () => {
    if (!selectedThreadId) return;
    const myReq = seq.next();
    setDraftPending(true);
    setView('draft');
    setDraftResult(null);
    await sleep(1100 + Math.random() * 700);
    if (!seq.matches(myReq)) return;
    const draft = simulateDraft(selectedThreadId, tone, askClarifyingQuestion);
    // Randomly choose fallback ~10% to show the badge
    const useFallback = Math.random() < 0.12;
    setDraftResult({ meta: { source: useFallback ? 'fallback' : 'claude', model: useFallback ? undefined : 'claude-haiku-4-5' }, draft });
    setDraftPending(false);
  };

  const handleRevise = async () => {
    if (!draftResult || !reviseInstruction.trim()) return;
    const myReq = seq.next();
    setRevisePending(true);
    await sleep(800 + Math.random() * 500);
    if (!seq.matches(myReq)) return;
    const draft = simulateRevision(draftResult.draft, reviseInstruction.trim());
    setDraftResult({ meta: { source: 'claude', model: 'claude-haiku-4-5' }, draft });
    setReviseInstruction('');
    setRevisePending(false);
  };

  const handleUseDraft = () => {
    if (!draftResult) return;
    if (replyHasUserContent) {
      const ok = window.confirm('Replace your current reply with this draft?');
      if (!ok) return;
    }
    onUseDraft(draftResult.draft);
  };

  const disabled = !selectedThreadId;

  return (
    <div className="mx-6 my-3 rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-900/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left hover:bg-slate-900/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
          <I.Sparkles size={12} className="sparkle" />
        </div>
        <span className="text-[12.5px] font-semibold text-slate-100">Copilot</span>
        <span className="text-[11.5px] text-slate-500">·</span>
        <span className="text-[11.5px] text-slate-400">Summarize, draft, revise</span>
        <span className="ml-auto" />
        <I.ChevronDown size={13} className={'text-slate-500 transition-transform ' + (open ? '' : '-rotate-90')} />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5">
          {/* Action row */}
          <div className="flex items-center gap-2 mb-3">
            <AiAction
              icon={I.Sparkles}
              label="Summarize thread"
              onClick={handleSummarize}
              loading={summaryPending}
              disabled={disabled}
            />
            <AiAction
              icon={I.Wand}
              label="Draft reply"
              onClick={handleDraft}
              loading={draftPending}
              disabled={disabled}
            />
            <div className="ml-auto flex items-center gap-2">
              <ToneSelector value={tone} onChange={setTone} />
              <ClarifyToggle value={askClarifyingQuestion} onChange={setAskClarifyingQuestion} />
            </div>
          </div>

          {/* Result area */}
          {view === 'summary' && (
            summaryPending
              ? <PendingBlock label="Reading thread, distilling key points…" />
              : summaryResult && <SummaryResult result={summaryResult} />
          )}

          {view === 'draft' && (
            draftPending
              ? <PendingBlock label="Drafting reply…" />
              : draftResult && (
                <DraftResultBlock
                  result={draftResult}
                  reviseInstruction={reviseInstruction}
                  setReviseInstruction={setReviseInstruction}
                  onRevise={handleRevise}
                  revisePending={revisePending}
                  onUseDraft={handleUseDraft}
                />
              )
          )}

          {view === 'idle' && (
            <div className="px-1 py-1 text-[11.5px] text-slate-500 leading-relaxed">
              Pick an action above. Copilot reads only this thread; it never sees other mail.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AiAction({ icon: Icon, label, onClick, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={
        'h-8 px-3 rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors ' +
        (disabled
          ? 'bg-slate-900/40 text-slate-600 cursor-not-allowed'
          : 'bg-slate-100 text-slate-950 hover:bg-white')
      }
    >
      {loading
        ? <I.Refresh size={12} className="spin" />
        : <Icon size={12} strokeWidth={2.1} />}
      <span>{label}</span>
    </button>
  );
}

function ToneSelector({ value, onChange }) {
  const tones = ['concise', 'friendly', 'formal'];
  return (
    <div className="inline-flex items-center bg-slate-900/80 border border-slate-800 rounded-md p-0.5">
      {tones.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={
            'h-6 px-2 rounded text-[10.5px] font-medium capitalize transition-colors ' +
            (value === t ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300')
          }
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function ClarifyToggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      title="Append a clarifying question to the draft"
      className={
        'h-6 px-2 inline-flex items-center gap-1.5 rounded-md text-[10.5px] font-medium border transition-colors ' +
        (value
          ? 'bg-sky-400/10 border-sky-400/30 text-sky-200'
          : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300')
      }
    >
      <span className={'w-3 h-3 rounded-sm border flex items-center justify-center ' + (value ? 'bg-sky-400 border-sky-400' : 'border-slate-700')}>
        {value && <I.Check size={9} strokeWidth={3} className="text-slate-950" />}
      </span>
      Ask clarifying Q
    </button>
  );
}

function PendingBlock({ label }) {
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 p-3.5 space-y-2">
      <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
        <I.Refresh size={11} className="spin text-sky-300" />
        <span>{label}</span>
      </div>
      <div className="skeleton h-2.5 w-full" />
      <div className="skeleton h-2.5 w-[88%]" />
      <div className="skeleton h-2.5 w-[72%]" />
    </div>
  );
}

function SummaryResult({ result }) {
  const { summary, meta } = result;
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 p-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <SourceBadge meta={meta} />
      </div>
      <div className="text-[13px] font-medium text-slate-100 leading-snug mb-2">
        {summary.headline}
      </div>
      <ul className="space-y-1.5 mb-3">
        {summary.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] text-slate-300 leading-relaxed">
            <span className="text-slate-600 mt-1">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="pt-2.5 border-t border-slate-800 flex items-start gap-2">
        <span className="mt-0.5 inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-semibold tracking-wider uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20">
          Action
        </span>
        <span className="text-[12.5px] text-slate-200 leading-relaxed">{summary.action}</span>
      </div>
    </div>
  );
}

function DraftResultBlock({ result, reviseInstruction, setReviseInstruction, onRevise, revisePending, onUseDraft }) {
  const { draft, meta } = result;
  return (
    <div className="rounded-md bg-slate-900/60 border border-slate-800 overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
        <SourceBadge meta={meta} />
        <span className="ml-auto text-[10.5px] text-slate-500">Draft preview</span>
      </div>
      <div className="px-4 pb-3">
        <div className="text-[12px] text-slate-500 mb-1">Subject</div>
        <div className="text-[13px] text-slate-100 font-medium mb-3">{draft.subject}</div>
        <div className="text-[12px] text-slate-500 mb-1">Body</div>
        <div className="text-[13px] text-slate-200 whitespace-pre-wrap leading-[1.65] font-normal max-h-60 overflow-y-auto pr-2">
          {draft.body}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <I.Wand size={11} />
          <span>Revise with instruction</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={reviseInstruction}
            onChange={(e) => setReviseInstruction(e.target.value)}
            placeholder='e.g. "Make it shorter" or "Add a note about vesting"'
            className="flex-1 h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-md text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus-ring"
            onKeyDown={(e) => { if (e.key === 'Enter' && reviseInstruction.trim()) onRevise(); }}
          />
          <button
            onClick={onRevise}
            disabled={!reviseInstruction.trim() || revisePending}
            className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11.5px] font-medium text-slate-100 flex items-center gap-1.5 transition-colors"
          >
            {revisePending && <I.Refresh size={11} className="spin" />}
            Revise
          </button>
          <button
            onClick={onUseDraft}
            className="h-8 px-3 rounded-md bg-sky-400 hover:bg-sky-300 text-slate-950 text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            <I.Check size={12} strokeWidth={2.6} />
            Use draft
          </button>
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ meta }) {
  if (meta.source === 'fallback') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20">
        <I.Bell size={9} />
        Heuristic fallback — no AI key
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-sky-400/10 text-sky-300 border border-sky-400/20">
      <I.Sparkles size={9} />
      {meta.source}{meta.model ? ` · ${meta.model}` : ''}
    </span>
  );
}

window.AiThreadPanel = AiThreadPanel;
