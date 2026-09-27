"""Port of frontend/src/data/constants.ts.

Insertion order matters: the sim indexes Object.keys(BANKS) / Object.keys(CITIES)
positionally when spawning cases, so Python dicts must keep the same order.
"""

RAILN = {"wallet": "WALLET", "upi": "UPI-OUT", "crypto": "CRYPTO", "atm": "ATM"}

TIERM = {
    "T1": {"n": "EXACT ATM", "d": "Mule neighbour / shared device — ATM-level forecast issued."},
    "T2": {
        "n": "DISTRICT ZONE",
        "d": "KYC / branch / phone-circle signal — district ring. No ATM precision claimed.",
    },
    "T3": {"n": "RAIL MIX", "d": "Amount / time / channel constraints only — rail probabilities, no geography."},
    "T4": {"n": "WATCHLIST", "d": "Insufficient signal — no geographic claim made. Honest degradation."},
}

BANKS = {
    "SBI": "#7FB0F2",
    "HDFC": "#F08E93",
    "ICICI": "#7FD4A8",
    "AXIS": "#E4C37B",
    "PNB": "#B49CF0",
    "BOB": "#6FCFC4",
    "KOTAK": "#EE9CC0",
    "YES": "#96A2BC",
}

CITIES = {
    "Bengaluru": [12.97, 77.59],
    "New Delhi": [28.61, 77.21],
    "Mumbai": [19.08, 72.88],
    "Hyderabad": [17.38, 78.49],
    "Pune": [18.52, 73.86],
    "Jaipur": [26.91, 75.79],
    "Lucknow": [26.85, 80.95],
    "Kolkata": [22.57, 88.36],
    "Chennai": [13.06, 80.24],
    "Ahmedabad": [23.02, 72.57],
    "Indore": [22.72, 75.86],
    "Patna": [25.6, 85.14],
    "Kochi": [9.98, 76.29],
    "Chandigarh": [30.73, 76.78],
    "Nagpur": [21.15, 79.09],
    "Surat": [21.18, 72.83],
}

SCAMS = [
    ["Digital Arrest", 0.34],
    ["Investment / Trading", 0.27],
    ["Task-based (ROM)", 0.14],
    ["Fake Customer Care", 0.13],
    ["Loan App", 0.12],
]

STREETS = [
    "MG Road",
    "Station Rd",
    "City Centre",
    "Main Bazaar",
    "Ring Road",
    "Court Rd",
    "Market Chowk",
    "Central Ave",
]

# ATM ranker weights (score = Σ wᵢ·compsᵢ).
Wt = [0.31, 0.24, 0.18, 0.15, 0.12]
WtN = ["traffic", "mule-p", "prior", "distance", "fit"]

# Pipeline stages: [name, description, nominal T+ seconds].
PIPE = [
    ["NCRP WEBHOOK", "Complaint received on 1930 portal · webhook fires", 0],
    ["CASE CREATED", "Case object instantiated · hash anchored", 0.4],
    ["GRAPH BUILT", "Cross-institution token graph resolved", 4],
    ["FED SCORES", "Federated banks return calibrated P(mule)", 7],
    ["FORECAST", "ATM ranker · time-to-cashout · rail mix", 9],
    ["PRIORITY", "Freeze queue ranked by expected recoverable", 10],
    ["DISPATCH", "Alerts pushed to LEAs · banks · ATM ops", 11],
]

SPAWN_TIER_W = [["T1", 0.42], ["T2", 0.3], ["T3", 0.16], ["T4", 0.12]]

# Rail mix per tier: [atm, wallet, upi, crypto].
TIER_MIX = {
    "T1": [62, 22, 16, 0],
    "T2": [24, 42, 28, 6],
    "T3": [0, 68, 24, 8],
    "T4": [22, 30, 40, 8],
}

SPAWN_NOTES = {
    "T1": "Debit card active — ATM primary rail.",
    "T2": "District ring only — no ATM precision claimed at Tier 2.",
    "T3": "Young account — <b>chasing wallet rail, not ATM</b>.",
    "T4": "Watchlist — no geographic forecast issued.",
}

SPAWN_AMOUNTS = {
    "Digital Arrest": [400000, 2500000],
    "Investment / Trading": [200000, 1600000],
    "Task-based (ROM)": [40000, 220000],
    "Fake Customer Care": [20000, 120000],
    "Loan App": [15000, 80000],
}
