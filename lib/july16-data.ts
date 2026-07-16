// Linkfields Innovations — Week ending 16 July 2026
// Source: Linkfields_Client_Tracker_16_July_2026 + Zapia update sheet

export type Health = 'At Risk' | 'Watch' | 'On Track' | 'Done' | 'New'

export interface Client {
  id: number
  name: string
  engagement: string
  health: Health
  contacts: string
  update: string
  nextActions: string[]
  owner: string
  venuActions: string[]  // items that need Venu specifically
  urgency: 'critical' | 'high' | 'normal' | 'none'
}

export interface Proposal {
  client: string
  opportunity: string
  value: string
  stage: string
  nextAction: string
  owner: string
}

export interface VenuItem {
  priority: 'critical' | 'high' | 'cancelled'
  client: string
  item: string
}

export const META = {
  week: 'Week ending Thursday 16 July 2026',
  owner: 'Reveshnee Gajadhar',
  division: 'Strategic Accounts',
  stats: {
    active: 13,
    onTrack: 2,
    watch: 3,
    atRisk: 2,
    done: 4,
    new: 2,
  },
}

export const TOP_FOCUS: string[] = [
  'CipherWave: Srinivas is busy drafting the v19 proposal — may only be done early next week. I sent him the docs on Teams today. Had a good call with Emilie at 12:30, weekly check-in at 2pm. Her asks before we go ahead with v19 (pricelist tracking, SMTP relay, BCC) still need to happen first. Maintenance is a new scope item that must go into the proposal. July hours — 74 confirmed, only 35.5 used so far. Need estimates for what\'s left.',
  'Travel IT: Phase 1 - waiting for feedback from Venu. Still 3 APIs outstanding (Cancel, Payment Redirect, Itinerary Retrieval). Phase 2 scope hasn\'t been defined yet — we need to get discovery workshops in the diary. Redeployment decision still sitting with management. BRS still not signed.',
  'Tiger Brands: Still waiting on Venu to reply to Mike about keeping Stefan on the team.',
  'Burgess: Rohith asked Hartaj to extend the quotation expiry but no response yet. MSA is still being worked on.',
  'Zoom Fibre: Quotation sent to Moeen on 3 Jul. He replied on 16 Jul — waiting for feedback.',
  'VMCH: Wama is busy with the website at the moment.',
  'Agrément SA: RFQ is in — waiting to hear back.',
  'MultiChoice: April/May POs are still stuck. Sipokazi needs them before she can issue Thami\'s contract.',
]

