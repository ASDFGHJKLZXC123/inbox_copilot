// Mock data for the prototype.
// Shapes mirror lib/types.ts contracts from the spec.

const NOW = new Date('2026-05-11T14:32:00Z');

const iso = (offsetMinutes) => new Date(NOW.getTime() + offsetMinutes * 60_000).toISOString();

const SESSION = {
  status: 'authenticated',
  user: {
    name: 'Mira Okafor',
    email: 'mira.okafor@gmail.com',
    image: null,
    initial: 'M',
  },
};

const THREADS = [
  {
    id: 't_acq',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'Series B term sheet — final markup',
    participants: ['Dani Park <dani@kestrel.vc>', 'Mira Okafor', 'Sam Rhee <sam@kestrel.vc>'],
    lastMessageAt: iso(-22),
    labels: ['INBOX', 'IMPORTANT'],
    unreadCount: 1,
    messageIds: ['m_acq_1', 'm_acq_2', 'm_acq_3'],
    preview: 'Latest red-lines attached. We can hold the 18% pool but need movement on the liquidation pref…',
  },
  {
    id: 't_lin',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'RE: Q3 roadmap commitments — eng allocation',
    participants: ['Theo Vance <theo@halcyon.io>', 'Mira Okafor'],
    lastMessageAt: iso(-94),
    labels: ['INBOX'],
    unreadCount: 1,
    messageIds: ['m_lin_1', 'm_lin_2'],
    preview: 'I pushed back on the data-platform scope. We can ship pipelines in Q3 but discovery is Q4.',
  },
  {
    id: 't_des',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'Brand refresh — round 2 explorations',
    participants: ['Ana Liu <ana@northbeam.studio>', 'Mira Okafor'],
    lastMessageAt: iso(-180),
    labels: ['INBOX'],
    unreadCount: 0,
    messageIds: ['m_des_1'],
    preview: 'Four directions inside. Direction 2 leans into the editorial type voice we discussed.',
  },
  {
    id: 't_hire',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'Intro: Priya Shankar (Head of Eng candidate)',
    participants: ['Jen Maro <jen@northbridge.partners>', 'Mira Okafor', 'Priya Shankar'],
    lastMessageAt: iso(-340),
    labels: ['INBOX'],
    unreadCount: 0,
    messageIds: ['m_hire_1'],
    preview: 'Priya is winding down at Stripe and looking for a 0→1 platform role. Calendars cc\'d.',
  },
  {
    id: 't_fin',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'April board pack — final numbers',
    participants: ['Eli Chen <eli@halcyon.io>', 'Mira Okafor'],
    lastMessageAt: iso(-510),
    labels: ['INBOX'],
    unreadCount: 0,
    messageIds: ['m_fin_1'],
    preview: 'ARR closed at $4.31M, +14% MoM. Burn at $612k. Runway 19 mo at current spend.',
  },
  {
    id: 't_cust',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'Linear escalation — Adyen integration regression',
    participants: ['Customer Success', 'Mira Okafor'],
    lastMessageAt: iso(-720),
    labels: ['INBOX'],
    unreadCount: 2,
    messageIds: ['m_cust_1', 'm_cust_2'],
    preview: 'Three enterprise tenants hit the 4xx on webhook replay. Backfill running, ETA 2h.',
  },
  {
    id: 't_pr',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'TechCrunch — quote review for Tuesday piece',
    participants: ['Rae Iwasaki <rae@axiom.pr>', 'Mira Okafor'],
    lastMessageAt: iso(-1200),
    labels: ['INBOX'],
    unreadCount: 0,
    messageIds: ['m_pr_1'],
    preview: 'Quote 2 reads a bit corporate. Want to make it more first-person?',
  },
  {
    id: 't_legal',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'DPA redlines — Kestrel portfolio standard',
    participants: ['Counsel <counsel@latham.com>', 'Mira Okafor'],
    lastMessageAt: iso(-1800),
    labels: ['INBOX'],
    unreadCount: 0,
    messageIds: ['m_legal_1'],
    preview: 'Two outstanding items: sub-processor notification window and audit scope.',
  },
  {
    id: 't_news',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'The Brief · The week founders stopped pretending',
    participants: ['The Brief <hello@thebrief.email>', 'Mira Okafor'],
    lastMessageAt: iso(-240),
    labels: ['INBOX', 'CATEGORY_PROMOTIONS'],
    unreadCount: 1,
    messageIds: ['m_news_1'],
    preview: 'This week: pricing experiments that actually moved retention, one chart on Series A timing…',
  },
  {
    id: 't_receipt',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    subject: 'Your Linear invoice — May 2026',
    participants: ['Linear Billing <billing@linear.app>', 'Mira Okafor'],
    lastMessageAt: iso(-2880),
    labels: ['INBOX'],
    unreadCount: 0,
    messageIds: ['m_receipt_1'],
    preview: 'Receipt for $384.00 paid to Linear. Plan: Business · 12 seats. Card ending 4421.',
  },
];

