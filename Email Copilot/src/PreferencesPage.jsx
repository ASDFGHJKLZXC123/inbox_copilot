// Preferences page — full-page settings surface.
const { useState: _prefUS, useRef: _prefUR } = React;

const PREF_SECTIONS = [
  { id: 'account',      label: 'Account',         icon: 'user' },
  { id: 'ai',           label: 'Copilot AI',      icon: 'sparkles' },
  { id: 'notifications',label: 'Notifications',   icon: 'bell' },
  { id: 'appearance',   label: 'Appearance',      icon: 'paint' },
  { id: 'keyboard',     label: 'Keyboard',        icon: 'keyboard' },
  { id: 'connected',    label: 'Connected apps',  icon: 'plug' },
  { id: 'privacy',      label: 'Privacy & data',  icon: 'shield' },
];

const DEFAULT_PREFS = {
  // AI
  defaultTone: 'concise',
  askClarifyingByDefault: false,
  selectedModel: 'anthropic/claude-haiku-4-5',
  apiKeys: {
    anthropic: { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    openai:    { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    google:    { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    xai:       { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    mistral:   { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    deepseek:  { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    cohere:    { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
    meta:      { value: '', verified: false, locked: false, enabled: true, verifiedAt: null },
  },
  letCopilotReadAllThreads: true,
  autoSummarizeOnOpen: false,
  // Notifications
  reminderLeadTime: 15,
  toastDuration: 5,
  desktopNotifications: true,
  notifyOn: { mentions: true, reminders: true, sends: false, sync: false },
  // Appearance
  density: 'comfortable',
  timeFormat: '12h',
  showAvatars: true,
  showSnippets: true,
  monoStack: 'Geist Mono',
  // Privacy
  storeDrafts: true,
  retentionDays: 30,
  shareAnonymizedUsage: false,
};

function PreferencesPage({ session, onBack, onSignOut }) {
  const [section, setSection] = useState('account');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (patch) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setDirty(true);
    setSaved(false);
  };
  const updateNotify = (key, val) => {
    setPrefs((p) => ({ ...p, notifyOn: { ...p.notifyOn, [key]: val } }));
    setDirty(true);
    setSaved(false);
  };
  const handleSave = async () => {
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    setDirty(true);
    setSaved(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-200">
      {/* Top bar */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950">
        <button
          onClick={onBack}
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12.5px] text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
        >
          <I.ChevronLeft size={14} />
          <span>Back to inbox</span>
          <kbd className="ml-1">Esc</kbd>
        </button>
        <div className="w-px h-5 bg-slate-800" />
        <div className="text-[13px] text-slate-300 font-medium">Preferences</div>
        <div className="ml-auto flex items-center gap-3">
          {dirty && <span className="text-[11px] text-amber-300/90">Unsaved changes</span>}
          {saved && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
              <I.Check size={11} strokeWidth={2.4} />
              Saved
            </span>
          )}
          <button
            onClick={handleReset}
            className="h-8 px-3 rounded-md text-[12px] text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="h-8 px-3.5 rounded-md bg-sky-400 hover:bg-sky-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 text-[12.5px] font-semibold transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Section nav */}
        <nav className="w-[224px] flex-shrink-0 px-3 py-5 border-r border-slate-800/80 overflow-y-auto">
          <ul className="space-y-0.5">
            {PREF_SECTIONS.map((s) => {
              const active = section === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSection(s.id)}
                    className={
                      'group w-full h-9 px-3 rounded-md flex items-center gap-2.5 text-[13px] transition-colors ' +
                      (active
                        ? 'bg-slate-800/70 text-slate-100'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200')
                    }
                  >
                    <PrefIcon name={s.icon} size={14} />
                    <span className="flex-1 text-left">{s.label}</span>
                    {active && <I.ChevronRight size={12} className="text-slate-500" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 mx-1 px-3 py-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-[11.5px] text-slate-400 mb-1.5">
              <I.Sparkles size={12} className="text-sky-300" />
              <span className="font-medium text-slate-200">Pro tip</span>
            </div>
            <p className="text-[11.5px] text-slate-500 leading-relaxed">
              Press <kbd>?</kbd> from anywhere to see every shortcut. Search supports <span className="font-mono text-slate-300">from:</span> and <span className="font-mono text-slate-300">has:attachment</span>.
            </p>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-8 py-8">
            {section === 'account' &&       <AccountSection session={session} onSignOut={onSignOut} />}
            {section === 'ai' &&            <AiSection prefs={prefs} update={update} />}
            {section === 'notifications' && <NotificationsSection prefs={prefs} update={update} updateNotify={updateNotify} />}
            {section === 'appearance' &&    <AppearanceSection prefs={prefs} update={update} />}
            {section === 'keyboard' &&      <KeyboardSection />}
            {section === 'connected' &&     <ConnectedSection />}
            {section === 'privacy' &&       <PrivacySection prefs={prefs} update={update} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function AccountSection({ session, onSignOut }) {
  return (
    <Section title="Account" desc="The Google account Copilot is connected to.">
      <Card>
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-semibold text-slate-950"
            style={{ background: `oklch(0.78 0.13 ${MOCK.avatarHue(session.user.email)})` }}
          >
            {session.user.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-semibold text-slate-100">{session.user.name}</div>
            <div className="text-[12.5px] text-slate-400 font-mono">{session.user.email}</div>
            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 text-emerald-300"><I.Dot size={10} className="text-emerald-400" />Connected</span>
              <span className="text-slate-500">Authorized 24 days ago</span>
              <span className="text-slate-500">Provider · <span className="text-slate-300">Google</span></span>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-2">
          <SecondaryButton icon={I.Refresh} label="Reauthorize Google" />
          <SecondaryButton icon={I.LogOut} label="Sign out" onClick={onSignOut} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Granted scopes" desc="Copilot only requests what it needs to read and send your mail." />
        <ScopeRow label="gmail.readonly" desc="Read messages, labels, and threads" status="granted" />
        <ScopeRow label="gmail.send"     desc="Send and reply to mail on your behalf" status="granted" />
        <ScopeRow label="gmail.modify"   desc="Archive, trash, mark read/unread" status="granted" />
        <ScopeRow label="gmail.metadata" desc="Headers only (push notifications)"   status="granted" last />
      </Card>

      <Card destructive>
        <CardHeader title="Danger zone" desc="Destructive actions. There is no undo." destructive />
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[13px] text-slate-200 font-medium">Disconnect Google account</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">Revokes our tokens and removes the live sync subscription.</div>
          </div>
          <button className="h-8 px-3 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[12px] font-medium transition-colors">
            Disconnect
          </button>
        </div>
      </Card>
    </Section>
  );
}

function AiSection({ prefs, update }) {
  const patchKey = (provider, patch) => {
    const prev = prefs.apiKeys[provider] || { value: '', verified: false, locked: false, enabled: true, verifiedAt: null };
    update({ apiKeys: { ...prefs.apiKeys, [provider]: { ...prev, ...patch } } });
  };
  return (
    <Section title="Copilot AI" desc="How Copilot drafts, summarizes, and revises replies.">
      <Card>
        <CardHeader title="Default tone" desc="The tone the Draft button uses unless you change it inline." />
        <div className="px-5 pb-5">
          <ToneCards value={prefs.defaultTone} onChange={(v) => update({ defaultTone: v })} />
        </div>
      </Card>

      <Card>
        <Row
          title="Ask a clarifying question"
          desc="When enabled, drafts include a short clarifying question at the end."
          control={<Toggle value={prefs.askClarifyingByDefault} onChange={(v) => update({ askClarifyingByDefault: v })} />}
        />
        <Row
          title="Auto-summarize on open"
          desc="Generate a thread summary the moment you open a long thread (8+ messages)."
          control={<Toggle value={prefs.autoSummarizeOnOpen} onChange={(v) => update({ autoSummarizeOnOpen: v })} />}
        />
        <Row
          title="Let Copilot read full thread"
          desc="Required for accurate summaries. When off, Copilot only sees the latest message."
          control={<Toggle value={prefs.letCopilotReadAllThreads} onChange={(v) => update({ letCopilotReadAllThreads: v })} />}
          last
        />
      </Card>

      <ProviderModelPicker
        selectedModel={prefs.selectedModel}
        onSelectModel={(id) => update({ selectedModel: id })}
        apiKeys={prefs.apiKeys}
        patchKey={patchKey}
      />
    </Section>
  );
}

// ── Provider + Model picker ──────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    initial: 'A',
    color: 'from-orange-400 to-amber-500',
    docs: 'console.anthropic.com',
    keyHint: 'sk-ant-…',
    models: [
      // Claude 4.7
      { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7',   group: 'Claude 4.7', tag: 'flagship', desc: 'April 2026 flagship · 1M context · xhigh reasoning · 87.6% SWE-bench Verified.' },
      // Claude 4.6
      { id: 'claude-opus-4-6',   name: 'Claude Opus 4.6',   group: 'Claude 4.6', tag: 'flagship', desc: 'Adaptive Thinking · GA · still strong for premium reasoning.' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', group: 'Claude 4.6', tag: 'balanced', desc: 'Default daily driver · Opus-level coding at Sonnet pricing.' },
      // Claude 4.5
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', group: 'Claude 4.5', tag: 'balanced', desc: 'Sept 2025 · long-horizon agents and computer use.' },
      { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  group: 'Claude 4.5', tag: 'fast',     desc: 'Fastest current Claude · best for drafts and subagents.' },
      // Claude 4
      { id: 'claude-opus-4-1',   name: 'Claude Opus 4.1',   group: 'Claude 4',   tag: 'legacy',   desc: 'Agentic search and long-horizon tasks. Retirement \u2265 Aug 2026.' },
      { id: 'claude-sonnet-4',   name: 'Claude Sonnet 4',   group: 'Claude 4',   tag: 'legacy',   desc: 'Balanced legacy Sonnet. Retirement \u2265 May 2026.' },
      // Claude 3.5
      { id: 'claude-3-5-haiku',  name: 'Claude 3.5 Haiku',  group: 'Claude 3.5', tag: 'legacy',   desc: 'Lightweight legacy model for moderation and instruction following.' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    initial: 'O',
    color: 'from-emerald-400 to-teal-500',
    docs: 'platform.openai.com',
    keyHint: 'sk-proj-…',
    models: [
      // GPT-5.5
      { id: 'gpt-5.5',       name: 'GPT-5.5',       group: 'GPT-5.5', tag: 'flagship',  desc: 'April 2026 flagship · 1M context · tool search, computer use, MCP.' },
      { id: 'gpt-5.5-pro',   name: 'GPT-5.5 pro',   group: 'GPT-5.5', tag: 'reasoning', desc: 'Extra compute via Responses API for the hardest problems.' },
      // GPT-5.4
      { id: 'gpt-5.4',       name: 'GPT-5.4',       group: 'GPT-5.4', tag: 'balanced',  desc: 'Production default. Strong reasoning and Codex-class coding.' },
      { id: 'gpt-5.4-mini',  name: 'GPT-5.4 mini',  group: 'GPT-5.4', tag: 'fast',      desc: 'Lower-latency / lower-cost workhorse for high-volume use.' },
      { id: 'gpt-5.4-nano',  name: 'GPT-5.4 nano',  group: 'GPT-5.4', tag: 'fast',      desc: 'Cheapest GPT-5 class. Simple speed-sensitive tasks.' },
      // Codex / GPT-5.3
      { id: 'gpt-5.3-codex',         name: 'GPT-5.3 Codex',         group: 'Codex', tag: 'reasoning', desc: 'Agentic coding model. Long-running tasks in Codex/Cursor/Replit.' },
      { id: 'gpt-5.1-codex',         name: 'GPT-5.1 Codex',         group: 'Codex', tag: 'reasoning', desc: 'Earlier coding-optimised checkpoint, still production-ready.' },
      // GPT-5
      { id: 'gpt-5',         name: 'GPT-5',         group: 'GPT-5',   tag: 'legacy',    desc: 'August 2025 launch. Still available via API.' },
      { id: 'gpt-5-mini',    name: 'GPT-5 mini',    group: 'GPT-5',   tag: 'legacy',    desc: 'Smaller original GPT-5.' },
      { id: 'gpt-5-nano',    name: 'GPT-5 nano',    group: 'GPT-5',   tag: 'legacy',    desc: 'Smallest original GPT-5.' },
      // GPT-4 family (legacy carry-overs)
      { id: 'gpt-4.1',       name: 'GPT-4.1',       group: 'GPT-4.1', tag: 'legacy',    desc: 'Strong general-purpose legacy model.' },
      { id: 'gpt-4.1-mini',  name: 'GPT-4.1 mini',  group: 'GPT-4.1', tag: 'legacy',    desc: 'Cheaper 4.1 variant for narrow tasks.' },
      { id: 'gpt-4.1-nano',  name: 'GPT-4.1 nano',  group: 'GPT-4.1', tag: 'legacy',    desc: 'Smallest 4.1 model.' },
      { id: 'gpt-4o',        name: 'GPT-4o',        group: 'GPT-4o',  tag: 'legacy',    desc: 'Omni model. Lower-cost compatibility option.' },
      { id: 'gpt-4o-mini',   name: 'GPT-4o mini',   group: 'GPT-4o',  tag: 'legacy',    desc: 'Smaller 4o. Cheapest legacy chat model.' },
      // Reasoning (o-series)
      { id: 'o3',            name: 'o3',            group: 'o-series', tag: 'reasoning', desc: 'High-effort chain-of-thought reasoner.' },
      { id: 'o3-mini',       name: 'o3-mini',       group: 'o-series', tag: 'reasoning', desc: 'Smaller reasoner. Faster and cheaper.' },
      { id: 'o1',            name: 'o1',            group: 'o-series', tag: 'legacy',    desc: 'First-gen reasoner. Kept for compatibility.' },
      // Open weights
      { id: 'gpt-oss-120b',  name: 'gpt-oss-120b',  group: 'Open weights', tag: 'open', desc: 'Open-weight (Apache 2.0). Self-host or hosted API.' },
      { id: 'gpt-oss-20b',   name: 'gpt-oss-20b',   group: 'Open weights', tag: 'open', desc: 'Smaller open-weight variant.' },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    initial: 'G',
    color: 'from-sky-400 to-indigo-500',
    docs: 'aistudio.google.com',
    keyHint: 'AIza…',
    models: [
      // Gemini 3.1
      { id: 'gemini-3.1-pro',        name: 'Gemini 3.1 Pro',        group: 'Gemini 3.1', tag: 'flagship', desc: 'April 2026 flagship · 1M context · adaptive thinking · grounding.' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', group: 'Gemini 3.1', tag: 'fast',     desc: 'Cheapest current model. Low-latency, high-volume tasks.' },
      // Gemini 3
      { id: 'gemini-3-pro',          name: 'Gemini 3 Pro',          group: 'Gemini 3',   tag: 'balanced', desc: 'Nov 2025 reasoning-first model. Strong on agentic workflows.' },
      { id: 'gemini-3-flash',        name: 'Gemini 3 Flash',        group: 'Gemini 3',   tag: 'balanced', desc: 'Dec 2025 Flash. Frontier-class quality at Flash speed.' },
      { id: 'gemini-3-deep-think',   name: 'Gemini 3 Deep Think',   group: 'Gemini 3',   tag: 'reasoning', desc: 'Extended thinking variant for the hardest reasoning tasks.' },
      // Gemini 2.5 (still GA)
      { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        group: 'Gemini 2.5', tag: 'legacy',   desc: 'GA · stable. Adaptive thinking + 1M context.' },
      { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      group: 'Gemini 2.5', tag: 'legacy',   desc: 'GA · stable Flash with controllable thinking budgets.' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', group: 'Gemini 2.5', tag: 'legacy',   desc: 'GA · cheap, low-latency. Popular for mobile/embedded.' },
      // Gemma (open)
      { id: 'gemma-4',               name: 'Gemma 4',               group: 'Open · Gemma', tag: 'open',   desc: 'Open-weight. Reasoning, coding, multimodal (E2B/E4B add audio).' },
      { id: 'gemma-3',               name: 'Gemma 3',               group: 'Open · Gemma', tag: 'open',   desc: 'Open-weight. Text + image, 140+ languages, 128K context.' },
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    initial: 'X',
    color: 'from-slate-300 to-slate-500',
    docs: 'console.x.ai',
    keyHint: 'xai-…',
    models: [
      { id: 'grok-4',         name: 'Grok 4',         group: 'Grok 4', tag: 'flagship',  desc: 'Frontier reasoning. Real-time data hooks.' },
      { id: 'grok-4-heavy',   name: 'Grok 4 Heavy',   group: 'Grok 4', tag: 'reasoning', desc: 'Multi-agent variant for the hardest problems.' },
      { id: 'grok-4-fast',    name: 'Grok 4 Fast',    group: 'Grok 4', tag: 'fast',      desc: 'Lower-latency Grok 4 for production traffic.' },
      { id: 'grok-3',         name: 'Grok 3',         group: 'Grok 3', tag: 'legacy',    desc: 'Previous-generation flagship.' },
      { id: 'grok-3-mini',    name: 'Grok 3 mini',    group: 'Grok 3', tag: 'legacy',    desc: 'Smaller Grok 3.' },
      { id: 'grok-code-fast', name: 'Grok Code Fast', group: 'Coding', tag: 'fast',      desc: 'Coding-tuned, low-latency variant.' },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    initial: 'M',
    color: 'from-amber-400 to-rose-500',
    docs: 'console.mistral.ai',
    keyHint: 'mr-…',
    models: [
      { id: 'mistral-large-2-1',  name: 'Mistral Large 2.1', group: 'Premier',   tag: 'flagship',  desc: 'Frontier reasoning. Strong on European languages.' },
      { id: 'mistral-medium-3',   name: 'Mistral Medium 3',  group: 'Premier',   tag: 'balanced',  desc: 'Good price/quality balance for general use.' },
      { id: 'mistral-small-3-2',  name: 'Mistral Small 3.2', group: 'Premier',   tag: 'fast',      desc: 'Smaller, faster, cheaper.' },
      { id: 'magistral-medium',   name: 'Magistral Medium',  group: 'Reasoning', tag: 'reasoning', desc: 'Reasoning-specialised model with extended thinking.' },
      { id: 'codestral-2',        name: 'Codestral 2',       group: 'Coding',    tag: 'fast',      desc: 'Coding-specialised, optimised for low latency.' },
      { id: 'pixtral-large',      name: 'Pixtral Large',     group: 'Vision',    tag: 'balanced',  desc: 'Multimodal flagship for image + text understanding.' },
      { id: 'ministral-8b',       name: 'Ministral 8B',      group: 'Edge',      tag: 'open',      desc: 'Open-weight edge model.' },
      { id: 'ministral-3b',       name: 'Ministral 3B',      group: 'Edge',      tag: 'open',      desc: 'Smallest edge model. Mobile/on-device.' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    initial: 'D',
    color: 'from-violet-400 to-fuchsia-500',
    docs: 'platform.deepseek.com',
    keyHint: 'sk-…',
    models: [
      { id: 'deepseek-v4',       name: 'DeepSeek V4',       group: 'V-series', tag: 'flagship',  desc: 'April 2026 flagship. Top-tier price-performance.' },
      { id: 'deepseek-v3.5',     name: 'DeepSeek V3.5',     group: 'V-series', tag: 'balanced',  desc: 'Very low cost. Solid quality on drafts and summaries.' },
      { id: 'deepseek-v3.2',     name: 'DeepSeek V3.2',     group: 'V-series', tag: 'legacy',    desc: 'Previous-gen V-series. Strong cost efficiency.' },
      { id: 'deepseek-r2',       name: 'DeepSeek R2',       group: 'Reasoner', tag: 'reasoning', desc: 'Chain-of-thought reasoner. Best for revisions.' },
      { id: 'deepseek-r1',       name: 'DeepSeek R1',       group: 'Reasoner', tag: 'legacy',    desc: 'Original open-weights reasoner.' },
      { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2', group: 'Coding',   tag: 'fast',      desc: 'Coding-tuned. Strong on HumanEval / MBPP.' },
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    initial: 'C',
    color: 'from-pink-400 to-rose-500',
    docs: 'dashboard.cohere.com',
    keyHint: 'co-…',
    models: [
      { id: 'command-a',           name: 'Command A',           group: 'Command A', tag: 'flagship',  desc: 'Enterprise-tuned flagship. Strong on structured replies.' },
      { id: 'command-a-vision',    name: 'Command A Vision',    group: 'Command A', tag: 'balanced',  desc: 'Vision variant with image-grounded reasoning.' },
      { id: 'command-a-reasoning', name: 'Command A Reasoning', group: 'Command A', tag: 'reasoning', desc: 'Reasoning-tuned. Extended thinking budgets.' },
      { id: 'command-r-plus',      name: 'Command R+',          group: 'Command R', tag: 'legacy',    desc: 'RAG-tuned. Reliable retrieval and citation behaviour.' },
      { id: 'command-r',           name: 'Command R',           group: 'Command R', tag: 'legacy',    desc: 'Lighter retrieval-focused option.' },
      { id: 'command-r7b',         name: 'Command R7B',         group: 'Command R', tag: 'fast',      desc: 'Smallest Command R. Fast and cheap.' },
      { id: 'aya-expanse-32b',     name: 'Aya Expanse 32B',     group: 'Aya',       tag: 'open',      desc: 'Multilingual. 23 languages, open-weight friendly.' },
      { id: 'aya-expanse-8b',      name: 'Aya Expanse 8B',      group: 'Aya',       tag: 'open',      desc: 'Smaller Aya for edge / on-device.' },
    ],
  },
  {
    id: 'meta',
    name: 'Meta · Llama',
    initial: 'L',
    color: 'from-blue-400 to-indigo-500',
    docs: 'llama.developer.meta.com',
    keyHint: 'LLM|…',
    models: [
      { id: 'llama-4-behemoth',     name: 'Llama 4 Behemoth',     group: 'Llama 4', tag: 'flagship',  desc: 'Largest Llama 4 (~2T params, MoE). Significant hardware required.' },
      { id: 'llama-4-maverick',     name: 'Llama 4 Maverick',     group: 'Llama 4', tag: 'flagship',  desc: '400B-param MoE. Open-weights flagship; self-host or hosted API.' },
      { id: 'llama-4-scout',        name: 'Llama 4 Scout',        group: 'Llama 4', tag: 'balanced',  desc: '109B-param MoE. Long-context friendly.' },
      { id: 'llama-3-3-70b',        name: 'Llama 3.3 70B',        group: 'Llama 3', tag: 'legacy',    desc: 'Strong 70B legacy text model.' },
      { id: 'llama-3-2-90b-vision', name: 'Llama 3.2 90B Vision', group: 'Llama 3', tag: 'legacy',    desc: 'Vision-capable Llama 3.2.' },
      { id: 'llama-3-2-11b-vision', name: 'Llama 3.2 11B Vision', group: 'Llama 3', tag: 'legacy',    desc: 'Smaller vision variant.' },
      { id: 'llama-3-2-3b',         name: 'Llama 3.2 3B',         group: 'Llama 3', tag: 'fast',      desc: 'Tiny edge model for mobile/on-device.' },
    ],
  },
];

function findModelMeta(modelId) {
  for (const p of PROVIDERS) {
    const m = p.models.find((mm) => p.id + '/' + mm.id === modelId);
    if (m) return { provider: p, model: m };
  }
  return null;
}

function ProviderModelPicker({ selectedModel, onSelectModel, apiKeys, patchKey }) {
  const [expandedProvider, setExpandedProvider] = useState(() => {
    const meta = findModelMeta(selectedModel);
    return meta ? meta.provider.id : 'anthropic';
  });
  const current = findModelMeta(selectedModel);

  return (
    <Card>
      <CardHeader
        title="Model & API keys"
        desc="Bring your own key for any provider. Keys are stored locally and never leave your browser; Copilot routes requests client-side."
      />

      {/* Current selection summary */}
      <div className="mx-5 mb-4 p-3.5 rounded-md border border-sky-400/30 bg-sky-400/5 flex items-center gap-3">
        {current && (
          <>
            <div className={'w-8 h-8 rounded-md bg-gradient-to-br ' + current.provider.color + ' flex items-center justify-center text-slate-950 text-[13px] font-bold flex-shrink-0'}>
              {current.provider.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-semibold text-slate-100">{current.model.name}</span>
                <ModelTag tag={current.model.tag} />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Active model · {current.provider.name}
                {(() => {
                  const k = apiKeys[current.provider.id];
                  if (!k || !k.value)        return <span className="ml-2 text-amber-300">· No key set · falling back to heuristic</span>;
                  if (!k.verified)           return <span className="ml-2 text-amber-300">· Key not verified · falling back to heuristic</span>;
                  if (!k.enabled)            return <span className="ml-2 text-amber-300">· Key disabled · falling back to heuristic</span>;
                  return <span className="ml-2 text-emerald-300">· Verified · routing live</span>;
                })()}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
              <I.Check size={9} strokeWidth={3} /> Active
            </span>
          </>
        )}
      </div>

      <div className="px-5 pb-5 space-y-2">
        {PROVIDERS.map((p) => {
          const k = apiKeys[p.id] || { value: '', verified: false, locked: false, enabled: true };
          const isExpanded = expandedProvider === p.id;
          const selectedInProvider = current && current.provider.id === p.id;
          return (
            <div key={p.id} className={'rounded-md border overflow-hidden transition-colors ' + (isExpanded ? 'border-slate-700 bg-slate-900/60' : 'border-slate-800 bg-slate-900/30 hover:border-slate-700')}>
              <button
                onClick={() => setExpandedProvider(isExpanded ? null : p.id)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left"
              >
                <div className={'w-7 h-7 rounded-md bg-gradient-to-br ' + p.color + ' flex items-center justify-center text-slate-950 text-[12px] font-bold flex-shrink-0'}>
                  {p.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-slate-100">{p.name}</span>
                    {selectedInProvider && (
                      <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase tracking-wide">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {p.models.length} model{p.models.length === 1 ? '' : 's'} · {p.docs}
                  </div>
                </div>
                <KeyBadge keyState={k} />
                <I.ChevronDown size={13} className={'text-slate-500 transition-transform ' + (isExpanded ? '' : '-rotate-90')} />
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-slate-800/60">
                  <ApiKeyInput
                    provider={p}
                    keyState={k}
                    onPatch={(patch) => patchKey(p.id, patch)}
                  />
                  <div className="space-y-3">
                    {(() => {
                      // Group models by `group` field, preserving original order.
                      const groups = [];
                      const seen = new Map();
                      for (const m of p.models) {
                        const g = m.group || 'Models';
                        if (!seen.has(g)) { seen.set(g, groups.length); groups.push({ name: g, items: [] }); }
                        groups[seen.get(g)].items.push(m);
                      }
                      return groups.map((grp) => (
                        <div key={grp.name} className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 px-1">{grp.name}</div>
                          {grp.items.map((m) => {
                            const fullId = p.id + '/' + m.id;
                            const sel = selectedModel === fullId;
                            return (
                              <button
                                key={m.id}
                                onClick={() => onSelectModel(fullId)}
                                className={
                                  'w-full text-left p-3 rounded-md border flex items-start gap-3 transition-all ' +
                                  (sel
                                    ? 'border-sky-400/50 bg-sky-400/5'
                                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700')
                                }
                              >
                                <span className={
                                  'mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                                  (sel ? 'border-sky-400 bg-sky-400' : 'border-slate-700')
                                }>
                                  {sel && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[12.5px] font-semibold text-slate-100">{m.name}</span>
                                    <ModelTag tag={m.tag} />
                                    <code className="text-[10px] text-slate-500 font-mono ml-auto">{fullId}</code>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">{m.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/40 flex items-start gap-2.5">
        <I.Shield size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-slate-500 leading-relaxed">
          <span className="text-slate-300 font-medium">Local-only storage.</span> Keys are kept in this browser's storage and sent only to the matching provider's API. They never touch our servers and are wiped when you clear local cache.
        </div>
      </div>
    </Card>
  );
}

function KeyBadge({ keyState }) {
  const k = keyState || {};
  if (!k.value) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-slate-800 text-slate-500 border border-slate-700">
        No key
      </span>
    );
  }
  if (!k.verified) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
        Unverified
      </span>
    );
  }
  if (!k.enabled) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
        Disabled
      </span>
    );
  }
  if (k.locked) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
        <I.Lock size={9} strokeWidth={2} />
        Locked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
      <I.Check size={9} strokeWidth={2.8} />
      Verified
    </span>
  );
}

function ModelTag({ tag }) {
  const map = {
    flagship:  'bg-sky-400/10 text-sky-300 border-sky-400/30',
    balanced:  'bg-indigo-400/10 text-indigo-300 border-indigo-400/30',
    fast:      'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
    reasoning: 'bg-violet-400/10 text-violet-300 border-violet-400/30',
    open:      'bg-amber-400/10 text-amber-300 border-amber-400/30',
    legacy:    'bg-slate-700/40 text-slate-400 border-slate-700',
  };
  return (
    <span className={'inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-medium border uppercase tracking-wide ' + (map[tag] || map.balanced)}>
      {tag}
    </span>
  );
}

function ApiKeyInput({ provider, keyState, onPatch }) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(keyState.value || '');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { ok, message, latencyMs }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const verifyTimer = useRef(null);
  React.useEffect(() => () => clearTimeout(verifyTimer.current), []);

  // Sync draft when keyState changes externally (e.g. provider switch)
  React.useEffect(() => { setDraft(keyState.value || ''); setVerifyResult(null); }, [keyState.value]);

  const isLocked = keyState.locked;
  const isVerified = keyState.verified;
  const hasStoredValue = !!keyState.value;
  const draftMatchesStored = draft === keyState.value;
  const dirtyFromVerified = isVerified && !draftMatchesStored;
  const canVerify = draft.length >= 8 && !verifying && !isLocked && !(isVerified && draftMatchesStored);

  const runVerify = () => {
    setVerifying(true);
    setVerifyResult(null);
    const latency = 700 + Math.floor(Math.random() * 900);
    verifyTimer.current = setTimeout(() => {
      // Simulate: keys matching the provider's hint prefix succeed; otherwise fail.
      const prefix = (provider.keyHint || '').split('…')[0].trim();
      const looksRight = prefix ? draft.toLowerCase().startsWith(prefix.toLowerCase().slice(0, 3)) : draft.length >= 16;
      if (looksRight && draft.length >= 12) {
        setVerifyResult({ ok: true, message: `Reached ${provider.name} \u00b7 ${provider.models.length} model${provider.models.length === 1 ? '' : 's'} available`, latencyMs: latency });
        onPatch({ value: draft, verified: true, verifiedAt: Date.now(), enabled: true });
      } else {
        setVerifyResult({ ok: false, message: 'Authentication failed. Check the key and try again.', latencyMs: latency });
        onPatch({ value: draft, verified: false, verifiedAt: null });
      }
      setVerifying(false);
    }, latency);
  };

  const cancelEdit = () => {
    setDraft(keyState.value || '');
    setVerifyResult(null);
  };

  return (
    <div className="rounded-md bg-slate-950/60 border border-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-medium text-slate-300 inline-flex items-center gap-1.5">
          <I.Lock size={11} className="text-slate-500" />
          API key
          {isVerified && !dirtyFromVerified && (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
              <I.Check size={9} strokeWidth={2.8} /> Verified
            </span>
          )}
          {isLocked && (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-slate-700/60 text-slate-300 border border-slate-600 uppercase tracking-wide">
              <I.Lock size={9} strokeWidth={2} /> Locked
            </span>
          )}
          {hasStoredValue && !keyState.enabled && (
            <span className="ml-1 inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">
              Disabled
            </span>
          )}
        </label>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-[10.5px] text-sky-300 hover:text-sky-200 transition-colors inline-flex items-center gap-1"
        >
          Get a key on {provider.docs}
          <I.ChevronRight size={9} />
        </a>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type={show ? 'text' : 'password'}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (verifyResult) setVerifyResult(null); }}
            disabled={isLocked || verifying}
            placeholder={provider.keyHint}
            className={
              'w-full h-9 px-3 pr-9 bg-slate-900 border rounded-md text-[12px] font-mono text-slate-200 placeholder:text-slate-600 focus:border-slate-700 focus-ring transition-colors ' +
              (verifyResult && verifyResult.ok === false ? 'border-rose-500/50' :
               isVerified && !dirtyFromVerified ? 'border-emerald-500/40' :
               'border-slate-800') +
              (isLocked ? ' opacity-60 cursor-not-allowed' : '')
            }
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide key' : 'Show key'}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <EyeIcon open={show} />
          </button>
        </div>

        {!isLocked && (
          <button
            onClick={runVerify}
            disabled={!canVerify}
            className={
              'h-9 px-3 rounded-md text-[12px] font-semibold transition-colors inline-flex items-center gap-1.5 ' +
              (canVerify
                ? 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed')
            }
          >
            {verifying ? <><Spinner /> Verifying…</> : (isVerified && draftMatchesStored ? 'Verified' : 'Verify')}
          </button>
        )}

        {dirtyFromVerified && (
          <button
            onClick={cancelEdit}
            className="h-9 px-2.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 text-[11px] font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Verify result strip */}
      {verifyResult && (
        <div className={
          'mt-2 px-2.5 py-1.5 rounded-md text-[10.5px] inline-flex items-center gap-1.5 ' +
          (verifyResult.ok
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
            : 'bg-rose-500/10 text-rose-300 border border-rose-500/30')
        }>
          {verifyResult.ok
            ? <I.Check size={11} strokeWidth={2.6} />
            : <I.X size={11} strokeWidth={2.6} />}
          <span>{verifyResult.message}</span>
          {verifyResult.ok && (
            <span className="text-emerald-400/70">· {verifyResult.latencyMs} ms</span>
          )}
        </div>
      )}

      {/* Help line for unverified-with-stored-value (loaded from prefs but never verified this session) */}
      {!verifyResult && hasStoredValue && !isVerified && !verifying && (
        <div className="mt-2 text-[10.5px] text-amber-300 inline-flex items-center gap-1.5">
          <I.Clock size={10} /> Key not verified. Click Verify to test this key against {provider.name}.
        </div>
      )}

      {/* Action toolbar — only when there's a stored, verified value */}
      {hasStoredValue && isVerified && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
          {/* Enable / Disable */}
          <button
            onClick={() => onPatch({ enabled: !keyState.enabled })}
            className={
              'h-7 px-2.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors ' +
              (keyState.enabled
                ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15')
            }
          >
            {keyState.enabled ? <><I.Pause size={10} /> Disable</> : <><I.Play size={10} /> Enable</>}
          </button>

          {/* Lock / Unlock */}
          <button
            onClick={() => onPatch({ locked: !keyState.locked })}
            className="h-7 px-2.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors"
          >
            {keyState.locked ? <><I.Unlock size={10} /> Unlock to edit</> : <><I.Lock size={10} /> Lock</>}
          </button>

          {/* Delete */}
          <div className="ml-auto inline-flex items-center gap-1.5">
            {confirmDelete ? (
              <>
                <span className="text-[10.5px] text-slate-400">Delete this key?</span>
                <button
                  onClick={() => { onPatch({ value: '', verified: false, locked: false, enabled: true, verifiedAt: null }); setDraft(''); setVerifyResult(null); setConfirmDelete(false); }}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25 transition-colors"
                >
                  Confirm delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-slate-900 border border-slate-800 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors inline-flex items-center gap-1.5"
              >
                <I.Trash size={10} /> Delete key
              </button>
            )}
          </div>

          {keyState.verifiedAt && (
            <div className="basis-full mt-1 text-[10px] text-slate-500">
              Verified {formatVerifiedAt(keyState.verifiedAt)} · stored locally only
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatVerifiedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60 * 1000) return 'just now';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' min ago';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Spinner() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="animate-spin" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
    </svg>
  );
}

function NotificationsSection({ prefs, update, updateNotify }) {
  return (
    <Section title="Notifications" desc="In-app notifications, toasts, and reminder delivery.">
      <Card>
        <CardHeader title="Notify me about" />
        <Row title="Mentions in incoming mail"   desc="When someone @-mentions you in a Gmail thread." control={<Toggle value={prefs.notifyOn.mentions} onChange={(v) => updateNotify('mentions', v)} />} />
        <Row title="Reminders due"               desc="Follow-ups you've scheduled on threads."        control={<Toggle value={prefs.notifyOn.reminders} onChange={(v) => updateNotify('reminders', v)} />} />
        <Row title="Outgoing send confirmations" desc="Toast on every successful send."               control={<Toggle value={prefs.notifyOn.sends} onChange={(v) => updateNotify('sends', v)} />} />
        <Row title="Background sync events"      desc="Quiet by default; useful for debugging."       control={<Toggle value={prefs.notifyOn.sync} onChange={(v) => updateNotify('sync', v)} />} last />
      </Card>

      <Card>
        <Row
          title="Reminder lead time"
          desc={`Surface reminders ${prefs.reminderLeadTime} minutes before they're due.`}
          control={
            <Slider min={0} max={120} step={5} value={prefs.reminderLeadTime} suffix=" min" onChange={(v) => update({ reminderLeadTime: v })} />
          }
        />
        <Row
          title="Toast duration"
          desc="How long success and error toasts stay on screen."
          control={
            <Slider min={2} max={15} step={1} value={prefs.toastDuration} suffix=" s" onChange={(v) => update({ toastDuration: v })} />
          }
        />
        <Row
          title="Desktop notifications"
          desc="Show OS-level notifications when this tab is in the background."
          control={<Toggle value={prefs.desktopNotifications} onChange={(v) => update({ desktopNotifications: v })} />}
          last
        />
      </Card>
    </Section>
  );
}

function AppearanceSection({ prefs, update }) {
  return (
    <Section title="Appearance" desc="Look, density, and typography. Light mode is intentionally not offered.">
      <Card>
        <CardHeader title="Theme" desc="Slate dark is the only supported theme — color contrast on AI panels is tuned for it." />
        <div className="px-5 pb-5">
          <div className="grid grid-cols-3 gap-3">
            <ThemeSwatch selected name="Slate" sample={['#020617','#0f172a','#7dd3fc']} />
            <ThemeSwatchLocked name="Light" sample={['#f8fafc','#e2e8f0','#0ea5e9']} />
            <ThemeSwatchLocked name="System" sample={['#0f172a','#475569','#38bdf8']} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Density" desc="Affects row height in the thread list." />
        <div className="px-5 pb-5">
          <Segmented
            value={prefs.density}
            onChange={(v) => update({ density: v })}
            options={[
              { value: 'compact',     label: 'Compact' },
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'spacious',    label: 'Spacious' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Format" />
        <Row title="Time format" control={
          <Segmented size="sm" value={prefs.timeFormat} onChange={(v) => update({ timeFormat: v })} options={[
            { value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' },
          ]} />
        } />
        <Row title="Show participant avatars" control={<Toggle value={prefs.showAvatars} onChange={(v) => update({ showAvatars: v })} />} />
        <Row title="Show snippets in list"    control={<Toggle value={prefs.showSnippets} onChange={(v) => update({ showSnippets: v })} />} last />
      </Card>
    </Section>
  );
}

const SHORTCUTS = [
  { group: 'Navigation', items: [
    ['j', 'Next thread'],
    ['k', 'Previous thread'],
    ['g i', 'Go to Inbox'],
    ['g s', 'Go to Sent'],
    ['/', 'Focus search'],
    ['Esc', 'Clear / close'],
  ]},
  { group: 'Actions', items: [
    ['r', 'Reply'],
    ['a', 'Reply all'],
    ['f', 'Forward'],
    ['c', 'Compose new'],
    ['e', 'Archive'],
    ['#', 'Trash'],
    ['Cmd ↵', 'Send'],
  ]},
  { group: 'Copilot', items: [
    ['Cmd .', 'Summarize current thread'],
    ['Cmd Shift D', 'Draft a reply'],
    ['Cmd Shift R', 'Revise current draft'],
    ['Cmd ↩', 'Insert draft into reply'],
  ]},
];

function KeyboardSection() {
  return (
    <Section title="Keyboard shortcuts" desc="Every action in Copilot has a shortcut. Defaults shown below — remapping is coming.">
      {SHORTCUTS.map((g) => (
        <Card key={g.group}>
          <CardHeader title={g.group} />
          <div className="px-5 pb-4">
            <table className="w-full text-[12.5px]">
              <tbody>
                {g.items.map(([key, label]) => (
                  <tr key={key} className="border-b border-slate-800/60 last:border-b-0">
                    <td className="py-2.5 text-slate-300">{label}</td>
                    <td className="py-2.5 text-right">
                      {key.split(' ').map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="text-slate-600 mx-1">then</span>}
                          <kbd>{part}</kbd>
                        </React.Fragment>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </Section>
  );
}

function ConnectedSection() {
  return (
    <Section title="Connected apps" desc="Services Copilot can read from or push to. All connections are scoped to your account only.">
      <Card>
        <ConnectionRow
          name="Gmail"
          status="active"
          desc="Read, send, modify · Push notifications enabled"
          meta="mira.okafor@gmail.com · Last sync 30 s ago"
          color="from-rose-400 to-amber-400"
          initial="G"
        />
        <ConnectionRow
          name="Google Calendar"
          status="suggested"
          desc="See upcoming meetings inline when threads reference them"
          color="from-sky-400 to-indigo-500"
          initial="C"
        />
        <ConnectionRow
          name="Linear"
          status="suggested"
          desc="Convert reply requests into Linear issues with one keystroke"
          color="from-violet-400 to-fuchsia-500"
          initial="L"
        />
        <ConnectionRow
          name="Slack"
          status="suggested"
          desc="Forward replies into a channel or DM"
          color="from-emerald-400 to-teal-500"
          initial="S"
          last
        />
      </Card>
    </Section>
  );
}

function PrivacySection({ prefs, update }) {
  return (
    <Section title="Privacy & data" desc="What Copilot stores locally, how long, and what it shares.">
      <Card>
        <Row
          title="Cache drafts on this device"
          desc="When off, drafts only live in memory and clear on refresh."
          control={<Toggle value={prefs.storeDrafts} onChange={(v) => update({ storeDrafts: v })} />}
        />
        <Row
          title="Local cache retention"
          desc={`Threads, message bodies, and search index are wiped after ${prefs.retentionDays} days of inactivity.`}
          control={<Slider min={1} max={90} step={1} value={prefs.retentionDays} suffix=" days" onChange={(v) => update({ retentionDays: v })} />}
        />
        <Row
          title="Share anonymized usage"
          desc="Aggregate event counts only — never message content. Disabled by default."
          control={<Toggle value={prefs.shareAnonymizedUsage} onChange={(v) => update({ shareAnonymizedUsage: v })} />}
          last
        />
      </Card>

      <Card>
        <CardHeader title="What Copilot never does" />
        <ul className="px-5 pb-5 space-y-2 text-[12.5px] text-slate-300">
          {[
            'Train shared models on your mail. Your data is never used for training.',
            'Send messages or modify mail without an explicit click.',
            'Index attachments. We list filenames; we never read bodies.',
            'Share data between accounts or organizations.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <I.Check size={9} strokeWidth={2.8} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card destructive>
        <CardHeader title="Clear local cache" desc="Wipes all locally cached threads, messages, drafts, and reminders. Your Gmail account is untouched." destructive />
        <div className="px-5 pb-4">
          <button className="h-9 px-3.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[12.5px] font-medium transition-colors">
            Clear local cache…
          </button>
        </div>
      </Card>
    </Section>
  );
}

// ── Building blocks ────────────────────────────────────────────────────────

function Section({ title, desc, children }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold text-slate-50 tracking-tight">{title}</h1>
        {desc && <p className="mt-1.5 text-[13px] text-slate-400 leading-relaxed">{desc}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Card({ children, destructive }) {
  return (
    <div className={
      'rounded-lg bg-slate-900/40 border overflow-hidden ' +
      (destructive ? 'border-rose-500/20' : 'border-slate-800')
    }>
      {children}
    </div>
  );
}

function CardHeader({ title, desc, destructive }) {
  return (
    <div className="px-5 pt-4 pb-3">
      <div className={'text-[13px] font-semibold ' + (destructive ? 'text-rose-200' : 'text-slate-100')}>{title}</div>
      {desc && <div className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed">{desc}</div>}
    </div>
  );
}

function Row({ title, desc, control, last }) {
  return (
    <div className={'px-5 py-3.5 flex items-center gap-4 ' + (last ? '' : 'border-b border-slate-800/60')}>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-slate-200 font-medium">{title}</div>
        {desc && <div className="mt-0.5 text-[11.5px] text-slate-500 leading-relaxed pr-4">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={
        'relative w-9 h-5 rounded-full transition-colors ' +
        (value ? 'bg-sky-400' : 'bg-slate-700')
      }
    >
      <span className={
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ' +
        (value ? 'left-[18px]' : 'left-0.5')
      } />
    </button>
  );
}

function Segmented({ value, onChange, options, size = 'md' }) {
  const h = size === 'sm' ? 'h-7' : 'h-8';
  return (
    <div className={'inline-flex bg-slate-900/80 border border-slate-800 rounded-md p-0.5 ' + h}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={
            'px-3 rounded text-[11.5px] font-medium transition-colors ' +
            (value === o.value ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({ min, max, step, value, onChange, suffix }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="w-[220px] flex items-center gap-3">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${pct}%, #1e293b ${pct}%, #1e293b 100%)` }}
      />
      <span className="text-[11.5px] text-slate-300 font-mono tabular-nums w-14 text-right">
        {value}{suffix}
      </span>
    </div>
  );
}

function ToneCards({ value, onChange }) {
  const tones = [
    { value: 'concise',  label: 'Concise',  preview: '"Aligned on pool and liq pref. Sending names tomorrow."' },
    { value: 'friendly', label: 'Friendly', preview: '"Got it — thanks for the quick turn. Pool stays at 18%."' },
    { value: 'formal',   label: 'Formal',   preview: '"We accept the 18% pool and the 1× non-participating preference."' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {tones.map((t) => {
        const sel = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={
              'text-left p-3.5 rounded-lg border transition-all ' +
              (sel
                ? 'border-sky-400/50 bg-sky-400/5 ring-1 ring-sky-400/30'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700')
            }
          >
            <div className="flex items-center justify-between mb-2">
              <span className={'text-[12.5px] font-semibold ' + (sel ? 'text-sky-200' : 'text-slate-200')}>{t.label}</span>
              <span className={
                'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ' +
                (sel ? 'border-sky-400 bg-sky-400' : 'border-slate-700')
              }>
                {sel && <span className="w-1 h-1 rounded-full bg-slate-950" />}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed italic">{t.preview}</div>
          </button>
        );
      })}
    </div>
  );
}

function EyeIcon({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.2 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.2-1.5" />
          <path d="m3 3 18 18" />
        </>
      )}
    </svg>
  );
}

function ThemeSwatch({ name, sample, selected }) {
  return (
    <button className={
      'p-2 rounded-lg border text-left transition-colors ' +
      (selected ? 'border-sky-400/60 ring-1 ring-sky-400/30' : 'border-slate-800 hover:border-slate-700')
    }>
      <div className="h-16 rounded-md mb-2 overflow-hidden border border-slate-800 flex">
        {sample.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-200">{name}</span>
        {selected && <I.Check size={12} className="text-sky-300" strokeWidth={2.6} />}
      </div>
    </button>
  );
}

function ThemeSwatchLocked({ name, sample }) {
  return (
    <button disabled className="p-2 rounded-lg border border-slate-800/50 text-left opacity-50 cursor-not-allowed">
      <div className="h-16 rounded-md mb-2 overflow-hidden border border-slate-800 flex">
        {sample.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-500">{name}</span>
        <span className="text-[9.5px] uppercase tracking-wide text-slate-600">Soon</span>
      </div>
    </button>
  );
}

function ScopeRow({ label, desc, status, last }) {
  return (
    <div className={'px-5 py-3 flex items-center gap-3 ' + (last ? '' : 'border-b border-slate-800/60')}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <code className="text-[12px] font-mono text-slate-200">{label}</code>
        <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
      </div>
      <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wide">
        {status}
      </span>
    </div>
  );
}

function ConnectionRow({ name, status, desc, meta, color, initial, last }) {
  const active = status === 'active';
  return (
    <div className={'px-5 py-4 flex items-center gap-3.5 ' + (last ? '' : 'border-b border-slate-800/60')}>
      <div className={'w-9 h-9 rounded-md bg-gradient-to-br ' + color + ' flex items-center justify-center text-slate-950 text-[13px] font-bold flex-shrink-0'}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-100">{name}</span>
          {active && (
            <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded text-[9.5px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wide">
              Connected
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-slate-500 mt-0.5">{desc}</div>
        {meta && <div className="text-[10.5px] text-slate-600 font-mono mt-1">{meta}</div>}
      </div>
      <button className={
        'h-8 px-3 rounded-md text-[12px] font-medium transition-colors ' +
        (active
          ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
          : 'bg-slate-100 hover:bg-white text-slate-950')
      }>
        {active ? 'Manage' : 'Connect'}
      </button>
    </div>
  );
}

function SecondaryButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[12px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function PrefIcon({ name, size = 14 }) {
  const map = {
    user: <PrefSvg size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></PrefSvg>,
    sparkles: <I.Sparkles size={size} />,
    bell: <I.Bell size={size} />,
    paint: <PrefSvg size={size}><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2a10 10 0 1 0 5.4 18.4c.7-.5 1-1.4.7-2.2l-.7-2a1.5 1.5 0 0 1 1.4-2.1H21a1 1 0 0 0 1-1V12A10 10 0 0 0 12 2Z" /></PrefSvg>,
    keyboard: <PrefSvg size={size}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h0M10 10h0M14 10h0M18 10h0M6 14h12" /></PrefSvg>,
    plug: <PrefSvg size={size}><path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8ZM12 17v5" /></PrefSvg>,
    shield: <PrefSvg size={size}><path d="M12 2 4 5v7c0 5 3.5 9 8 10 4.5-1 8-5 8-10V5l-8-3Z" /></PrefSvg>,
  };
  return map[name] || null;
}

// Wrap a generic SVG (uses 24-box stroke style of icons.jsx)
function PrefSvg({ size = 14, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

window.PreferencesPage = PreferencesPage;