export const CLIENTS: Client[] = [
  {
    id: 1,
    name: 'Travel IT',
    engagement: 'Multi-Domain Travel Packaging Front-End',
    health: 'At Risk',
    contacts: 'Murali / Sharmidha / Philip Katz',
    update:
      'BRS still unsigned — scope creep risk persists. Phase 1 go-live postponed from 15 Jul to week of 22 Jul: 3 APIs still outstanding (Cancel, Payment Redirect, Itinerary Retrieval). Internal meeting held 15 Jul (Venu, Sharmidha, Reveshnee). Phase 2 scope currently undefined, discovery workshops required.',
    nextActions: [
      'Murali to confirm Phase 1 closure + share Phase 2 decisions next week',
      'Dev team to estimate remaining Phase 1 items for Phase 2 carryover',
    ],
    venuActions: [
      'Decision on resource redeployment for idle team members',
      'Phase 2 scope / discovery workshop planning',
    ],
    owner: 'Reveshnee / Venu',
    urgency: 'critical',
  },
  {
    id: 2,
    name: 'BCX / PRASA',
    engagement: 'Cloud Engineering Proposal + PRASA RFQ',
    health: 'Done',
    contacts: 'Ranjith Naidu / Praveen Ponnam',
    update:
      'PRASA RFQ — not proceeding. Had a call with Zweli to confirm. Cloud Engineering proposal still with Ranjith.',
    nextActions: ['No further action on PRASA RFQ'],
    venuActions: [],
    owner: 'Reveshnee',
    urgency: 'none',
  },
  {
    id: 3,
    name: 'Tiger Brands',
    engagement: 'TCoE + UiPath RPA POC + EDMS',
    health: 'At Risk',
    contacts: 'Mike (Architecture) / Chris Lacy / Eugene',
    update:
      'TCoE paused client-side since late June — Mike said he\'ll reach out when ready. EDMS v2.0 sent to Chris Lacy 24 Jun, no response since. Mike asked to retain Stefan on the team; forwarded to Venu on 9 Jul, still awaiting Venu\'s reply back to Mike.',
    nextActions: [
      'Monitor Chris Lacy for EDMS v2.0 response',
      'Eugene session (offered free testing to rebuild momentum) — confirm outcome',
    ],
    venuActions: ['Reply to Mike directly re retaining Stefan — outstanding since 9 Jul'],
    owner: 'Reveshnee / Venu',
    urgency: 'critical',
  },
  {
    id: 4,
    name: 'CipherWave',
    engagement: 'Phase 1 Support + Odoo v19 Upgrade',
    health: 'Watch',
    contacts: 'Emilie Al-Halaseh / Casper',
    update:
      'June hours closed clean: 104hrs, 99 billed after 5hr discount (Venu-approved). Now mid-scope on Odoo v19 upgrade — Emilie met with team, defined 6 requirements, ERD confirmed top priority. Srinivas K drafting formal proposal, due Fri 17 Jul. R&P workshops (2–3 sessions) still awaiting Venu sign-off before scheduling with Emilie.',
    nextActions: [
      'Chase Srinivas K for July support hour estimates (69hr budget, 12 used)',
      'Coordinate team for 5 CW deliverables (ERD, handover docs, env docs, backend code, estimates)',
      'Chase Emilie for overdue Phase 1.5 scope',
    ],
    venuActions: ['Sign-off on R&P workshop scheduling — outstanding'],
    owner: 'Reveshnee / Venu',
    urgency: 'high',
  },
  {
    id: 5,
    name: 'MultiChoice',
    engagement: 'Staff Aug + SEO + Training',
    health: 'Watch',
    contacts: 'Thami / Tavish / Sipokazi',
    update:
      "Prajwala salary issue resolved via Venu. Thami's role clarity sorted (5 Jul); Thami and Tavish both in Sudhakar's GFO training group. Thami's contract remains parked pending Sipokazi's confirmation of April/May POs.",
    nextActions: ['Contracting parked — awaiting Sipokazi PO confirmation', 'Monitor GFO training progress'],
    venuActions: ['April/May POs confirmation so Sipokazi can issue Thami\'s contract'],
    owner: 'Reveshnee',
    urgency: 'high',
  },
  {
    id: 6,
    name: 'Burgess',
    engagement: 'Odoo Implementation',
    health: 'Watch',
    contacts: 'Prince / Michelle Badenhorst',
    update:
      'BRS signed off by Prince (1 Jul) — major milestone. Awaiting client direction on next phase. Chasing Hartaj re quotation expiry extension; checking MSA status with Michelle.',
    nextActions: [
      'Follow up Hartaj re quotation extension',
      'Confirm MSA status with Michelle',
      'Await client direction on next phase',
    ],
    venuActions: ['Clarification on Hartaj escalation — direct outreach to Odoo leadership?'],
    owner: 'Reveshnee',
    urgency: 'normal',
  },
  {
    id: 7,
    name: 'Zoom Fibre',
    engagement: 'FlexISP Implementation (CR-003)',
    health: 'Done',
    contacts: 'Bilaal / Moeen / Pooja',
    update:
      'Fully resolved. CR sheet and commercials finalised, Venu sign-off completed 5 Jul. Quotation sent to Moeen 3 Jul. Moeen replied on 16 Jul — he is waiting for feedback.',
    nextActions: ['Monitor Moeen response'],
    venuActions: [],
    owner: 'Reveshnee',
    urgency: 'none',
  },
  {
    id: 8,
    name: 'Agrément SA',
    engagement: 'Digitalisation RFQ (36-month)',
    health: 'Done',
    contacts: 'Prince (internal) / Agrément SA procurement',
    update: 'RFQ finalised with Prince, APA documents signed off, submitted 15 Jul at 12:06pm — ahead of deadline. Closed out cleanly.',
    nextActions: ['Await outcome'],
    venuActions: [],
    owner: 'Reveshnee / Prince',
    urgency: 'none',
  },
  {
    id: 9,
    name: 'Postbank RFP',
    engagement: 'RFP No. 03/08/25-26 ICT Panel',
    health: 'Done',
    contacts: 'Vusi Maditsi',
    update: 'DocuSign signed by Venu, submitted to Vusi 23 Jun. Awaiting Postbank outcome.',
    nextActions: ['Await outcome'],
    venuActions: [],
    owner: 'Reveshnee / Venu',
    urgency: 'none',
  },
  {
    id: 10,
    name: 'VMCH / Varsha',
    engagement: 'Website + Scorecard Phase 1',
    health: 'On Track',
    contacts: 'Varsha / Wama',
    update: 'Successful demo delivered. Recurring Friday 11am cadence established with Wama\'s team — this week\'s session moved to Fri 17 Jul.',
    nextActions: ['Standing Friday cadence — track weekly'],
    venuActions: [],
    owner: 'Reveshnee',
    urgency: 'none',
  },
  {
    id: 11,
    name: 'ATISA',
    engagement: 'Ongoing Engagement',
    health: 'On Track',
    contacts: 'ATISA',
    update: 'Standard monthly process continues. No exceptions raised.',
    nextActions: ['Follow up with Michelle on meeting regarding Brian and contract'],
    venuActions: [],
    owner: 'Reveshnee',
    urgency: 'none',
  },

  {
    id: 13,
    name: 'JPC / Destiny Global',
    engagement: 'Digital Property Asset Register RFQ',
    health: 'New',
    contacts: 'Margaret (Destiny Global)',
    update: 'Submitted 17 Jun. No word since — has gone quiet for close to a month. Worth a direct nudge.',
    nextActions: ['Chase Destiny Global directly for status'],
    venuActions: [],
    owner: 'Reveshnee',
    urgency: 'normal',
  },
  {
    id: 14,
    name: 'Isinkwa Bakery',
    engagement: 'Odoo Proposal (ad-hoc)',
    health: 'New',
    contacts: 'Isinkwa Bakery',
    update: 'Proposal sent by Thulane 2 Jul. Awaiting client feedback.',
    nextActions: ['Await client response'],
    venuActions: [],
    owner: 'Thulane / Reveshnee',
    urgency: 'none',
  },
]