const MESSAGES = [
  {
    id: 'm_acq_1',
    threadId: 't_acq',
    from: 'Dani Park <dani@kestrel.vc>',
    to: ['mira.okafor@gmail.com'],
    cc: ['Sam Rhee <sam@kestrel.vc>'],
    subject: 'Series B term sheet — final markup',
    snippet: 'Mira — sending the markup over before our call tomorrow.',
    bodyText:
      "Mira —\n\nSending the markup over before our call tomorrow. A few headline items from our side:\n\n  • Valuation: we're comfortable at $148M pre, $182M post.\n  • Option pool: we'd like 18% pre-money refresh. Open to 16% if leadership grants are pulled forward.\n  • Liquidation: 1x non-participating, standard.\n  • Board: 2 founder, 2 investor, 1 independent (mutually agreed).\n\nThe one I expect pushback on is the pool. Happy to walk through the math behind 18% — it's keyed to your stated hiring plan for the next 24 months plus a 1.5x buffer for senior leadership.\n\nLet me know if Wednesday 2pm PT still works.\n\n— Dani",
    receivedAt: iso(-1440),
    unread: false,
    labels: ['INBOX'],
    attachments: [
      { filename: 'Kestrel-TermSheet-v3.pdf', mimeType: 'application/pdf', size: 184_220, attachmentId: 'a1' },
      { filename: 'Cap-Table-Modeled.xlsx', mimeType: 'application/vnd.ms-excel', size: 42_110, attachmentId: 'a2' },
    ],
  },
  {
    id: 'm_acq_2',
    threadId: 't_acq',
    from: 'Mira Okafor',
    to: ['Dani Park <dani@kestrel.vc>'],
    cc: ['Sam Rhee <sam@kestrel.vc>'],
    subject: 'Re: Series B term sheet — final markup',
    snippet: 'Thanks Dani — reviewing tonight. Two items I want to flag now…',
    bodyText:
      "Thanks Dani — reviewing tonight. Two items I want to flag now so we don't lose them on the call:\n\n  1. The 18% pool feels rich against what we modeled internally (we had 14% with a 1.2x buffer). I can walk you through our hiring plan in detail; I think we close the gap to ~16%.\n  2. On the independent board seat — we'd like right of first nomination with mutual approval, not a joint search. Saves us 6+ weeks.\n\nWednesday 2pm works. I'll send a Meet invite.\n\nMira",
    receivedAt: iso(-360),
    unread: false,
    labels: ['SENT'],
    attachments: [],
  },
  {
    id: 'm_acq_3',
    threadId: 't_acq',
    from: 'Dani Park <dani@kestrel.vc>',
    to: ['mira.okafor@gmail.com'],
    cc: ['Sam Rhee <sam@kestrel.vc>'],
    subject: 'Re: Series B term sheet — final markup',
    snippet: 'Latest red-lines attached. We can hold the 18% pool but need movement on the liquidation pref…',
    bodyText:
      "Latest red-lines attached. We can hold the 18% pool but we need movement on the liquidation preference — 1x non-participating is firm on our side; participating with a 2x cap is a non-starter for the syndicate.\n\nOn the independent — right of first nomination with mutual approval works. Send names whenever.\n\nSpeak Wednesday.\n\n— D",
    receivedAt: iso(-22),
    unread: true,
    labels: ['INBOX'],
    attachments: [
      { filename: 'Kestrel-TermSheet-v4-redlined.pdf', mimeType: 'application/pdf', size: 198_440, attachmentId: 'a3' },
    ],
  },
  {
    id: 'm_lin_1',
    threadId: 't_lin',
    from: 'Theo Vance <theo@halcyon.io>',
    to: ['mira.okafor@gmail.com'],
    subject: 'Q3 roadmap commitments — eng allocation',
    snippet: 'Mira, here\'s where I net out on Q3 allocation…',
    bodyText:
      "Mira,\n\nHere's where I net out on Q3 allocation after talking to the team leads:\n\n  • Platform: 4 eng on pipelines, 1 on identity\n  • Product: 3 eng on the new editor surface, 2 on integrations\n  • Reliability: 1.5 FTE on on-call rotation reduction\n\nI pushed back on the data-platform scope. We can ship pipelines in Q3 but discovery (the federated query layer) is honestly a Q4 build — I'd rather slip it cleanly than half-ship.\n\nWant to walk through this Friday?\n\nTheo",
    receivedAt: iso(-94),
    unread: true,
    labels: ['INBOX'],
    attachments: [],
  },
  {
    id: 'm_lin_2',
    threadId: 't_lin',
    from: 'Mira Okafor',
    to: ['Theo Vance <theo@halcyon.io>'],
    subject: 'Re: Q3 roadmap commitments — eng allocation',
    snippet: 'Friday works. Can you bring the candidate Q4 milestones for federated query…',
    bodyText: "Friday works. Can you bring the candidate Q4 milestones for federated query so we have something concrete to point investors at? Even tentative dates are useful.\n\nM",
    receivedAt: iso(-60),
    unread: false,
    labels: ['SENT'],
    attachments: [],
  },
  {
    id: 'm_des_1',
    threadId: 't_des',
    from: 'Ana Liu <ana@northbeam.studio>',
    to: ['mira.okafor@gmail.com'],
    subject: 'Brand refresh — round 2 explorations',
    snippet: 'Four directions inside. Direction 2 leans into the editorial type voice we discussed.',
    bodyText:
      "Hi Mira,\n\nFour directions inside the Figma. Quick notes on each:\n\n  Direction 1 — Tightened version of where we landed last round. Lowest risk; least surprising.\n  Direction 2 — Editorial. Leans into the long-form type voice we kept coming back to. My favorite.\n  Direction 3 — More 'product-forward.' A wordmark that flexes into UI states.\n  Direction 4 — A reset. Different motion language, new color discipline. Worth seeing even if we don't ship it.\n\nNo decisions needed yet — these are for reactions. Want to do a 30-min react session Thursday?\n\nAna",
    receivedAt: iso(-180),
    unread: false,
    labels: ['INBOX'],
    attachments: [
      { filename: 'Brand-R2-Explorations.fig', mimeType: 'application/octet-stream', size: 8_412_000, attachmentId: 'a4' },
    ],
  },
  {
    id: 'm_hire_1',
    threadId: 't_hire',
    from: 'Jen Maro <jen@northbridge.partners>',
    to: ['mira.okafor@gmail.com'],
    cc: ['Priya Shankar <priya.shankar@hey.com>'],
    subject: 'Intro: Priya Shankar (Head of Eng candidate)',
    snippet: "Priya is winding down at Stripe and looking for a 0→1 platform role. Calendars cc'd.",
    bodyText:
      "Mira —\n\nIntroducing Priya Shankar, currently a Director at Stripe (issued products, then platform). Priya, Mira is the founder of Halcyon — they're at the stage where Head of Eng becomes the most consequential hire of the year.\n\nPriya has been winding down at Stripe and is looking for a 0→1 platform role at Series B scale. I told her you'd be one of the first calls.\n\nI'll let the two of you take it from here. Calendars cc'd.\n\nJen",
    receivedAt: iso(-340),
    unread: false,
    labels: ['INBOX'],
    attachments: [],
  },
  {
    id: 'm_fin_1',
    threadId: 't_fin',
    from: 'Eli Chen <eli@halcyon.io>',
    to: ['mira.okafor@gmail.com'],
    subject: 'April board pack — final numbers',
    snippet: 'ARR closed at $4.31M, +14% MoM. Burn at $612k. Runway 19 mo at current spend.',
    bodyText:
      "April close, pre-audit:\n\n  ARR:    $4.31M  (+14% MoM)\n  NRR:    118%   (TTM)\n  Burn:   $612k  (gross)\n  Runway: 19 mo  (at current spend)\n  Cash:   $11.6M\n\nNotable: support load down 22% after the self-serve onboarding ship. Headcount flat at 38.\n\nFull pack in the drive. I'll send a 1-pager for the board email tomorrow.\n\nEli",
    receivedAt: iso(-510),
    unread: false,
    labels: ['INBOX'],
    attachments: [
      { filename: 'April-Board-Pack-FINAL.pdf', mimeType: 'application/pdf', size: 2_104_000, attachmentId: 'a5' },
    ],
  },
  {
    id: 'm_cust_1',
    threadId: 't_cust',
    from: 'Customer Success',
    to: ['mira.okafor@gmail.com'],
    subject: 'Linear escalation — Adyen integration regression',
    snippet: 'Three enterprise tenants hit the 4xx on webhook replay. Backfill running, ETA 2h.',
    bodyText:
      "Heads up — three enterprise tenants hit the 4xx on webhook replay after the 09:42 deploy. Eng is rolling forward the fix (PR #4421); backfill is running, ETA 2h.\n\nNo external comms needed; we caught this before the customers did. Will update at 17:00 PT.",
    receivedAt: iso(-720),
    unread: true,
    labels: ['INBOX'],
    attachments: [],
  },
  {
    id: 'm_cust_2',
    threadId: 't_cust',
    from: 'Customer Success',
    to: ['mira.okafor@gmail.com'],
    subject: 'Update — Adyen regression cleared',
    snippet: 'Backfill complete. All three tenants verified green. Post-mortem Monday.',
    bodyText: 'Backfill complete. All three tenants verified green. Post-mortem on the calendar for Monday 10am.',
    receivedAt: iso(-620),
    unread: true,
    labels: ['INBOX'],
    attachments: [],
  },
  {
    id: 'm_pr_1',
    threadId: 't_pr',
    from: 'Rae Iwasaki <rae@axiom.pr>',
    to: ['mira.okafor@gmail.com'],
    subject: 'TechCrunch — quote review for Tuesday piece',
    snippet: 'Quote 2 reads a bit corporate. Want to make it more first-person?',
    bodyText:
      "Two quotes inline below — quote 2 reads a bit corporate and I think it's the one we should sharpen. Want to make it more first-person? Reporter wants final by EOD Monday.\n\n— Rae",
    receivedAt: iso(-1200),
    unread: false,
    labels: ['INBOX'],
    attachments: [],
  },
  {
    id: 'm_news_1',
    threadId: 't_news',
    from: 'The Brief <hello@thebrief.email>',
    to: ['mira.okafor@gmail.com'],
    subject: 'The Brief · The week founders stopped pretending',
    snippet: 'This week: pricing experiments that actually moved retention, one chart on Series A timing…',
    bodyHtml: `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#f6f5f1;font-family:Georgia,serif;color:#1f1d1a}.wrap{max-width:600px;margin:0 auto;background:#ffffff}.hdr{padding:32px 36px 16px;border-bottom:1px solid #ece9e1}.brand{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a8478}.brand b{color:#1f1d1a;letter-spacing:.06em;font-weight:700}.hero{padding:28px 36px 4px}.hero h1{margin:0 0 10px;font-size:30px;line-height:1.18;letter-spacing:-.01em;color:#0e0d0c;font-weight:400;font-family:'Iowan Old Style','Georgia',serif}.hero .by{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#8a8478}.heroimg{display:block;width:100%;height:220px;background:linear-gradient(135deg,#d97757 0%,#c25540 55%,#7a3424 100%);position:relative;overflow:hidden}.heroimg::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 40%,rgba(255,255,255,.18),transparent 55%),radial-gradient(circle at 75% 70%,rgba(0,0,0,.25),transparent 60%)}.body{padding:24px 36px 8px;font-size:15px;line-height:1.65}.body p{margin:0 0 14px;color:#2a2722}.kicker{display:inline-block;background:#fbf2e9;color:#8a4a1f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;padding:4px 9px;border-radius:3px;margin-bottom:10px}.story{padding:8px 36px 18px;border-top:1px solid #ece9e1}.story h2{font-size:19px;margin:18px 0 6px;color:#0e0d0c;font-weight:500}.story p{font-size:14.5px;line-height:1.62;color:#3a3631;margin:0 0 10px}.cta{display:block;text-align:center;background:#1f1d1a;color:#fff;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.04em;padding:13px 18px;margin:8px 36px 28px;border-radius:4px}.foot{padding:18px 36px 26px;border-top:1px solid #ece9e1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#8a8478;line-height:1.6}.foot a{color:#8a8478;text-decoration:underline}</style></head><body><div class="wrap"><div class="hdr"><div class="brand"><b>THE&nbsp;BRIEF</b> &nbsp;·&nbsp; Issue 142 &nbsp;·&nbsp; May 11, 2026</div></div><div class="hero"><h1>The week founders<br/>stopped pretending.</h1><div class="by">By Hana Reyes · 6 min read</div></div><div class="heroimg"></div><div class="body"><span class="kicker">Lead Story</span><p>Three companies this week walked back growth-at-all-costs theatre and admitted the obvious: they're optimizing for survival, not the deck. Two of them are doing it well.</p><p>The pattern is the same in each case — a pricing change announced with unusual candor, a small team rebuilt around it, and an end-of-quarter number that nobody had to spin. It's hard to overstate how rare that is right now.</p></div><div class="story"><h2>Pricing experiments that actually moved retention</h2><p>Of the eleven pricing changes shipped by Series B SaaS companies in the last 90 days that we tracked, four moved 90-day retention by more than 4 percentage points. All four shared one pattern.</p><p>It wasn't the magnitude of the change. It was who they told first.</p></div><a class="cta" href="#">Read this week's issue →</a><div class="foot">You're receiving this because you subscribed at thebrief.email. <a href="#">Unsubscribe</a> · <a href="#">Manage preferences</a> · <a href="#">Forward to a friend</a><br/><br/>The Brief · 1170 Folsom St, San Francisco CA 94103</div></div></body></html>`,
    bodyText: "THE BRIEF · Issue 142 · May 11, 2026\n\nThe week founders stopped pretending.\nBy Hana Reyes · 6 min read\n\nThree companies this week walked back growth-at-all-costs theatre and admitted the obvious: they're optimizing for survival, not the deck. Two of them are doing it well.\n\nThe pattern is the same in each case — a pricing change announced with unusual candor, a small team rebuilt around it, and an end-of-quarter number that nobody had to spin. It's hard to overstate how rare that is right now.\n\n— Pricing experiments that actually moved retention —\n\nOf the eleven pricing changes shipped by Series B SaaS companies in the last 90 days that we tracked, four moved 90-day retention by more than 4 percentage points. All four shared one pattern. It wasn't the magnitude of the change. It was who they told first.\n\nRead this week's issue: https://thebrief.email/142\n\nUnsubscribe: https://thebrief.email/u",
    receivedAt: iso(-240),
    unread: true,
    labels: ['INBOX', 'CATEGORY_PROMOTIONS'],
    attachments: [],
  },
  {
    id: 'm_receipt_1',
    threadId: 't_receipt',
    from: 'Linear Billing <billing@linear.app>',
    to: ['mira.okafor@gmail.com'],
    subject: 'Your Linear invoice — May 2026',
    snippet: 'Receipt for $384.00 paid to Linear. Plan: Business · 12 seats. Card ending 4421.',
    bodyHtml: `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111}.wrap{max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee}.hdr{padding:28px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f0f0f0}.logo{display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:600;color:#111}.logo .mark{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#5e6ad2,#3a3f9c);display:inline-block}.paid{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#0a7c3f;background:#e9f7ef;padding:5px 9px;border-radius:99px;font-weight:600}.amt{padding:28px 32px 6px}.amt .lbl{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}.amt .num{font-size:34px;font-weight:600;letter-spacing:-.01em;color:#111}.amt .sub{font-size:13px;color:#666;margin-top:4px}.tbl{margin:18px 32px 22px;border:1px solid #eee;border-radius:6px;overflow:hidden}.tbl table{width:100%;border-collapse:collapse;font-size:13px}.tbl th{background:#fafafa;color:#666;font-weight:500;text-align:left;padding:10px 14px;border-bottom:1px solid #eee;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em}.tbl td{padding:11px 14px;border-bottom:1px solid #f4f4f4;color:#222}.tbl tr:last-child td{border-bottom:0}.tbl td.r{text-align:right;font-variant-numeric:tabular-nums}.totals{margin:0 32px 24px;padding:14px 0;border-top:1px solid #eee}.totals .row{display:flex;justify-content:space-between;font-size:13px;color:#444;padding:4px 0}.totals .row.grand{font-weight:600;color:#111;font-size:15px;border-top:1px solid #eee;padding-top:10px;margin-top:6px}.meta{padding:18px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12.5px;color:#555;line-height:1.6}.meta b{color:#111}.foot{padding:18px 32px 24px;font-size:11.5px;color:#999;line-height:1.6;text-align:center;border-top:1px solid #f0f0f0}.foot a{color:#5e6ad2;text-decoration:none}</style></head><body><div class="wrap"><div class="hdr"><div class="logo"><span class="mark"></span>Linear</div><span class="paid">Paid</span></div><div class="amt"><div class="lbl">Amount</div><div class="num">$384.00</div><div class="sub">Invoice INV-2026-05-4421 · May 11, 2026</div></div><div class="tbl"><table><thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody><tr><td>Business plan — monthly</td><td class="r">12 seats</td><td class="r">$360.00</td></tr><tr><td>Integrations add-on (GitHub Enterprise)</td><td class="r">1</td><td class="r">$24.00</td></tr></tbody></table></div><div class="totals"><div class="row"><span>Subtotal</span><span>$384.00</span></div><div class="row"><span>Tax</span><span>$0.00</span></div><div class="row grand"><span>Total</span><span>$384.00</span></div></div><div class="meta"><b>Halcyon, Inc.</b> · billed to mira.okafor@gmail.com<br/>Visa ending 4421 · Charged May 11, 2026<br/>Next invoice: June 11, 2026</div><div class="foot"><a href="#">View invoice</a> · <a href="#">Download PDF</a> · <a href="#">Billing portal</a><br/><br/>Linear · 251 Rhode Island St, San Francisco CA 94103</div></div></body></html>`,
    bodyText: "Linear — invoice INV-2026-05-4421\n\nPaid · $384.00 · May 11, 2026\n\nBusiness plan — monthly · 12 seats · $360.00\nIntegrations add-on (GitHub Enterprise) · 1 · $24.00\n\nSubtotal: $384.00\nTax:      $0.00\nTotal:    $384.00\n\nBilled to mira.okafor@gmail.com\nVisa ending 4421 · Charged May 11, 2026\nNext invoice: June 11, 2026\n\nView invoice: https://linear.app/i/INV-2026-05-4421",
    receivedAt: iso(-2880),
    unread: false,
    labels: ['INBOX'],
    attachments: [],
  },
  {
    id: 'm_legal_1',
    threadId: 't_legal',
    from: 'Counsel <counsel@latham.com>',
    to: ['mira.okafor@gmail.com'],
    subject: 'DPA redlines — Kestrel portfolio standard',
    snippet: 'Two outstanding items: sub-processor notification window and audit scope.',
    bodyText: "Two outstanding items on the DPA:\n\n  1. Sub-processor notification window — they want 30 days; market is 15.\n  2. Audit scope — they want unrestricted; we typically scope to 'reasonable' with NDA.\n\nNothing alarming. Ready to send our markup whenever you greenlight.",
    receivedAt: iso(-1800),
    unread: false,
    labels: ['INBOX'],
    attachments: [],
  },
];

