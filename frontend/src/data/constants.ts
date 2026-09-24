import type { RailKey, Tier } from '../types';

export const BANKS: Record<string, string> = {
  SBI: '#7FB0F2',
  HDFC: '#F08E93',
  ICICI: '#7FD4A8',
  AXIS: '#E4C37B',
  PNB: '#B49CF0',
  BOB: '#6FCFC4',
  KOTAK: '#EE9CC0',
  YES: '#96A2BC',
};

export const TIERM: Record<Tier, { n: string; d: string }> = {
  T1: { n: 'EXACT ATM', d: 'Mule neighbour / shared device — ATM-level forecast issued.' },
  T2: {
    n: 'DISTRICT ZONE',
    d: 'KYC / branch / phone-circle signal — district ring. No ATM precision claimed.',
  },
  T3: { n: 'RAIL MIX', d: 'Amount / time / channel constraints only — rail probabilities, no geography.' },
  T4: { n: 'WATCHLIST', d: 'Insufficient signal — no geographic claim made. Honest degradation.' },
};

export const tierColor = (t: Tier): string =>
  ({ T1: '#F87171', T2: '#FB923C', T3: '#FBBF24', T4: '#818DA8' })[t];

export const pColor = (p: number) => (p >= 0.85 ? '#F87171' : p >= 0.7 ? '#FB923C' : p >= 0.5 ? '#FBBF24' : '#818DA8');

export const RAILC: Record<RailKey, string> = {
  wallet: '#FBBF24',
  upi: '#38BDF8',
  crypto: '#E879C9',
  atm: '#F87171',
};
export const RAILN: Record<RailKey, string> = {
  wallet: 'WALLET',
  upi: 'UPI-OUT',
  crypto: 'CRYPTO',
  atm: 'ATM',
};

export const Wt = [0.31, 0.24, 0.18, 0.15, 0.12];
export const WtN = ['traffic', 'mule-p', 'prior', 'distance', 'fit'];

/** Pipeline stages: [name, description, nominal T+ seconds]. */
export const PIPE: [string, string, number][] = [
  ['NCRP WEBHOOK', 'Complaint received on 1930 portal · webhook fires', 0],
  ['CASE CREATED', 'Case object instantiated · hash anchored', 0.4],
  ['GRAPH BUILT', 'Cross-institution token graph resolved', 4],
  ['FED SCORES', 'Federated banks return calibrated P(mule)', 7],
  ['FORECAST', 'ATM ranker · time-to-cashout · rail mix', 9],
  ['PRIORITY', 'Freeze queue ranked by expected recoverable', 10],
  ['DISPATCH', 'Alerts pushed to LEAs · banks · ATM ops', 11],
];

export const CITIES: Record<string, [number, number]> = {
  Bengaluru: [12.97, 77.59],
  'New Delhi': [28.61, 77.21],
  Mumbai: [19.08, 72.88],
  Hyderabad: [17.38, 78.49],
  Pune: [18.52, 73.86],
  Jaipur: [26.91, 75.79],
  Lucknow: [26.85, 80.95],
  Kolkata: [22.57, 88.36],
  Chennai: [13.06, 80.24],
  Ahmedabad: [23.02, 72.57],
  Indore: [22.72, 75.86],
  Patna: [25.6, 85.14],
  Kochi: [9.98, 76.29],
  Chandigarh: [30.73, 76.78],
  Nagpur: [21.15, 79.09],
  Surat: [21.18, 72.83],
};

export const SCAMS: [string, number][] = [
  ['Digital Arrest', 0.34],
  ['Investment / Trading', 0.27],
  ['Task-based (ROM)', 0.14],
  ['Fake Customer Care', 0.13],
  ['Loan App', 0.12],
];

export const STREETS = [
  'MG Road',
  'Station Rd',
  'City Centre',
  'Main Bazaar',
  'Ring Road',
  'Court Rd',
  'Market Chowk',
  'Central Ave',
];

export const FEEDIC: Record<string, string> = {
  complaint: 'inbox',
  forecast: 'target',
  freeze: 'lock',
  alert: 'bell',
  window: 'clock',
  ledger: 'hash',
  system: 'live',
};

export const PAGES_ORDER = ['overview', 'complaint', 'analysis', 'mules', 'cashout', 'freeze', 'alerts', 'drift'] as const;

export const PAGE_META: Record<
  string,
  { num: string; title: string; crumb: string; icon: string }
> = {
  overview: { num: '01', title: 'Overview', crumb: 'I4C CENTRAL', icon: 'gauge' },
  complaint: { num: '02', title: 'Complaints', crumb: 'NCRP PIPELINE', icon: 'inbox' },
  analysis: { num: '03', title: 'Graph Analysis', crumb: 'TOKEN GRAPH', icon: 'graph' },
  mules: { num: '04', title: 'Mules', crumb: 'FEDERATED SCORES', icon: 'mule' },
  cashout: { num: '05', title: 'Cashout Forecast', crumb: 'INTERDICTION', icon: 'target' },
  freeze: { num: '06', title: 'Freeze Priority', crumb: 'CFCFRMS', icon: 'lock' },
  alerts: { num: '07', title: 'Alert Dispatch', crumb: 'MULTI-CHANNEL', icon: 'bell' },
  drift: { num: '08', title: 'Model Assurance', crumb: 'GOVERNANCE', icon: 'pulse' },
};
