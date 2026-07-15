export type Status = 'At Risk' | 'Watch' | 'On Track' | 'Done' | 'New'

export interface Client {
  id: string
  name: string
  status: Status
  thisMonth: string
  whatINeed: string
  venuActions: VenuAction[]
  notes: string
  financials: Financials
}

export interface VenuAction {
  id: string
  text: string
  resolved: boolean
}

export interface Financials {
  hoursUtilised: number | null
  ratePerHour: number | null
  invoiced: number | null
  paid: number | null
}

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cipherwave',
    name: 'CipherWave',
    status: 'Watch',
    thisMonth:
      'BCC hours dispute resolved (99hrs billed after 5hr discount). Governance protocols embedded. R&P demo held. Production deliveries held pace despite dispute.',
    whatINeed: 'Sign-off on additional 5hr R&P discount',
    venuActions: [
      { id: 'cv-1', text: 'Sign-off on additional 5hr R&P discount', resolved: false },
    ],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'travel-it',
    name: 'Travel IT',
    status: 'At Risk',
    thisMonth:
      'Murali escalation contained (11 Jun). Sharmida alignment call held. Phased go-live proposed for July. BRS still unsigned; 3 APIs outstanding.',
    whatINeed: 'Approval on flagged Sharmida item',
    venuActions: [
      { id: 'ti-1', text: 'Approval on flagged Sharmida item', resolved: false },
      { id: 'ti-2', text: 'Confirm phased go-live timeline for July', resolved: false },
    ],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'tiger-brands',
    name: 'Tiger Brands',
    status: 'At Risk',
    thisMonth:
      'TCoE stalled — Mike declined biweekly (25 Jun). EDMS v2.0 delivered to Chris Lacy in under 24 hours after revival request.',
    whatINeed: 'None urgent',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'multichoice',
    name: 'MultiChoice',
    status: 'Watch',
    thisMonth:
      'MSA v4 signed and sent. Wiseman + Venu client meeting held 27 Jun. Prajwala salary issue raised end of month; being managed.',
    whatINeed: 'None urgent',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'bcx',
    name: 'BCX',
    status: 'Watch',
    thisMonth:
      'Sudhakar Data/AI Architect proposal (v1.0 → v2.0 with signature page) delivered within 48 hours of BCX request. FY27 renewal still on hold.',
    whatINeed: 'Venkata renewal decision',
    venuActions: [
      { id: 'bcx-1', text: 'Venkata renewal decision — follow up', resolved: false },
    ],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'zoom-fibre',
    name: 'Zoom Fibre',
    status: 'At Risk',
    thisMonth:
      'Technical work complete (Plan IDs, Credit Note, churn fix). CR-003 sign-off carried 3 weeks blocking production deployment. New payment term accepted by Bilaal.',
    whatINeed: 'CR + commercials sign-off URGENT',
    venuActions: [
      { id: 'zf-1', text: 'CR-003 sign-off — URGENT, blocking production', resolved: false },
      { id: 'zf-2', text: 'Confirm commercials sign-off with Bilaal', resolved: false },
    ],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'burgess',
    name: 'Burgess',
    status: 'Watch',
    thisMonth:
      'Workshops 4 + 5 attended. Effort estimation sent to Michelle. BRS discussion held end of month (signed 1 Jul).',
    whatINeed: 'None urgent',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'atisa',
    name: 'ATISA',
    status: 'On Track',
    thisMonth: 'Standard monthly DAC process. No exceptions.',
    whatINeed: 'None',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'vmch',
    name: 'VMCH / Varsha',
    status: 'Watch',
    thisMonth: 'Quiet month. Wama still resolving website access + branded email 550 error.',
    whatINeed: 'None urgent',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'irdeto',
    name: 'Irdeto',
    status: 'On Track',
    thisMonth: 'Ongoing SF support. Om / Detleena scoping call still to arrange.',
    whatINeed: 'Confirm Om\'s scoping authority',
    venuActions: [
      { id: 'ir-1', text: "Confirm Om's scoping authority", resolved: false },
    ],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'postbank',
    name: 'Postbank RFP',
    status: 'Done',
    thisMonth:
      'DocuSign signed 23 Jun after week\'s delay; submitted to Vusi. Awaiting Postbank outcome.',
    whatINeed: 'None',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'jpc-mtc',
    name: 'JPC / MTC RFQ',
    status: 'New',
    thisMonth:
      'New RFQ received 15 Jun. Two solutions scoped. Proposal submitted to Destiny Global 17 Jun (deadline met). R453,600 Solution A value.',
    whatINeed: 'None',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
  {
    id: 'prajwala',
    name: 'Prajwala / Internal HR',
    status: 'New',
    thisMonth:
      'Salary issue flagged 29 Jun (15% bonus unpaid by India HR/finance). Managed through Tavish + Venu.',
    whatINeed: 'None urgent (resolved 3 Jul)',
    venuActions: [],
    notes: '',
    financials: { hoursUtilised: null, ratePerHour: null, invoiced: null, paid: null },
  },
]

export const WINS_THIS_MONTH = [
  'Postbank RFP closed after signature delay — Venu signed 23 Jun, submitted same day.',
  'CipherWave governance reset (10 Jun) landed and held all month.',
  'TB EDMS v2.0 turned around in under 24 hours when Chris Lacy revived it.',
  'Sudhakar proposal escalated from v1.0 to v2.0 with signature page in 48 hours.',
  'JPC / MTC RFQ scoped and submitted to Destiny Global by 17 Jun deadline.',
]

export const STATUS_ORDER: Status[] = ['At Risk', 'Watch', 'On Track', 'Done', 'New']

export const STATUS_COLORS: Record<Status, { bg: string; text: string; border: string; dot: string }> = {
  'At Risk':  { bg: 'bg-rose-950/60',   text: 'text-rose-300',   border: 'border-rose-800/50',   dot: 'bg-rose-400' },
  'Watch':    { bg: 'bg-amber-950/50',  text: 'text-amber-300',  border: 'border-amber-800/40',  dot: 'bg-amber-400' },
  'On Track': { bg: 'bg-teal-950/50',   text: 'text-teal-300',   border: 'border-teal-800/40',   dot: 'bg-teal-400' },
  'Done':     { bg: 'bg-slate-800/40',  text: 'text-slate-400',  border: 'border-slate-700/40',  dot: 'bg-slate-500' },
  'New':      { bg: 'bg-violet-950/50', text: 'text-violet-300', border: 'border-violet-800/40', dot: 'bg-violet-400' },
}