const REMINDERS = [
  {
    id: 'r_1',
    threadId: 't_hire',
    dueAt: iso(60 * 24),
    reason: 'Follow up with Priya — share team intro doc',
    completed: false,
    createdAt: iso(-300),
  },
  {
    id: 'r_2',
    threadId: 't_pr',
    dueAt: iso(60 * 6),
    reason: 'Send sharpened quote 2 to Rae before EOD',
    completed: false,
    createdAt: iso(-900),
  },
];

const SUBSCRIPTIONS = [
  {
    id: 'sub_1',
    provider: 'google',
    email: 'mira.okafor@gmail.com',
    externalId: 'projects/halcyon/topics/inbox-watch',
    resourceId: 'CKr…hwQ=',
    notificationUrl: 'https://api.email-copilot.dev/webhooks/gmail',
    status: 'active',
    expiresAt: iso(60 * 24 * 6),
    createdAt: iso(-60 * 24 * 2),
    updatedAt: iso(-30),
  },
];

const NAV_ITEMS = [
  { id: 'inbox',   label: 'Inbox',   key: 'g i' },
  { id: 'sent',    label: 'Sent',    key: 'g s' },
  { id: 'drafts',  label: 'Drafts',  key: 'g d' },
  { id: 'archive', label: 'Archive', key: 'g e' },
  { id: 'trash',   label: 'Trash',   key: 'g t' },
];

