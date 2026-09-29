"""Server-side FIR-style investigation report — port of src/report/reportHtml.ts.

Produces the same seven-section HTML bundle as the console (case summary,
tokenized hop ledger, calibrated mule scores, tier-aware forecast, actions,
evidence bundle, certification) so GET /api/cases/{id}/report matches what the
UI renders — including hash anchors derived from the same rng port.
"""

from __future__ import annotations

from ..constants import PIPE, RAILN, TIERM
from ..domain.graph import build_graph
from ..domain.selectors import at_risk, mule_bal, short_target
from ..fmt import en_in, hms, inr, inrc, ist_date, ist_hm, ist_time, p2
from ..rng import hex_n
from ..state import State

REPORT_CSS = """
.rp{background:#fff;color:#18202E;font:12px/1.6 "IBM Plex Sans",-apple-system,"Segoe UI",Arial,sans-serif;padding:44px 50px}
.rp *{box-sizing:border-box}
.rp-top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #18202E;padding-bottom:14px;margin-bottom:16px}
.rp-h1{font-size:20px;font-weight:700;letter-spacing:.02em;margin:0}
.rp-h2{font-size:12px;font-weight:700;letter-spacing:.14em;color:#5A6578;margin:22px 0 8px;text-transform:uppercase;border-bottom:1px solid #D8DDE6;padding-bottom:4px;page-break-after:avoid}
.rp-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 18px;margin:12px 0;page-break-inside:avoid}
.rp-meta>div{border-left:2px solid #E3E7EE;padding-left:9px;min-width:0}
.rp-meta .k{font-size:7.5px;font-weight:700;letter-spacing:.12em;color:#78829A;text-transform:uppercase}
.rp-meta .v{font-family:"IBM Plex Mono",monospace;font-size:10.5px;margin-top:2px;word-break:break-word}
.rp-t{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
.rp-t th{text-align:left;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:#5A6578;border-bottom:1.5px solid #18202E;padding:5px 7px}
.rp-t td{border-bottom:1px solid #E3E7EE;padding:5.5px 7px;vertical-align:top;font-family:"IBM Plex Mono",monospace;font-size:9.5px}
.rp-p{margin:8px 0;color:#2A3346}
.rp-callout{border:1px solid #D8DDE6;border-left:3px solid #18202E;background:#F7F9FC;padding:10px 13px;margin:10px 0;font-size:11px;page-break-inside:avoid}
.rp-hash{font-family:"IBM Plex Mono",monospace;font-size:9px;color:#5A6578;line-height:1.7}
.rp-cert{margin-top:22px;border-top:2px solid #18202E;padding-top:12px;font-size:9.5px;color:#404B60;line-height:1.7;page-break-inside:avoid}
.rp-tag{display:inline-block;font:700 8px "IBM Plex Mono",monospace;letter-spacing:.12em;padding:3px 8px;border:1px solid #18202E;margin:0 0 0 8px;vertical-align:2px}
@media print{.rp{padding:0}}"""

_RP_TIER_C = {"T1": "#B3261E", "T2": "#A05A00", "T3": "#806600", "T4": "#556070"}


def _rp_tier(t: str) -> str:
    return f'<b style="color:{_RP_TIER_C[t]}">{t} · {TIERM[t]["n"]}</b>'


def _rp_sec(n: str, t: str, inner: str) -> str:
    return f'<h2 class="rp-h2">{n} · {t}</h2>' + inner


def _rp_meta(pairs: list[tuple[str, str]]) -> str:
    cells = "".join(f'<div><div class="k">{k}</div><div class="v">{v}</div></div>' for k, v in pairs)
    return '<div class="rp-meta">' + cells + "</div>"


def _rp_tbl(head: list[str], rows: list[list[str | None]]) -> str:
    thead = "<thead><tr>" + "".join(f"<th>{h}</th>" for h in head) + "</tr></thead><tbody>"
    if rows:
        body = "".join("<tr>" + "".join(f"<td>{'—' if x is None else x}</td>" for x in r) + "</tr>" for r in rows)
    else:
        body = f'<tr><td colspan="{len(head)}" style="color:#78829A">—</td></tr>'
    return '<table class="rp-t">' + thead + body + "</tbody></table>"