export const PROPOSALS: Proposal[] = [
  { client: 'CipherWave', opportunity: 'Odoo v19 Upgrade', value: '~1 month effort (TBC)', stage: 'Drafting Proposal', nextAction: 'Srinivas K drafting formal proposal, due Fri 17 Jul.', owner: 'Reveshnee / Srinivas K' },
  { client: 'CipherWave', opportunity: 'Phase 1.5 Implementation', value: 'R828,857', stage: 'On Hold', nextAction: 'Scope still overdue from Emilie since end June.', owner: 'Reveshnee' },
  { client: 'BCX', opportunity: 'Nedbank Cloud Engineering', value: 'TBC', stage: 'Proposal Shared', nextAction: 'Two revisions sent to Ranjith 9 Jul.', owner: 'Reveshnee / Michelle' },
  { client: 'BCX / PRASA', opportunity: 'PRASA RFQ (subcontractor)', value: 'TBC', stage: 'Not Proceeding', nextAction: 'Confirmed not proceeding after call with Zweli.', owner: 'Reveshnee' },
  { client: 'Tiger Brands', opportunity: 'EDMS v2.0 (Albany Doc Approval)', value: 'Pricing pending', stage: 'Proposal Shared', nextAction: 'Sent to Chris Lacy 24 Jun, no response since.', owner: 'Reveshnee / Rushana' },
  { client: 'Tiger Brands', opportunity: 'TCoE + UiPath RPA', value: 'TBC', stage: 'On Hold', nextAction: 'Paused client-side.', owner: 'Reveshnee / Venu' },
  { client: 'Agrément SA', opportunity: 'Digitalisation RFQ (36-month)', value: 'TBC', stage: 'Submitted', nextAction: 'Submitted 15 Jul ahead of deadline.', owner: 'Reveshnee / Prince' },
  { client: 'JPC / Destiny Global', opportunity: 'Digital Property Asset Register', value: 'R453,600', stage: 'Submitted', nextAction: 'Gone quiet since 17 Jun — needs a direct nudge.', owner: 'Reveshnee' },
  { client: 'Isinkwa Bakery', opportunity: 'Odoo Proposal', value: 'TBC', stage: 'Proposal Shared', nextAction: 'Sent 2 Jul, awaiting feedback.', owner: 'Thulane' },
  { client: 'Postbank', opportunity: 'RFP No. 03/08/25-26 ICT Panel', value: 'TBC', stage: 'Submitted', nextAction: 'Awaiting Postbank outcome since 23 Jun.', owner: 'Reveshnee / Venu' },
]

export const VENU_ITEMS: VenuItem[] = [
  { priority: 'critical', client: 'Tiger Brands', item: 'Please reply to Mike about Stefan — this has been sitting since 9 Jul' },
  { priority: 'critical', client: 'Travel IT', item: 'We need a call on the redeployment decision. Vishnu flagged the idle team risk and it was already due on Wed.' },
  { priority: 'cancelled', client: 'BCX / PRASA', item: 'Need to update you on my call with Zweli — not proceeding' },
  { priority: 'high', client: 'MultiChoice', item: 'Can you confirm the April/May POs? Sipokazi is waiting on these before she can sort out Thami\'s contract' },
  { priority: 'high', client: 'MultiChoice', item: 'Need to respond to Prajwala on salary' },
  { priority: 'high', client: 'Odoo / Burgess', item: 'Hartaj is not responding on three things. Would you be able to reach out to someone at Odoo directly?' },
]