// Helpers (mirror the lib/types contracts) -------------------------------

function hasActiveReminder(threadId, reminders) {
  return reminders.some((r) => r.threadId === threadId && !r.completed);
}

function smartTimestamp(iso) {
  const d = new Date(iso);
  const diffMin = (NOW.getTime() - d.getTime()) / 60_000;
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${Math.round(diffMin)}m`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h`;
  if (diffMin < 60 * 24 * 7) return `${Math.round(diffMin / 60 / 24)}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fullTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function initialOf(label) {
  const m = label.match(/[A-Za-z]/);
  return (m ? m[0] : '?').toUpperCase();
}

function nameOf(participant) {
  // "Name <email>" -> "Name". "email" -> "email".
  const m = participant.match(/^(.*?)\s*<.+>$/);
  return m ? m[1].trim() : participant.split('@')[0];
}

function emailOf(participant) {
  const m = participant.match(/<([^>]+)>/);
  return m ? m[1] : participant;
}

// Deterministic avatar color from a string
function avatarHue(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

window.MOCK = {
  SESSION, THREADS, MESSAGES, REMINDERS, SUBSCRIPTIONS, NAV_ITEMS,
  hasActiveReminder, smartTimestamp, fullTimestamp, formatBytes,
  initialOf, nameOf, emailOf, avatarHue, NOW,
};