def _f2(v: float) -> str:
    return f"{v:.2f}"


def _f1(v: float) -> str:
    return f"{v:.1f}"


def report_body(state: State, c: dict) -> str:
    """FIR-style investigation report for a case, rendered to an HTML string."""
    gen = state.now()
    rep = state.reports.get(c["id"])
    g = build_graph(c)
    edges = sorted(g["e"], key=lambda e: e["seq"])
    frozen = [m for m in c["mules"] if m["frozen"]]
    frozen_amt = sum(m["frozenAmt"] for m in frozen)
    alerts = [
        a
        for a in state.alerts
        if c["short"] in a["msg"] or any(m["tok"] in a["msg"] for m in c["mules"]) or any(x["id"] in a["msg"] for x in c["atms"])
    ]
    rep_hash = "0x" + hex_n(c["id"] + "|rep|" + str(rep["at"] if rep else gen), 20)
    win = c["tier"] != "T4"
    now = state.now()

    out = ""
    out += (
        '<div class="rp-top"><div><h1 class="rp-h1">OVI · INVESTIGATION REPORT</h1>'
        f'<div class="rp-hash" style="margin-top:5px">{c["id"]} · generated {ist_date(gen)} {ist_time(gen)} IST</div></div>'
        '<div style="text-align:right"><span class="rp-tag">CONFIDENTIAL</span><br>'
        '<span class="rp-tag" style="margin:5px 0 0">SYNTHETIC DEMO DATA</span></div></div>'
    )

    out += _rp_meta(
        [
            ("CASE ID", c["id"]),
            ("FILED · NCRP", ist_time(c["filedAt"]) + " IST"),
            ("SCAM PATTERN", c["scam"]),
            ("AMOUNT", inrc(c["amount"])),
            ("VICTIM · MASKED", c["victim"]),
            ("VICTIM BANK · CITY", c["vBank"] + " · " + c["city"]),
            ("MULES FLAGGED", str(len(c["mules"])) + " · federated"),
            ("FORECAST TIER", _rp_tier(c["tier"])),
        ]
    )

    target = (
        "ATM " + c["atms"][0]["id"] + " — exact-ATM Tier-1 forecast"
        if c["tier"] == "T1"
        else short_target(c)
    )
    out += _rp_sec(
        "1",
        "CASE SUMMARY",
        f'<div class="rp-p">{c["narr"]}</div>'
        + '<div class="rp-callout"><b>Live position at generation:</b> at risk '
        + inrc(at_risk(c, now))
        + " · frozen "
        + inrc(frozen_amt)
        + f" ({len(frozen)} of {len(c['mules'])} mule accounts) · forecast target: {target}</div>",
    )

    edge_rows = []
    for i, ed in enumerate(edges):
        a, b = g["n"][ed["a"]], g["n"][ed["b"]]
        edge_rows.append(
            [
                p2(i + 1),
                a.get("tok") or "VICTIM",
                b.get("tok") or b.get("label") or "",
                a["bank"] + " → " + b["bank"],
                inr(ed["amount"]),
                "+" + str(30 + (ed["seq"] * 37) % 160) + "s",
                "0x" + hex_n(c["id"] + "e" + str(ed["seq"]), 10),
            ]
        )
    out += _rp_sec(
        "2",
        "MONEY TRAIL · TOKENIZED HOP LEDGER",
        _rp_tbl(["#", "FROM", "TO", "BANKS", "AMOUNT", "ΔT", "EVIDENCE ANCHOR"], edge_rows)
        + f'<div class="rp-hash">As-of complaint timestamp · no future leakage · raw PII bank-local · DPDP §7(7) basis · {len(c["mules"])} federated score nodes · ε-DP 0.81/round</div>',
    )

    mule_rows = []
    for m in c["mules"]:
        if m["frozen"]:
            bal = inr(m["frozenAmt"]) + " (frozen)"
            status = "FROZEN · confirmed"
        elif m["status"] == "sent":
            bal = inr(mule_bal(c, m, now))
            status = "REQUEST SENT · SLA running"
        else:
            bal = inr(mule_bal(c, m, now))
            status = "scored · queued"
        shap_top = " · ".join(r["l"] + " " + ("+" if r["v"] > 0 else "") + _f2(r["v"]) for r in m["shap"][:3])
        mule_rows.append([m["tok"], m["bank"], _f2(m["p"]), bal, status, shap_top])
    lead_p = _f2(c["mules"][0]["p"]) if c["mules"] else "—"
    out += _rp_sec(
        "3",
        "FLAGGED MULE ACCOUNTS · CALIBRATED SCORES",
        _rp_tbl(["TOKEN", "BANK", "P(MULE)", "BALANCE / FROZEN", "STATUS", "TOP SHAP DRIVERS"], mule_rows)
        + f'<div class="rp-hash">P(mule) is isotonic-calibrated (held-out 60k · ECE 1.9%): a stated “{lead_p}” is empirically correct that share of the time. Positive drivers above push toward mule.</div>',
    )

    f4 = ""
    if win:
        f4 += (
            '<div class="rp-callout"><b>Window (80% CI):</b> opens '
            + ist_hm(c["depositAt"] + c["p10"] * 1000)
            + " IST · median "
            + ist_hm(c["depositAt"] + c["p50"] * 1000)
            + " IST · closes "
            + ist_hm(c["depositAt"] + c["p90"] * 1000)
            + " IST · P10–P90 = "
            + p2(int(c["p10"] // 60))
            + "–"
            + p2(int(c["p90"] // 60))
            + " min from deposit</div>"
        )
    if c["tier"] == "T1":
        f4 += _rp_tbl(
            ["RANK", "ATM ID", "LOCATION", "BANK", "SCORE Σwᵢ·x"],
            [["#" + str(i + 1), a["id"], a["loc"] + " · " + c["city"], a["bank"], _f2(a["score"])] for i, a in enumerate(c["atms"])],
        ) + '<div class="rp-hash">w = traffic .31 · mule-p .24 · prior .18 · distance .15 · fit .12 · CCTV pull codes pre-staged · field-team ETA 11 min</div>'
    elif c["tier"] == "T2" and c.get("zone"):
        z = c["zone"]
        f4 += _rp_tbl(
            ["FIELD", "VALUE"],
            [
                ["Zone", z["name"] + " district"],
                ["Radius", str(z["r"]) + " km ring"],
                ["Signal", z["signal"]],
                ["Patrol", "Cyber PS " + z["name"] + " + ZIP unit"],
            ],
        ) + '<div class="rp-hash">District-level only — no ATM precision claimed at Tier 2.</div>'
    elif c["tier"] == "T3":
        rails = sorted(c["channel"].items(), key=lambda kv: -kv[1])
        f4 += _rp_tbl(["RAIL", "LIKELIHOOD"], [[RAILN[r], str(v) + "%"] for r, v in rails]) + (
            f'<div class="rp-hash">Lead mule age {c["mules"][0]["ageDays"]} days — no debit card issued. Chasing wallet rail, not ATM.</div>'
            if c["mules"]
            else ""
        )
    else:
        f4 += (
            '<div class="rp-callout">Watchlist mode — signal available: “account exists” only. No geographic forecast issued. '
            "Ovi does not fabricate ATM precision when graph signal is insufficient; auto-promotion on new mule neighbour or device link.</div>"
        )
    f4 += '<div class="rp-hash">Rail mix: ' + " · ".join(RAILN[r] + " " + str(v) + "%" for r, v in c["channel"].items()) + "</div>"
    out += _rp_sec("4", "CASHOUT FORECAST · " + c["tier"], f4)

    action_rows = []
    for m in c["mules"]:
        if m["frozen"]:
            status = "FROZEN · confirmed " + ist_time(m["sentAt"] + 6 * 60000)
            amt = inr(m["frozenAmt"])
        elif m["status"] == "sent":
            status = "TRANSMITTED · SLA " + hms(max(0, 900 - (now - m["sentAt"]) / 1000))
            amt = inrc(mule_bal(c, m, now) * m["p"]) + " expected"
        else:
            status = "queued — not yet transmitted"
            amt = inrc(mule_bal(c, m, now) * m["p"]) + " expected"
        action_rows.append([m["tok"], m["bank"], _f2(m["p"]), status, amt])
    actions_html = _rp_tbl(["ACCOUNT", "BANK", "P(MULE)", "STATUS", "AMOUNT"], action_rows)
    if alerts:
        actions_html += (
            '<h2 class="rp-h2" style="margin-top:16px">LEA / BANK DISPATCHES</h2>'
            + _rp_tbl(
                ["TIME", "CHANNEL", "RECIPIENT", "STATUS"],
                [
                    [ist_time(a["t"]), a["ch"], a["to"], ("ACKED " + str(a["ack"]) + "s") if a["status"] == "acked" else a["status"].upper()]
                    for a in alerts
                ],
            )
        )
    else:
        actions_html += '<div class="rp-hash" style="margin-top:8px">No case-tagged dispatches in the current window — see central dispatch log (view 07).</div>'
    out += _rp_sec("5", "ACTIONS TAKEN", actions_html)

    anchors = _rp_tbl(
        ["ITEM", "DIGEST"],
        [
            ["Case block anchor", "0x" + hex_n(c["id"] + "blk", 16)],
            ["Evidence bundle · ev1", "0x" + hex_n(c["id"] + "ev1", 16)],
            ["Evidence bundle · ev2", "0x" + hex_n(c["id"] + "ev2", 16)],
            ["Graph snapshot", "0x" + hex_n(c["id"] + "g", 16)],
            ["Investigation report", rep_hash],
        ],
    )
    out += _rp_sec(
        "6",
        "EVIDENCE BUNDLE · CHAIN OF CUSTODY",
        '<h2 class="rp-h2" style="margin-top:2px">PIPELINE TIMINGS</h2>'
        + _rp_tbl(["STEP", "T+", "ANCHOR"], [[p[0], "T+" + _f1(c["pt"][i]) + "s", "0x" + hex_n(c["id"] + "p" + str(i), 10)] for i, p in enumerate(PIPE)])
        + '<h2 class="rp-h2" style="margin-top:16px">FABRIC ANCHORS</h2>'
        + anchors
        + '<h2 class="rp-h2" style="margin-top:16px">MODEL CARD</h2>'
        + _rp_tbl(
            ["FIELD", "VALUE"],
            [
                ["Model", "OVI v3.4.1 · GraphSAGE → XGBoost · isotonic calibration"],
                ["Evaluation", "AUC 0.931 · hit@1 0.74 · calibration ECE 1.9% (Chakravyuh-Bench-v0)"],
                ["Provenance", "TransXion 3M pre-train → RBI mule benchmark fine-tune"],
                ["Legal basis", "DPDP Act 2023 §7(7) · Karnataka HC 2025 (PhonePe)"],
                ["Privacy posture", "Raw PII bank-local · tokenized IDs + calibrated scores only · FL 24/24 nodes"],
            ],
        ),
    )

    block_anchor = "#" + en_in(rep["block"]) + " · " + rep["hash"] if rep else "not yet anchored"
    out += _rp_sec(
        "7",
        "CERTIFICATION",
        '<div class="rp-cert">This report was generated by the OVI platform from tokenized federated scores; no raw personally identifiable data crossed any bank boundary in its production. '
        "All probabilities are isotonic-calibrated and carry explicit confidence tiers — "
        + _rp_tier(c["tier"])
        + " — reflecting honest signal availability at generation time. Evidence items are anchored to the Hyperledger Fabric evidence channel and are tamper-evident; any post-hoc modification invalidates the digests above.</div>"
        + _rp_meta(
            [
                ("GENERATED BY", "OVI v3.4.1 · I4C central desk"),
                ("GENERATED AT", ist_date(gen) + " " + ist_time(gen) + " IST"),
                ("REPORT HASH", rep_hash),
                ("BLOCK ANCHOR", block_anchor),
            ]
        )
        + '<div class="rp-hash" style="margin-top:6px">Anchoring commits this document’s digest to the Fabric evidence channel, establishing the timestamped chain-of-custody record for court submission.</div>',
    )

    return '<div class="rp">' + out + "</div>"


def report_document(state: State, c: dict) -> str:
    """Standalone downloadable report file (same wrapper as downloadReport())."""
    doc = (
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + f'<title>OVI Report · {c["id"]}</title>'
        + '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet">'
        + f"<style>{REPORT_CSS}body{{margin:0;padding:24px 0;background:#E9ECF2}}</style></head><body>{report_body(state, c)}</body></html>"
    )
    return doc
