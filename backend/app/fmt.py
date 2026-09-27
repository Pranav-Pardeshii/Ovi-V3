"""Port of frontend/src/lib/format.ts.

Sim timestamps are UTC epoch ms; IST display = +5:30. Number formatting must
match the console's `toLocaleString('en-IN')` (lakh/crore grouping).
"""

from datetime import datetime, timedelta, timezone
import math

_IST = timezone(timedelta(hours=5, minutes=30))
_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def p2(n: float) -> str:
    return str(int(n)).zfill(2)


def clamp(v: float, a: float, b: float) -> float:
    return max(a, min(b, v))


def js_round(v: float) -> int:
    """Math.round — half toward +Infinity (Python round() is banker's)."""
    return math.floor(v + 0.5)


def en_in(n: int) -> str:
    """Indian digit grouping: 4721884 → '47,21,884' (toLocaleString('en-IN'))."""
    s = str(abs(n))
    if len(s) <= 3:
        return ("-" if n < 0 else "") + s
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ("-" if n < 0 else "") + ",".join(groups + [tail])


def inr(v: float) -> str:
    return "₹" + en_in(js_round(v))


def inrc(v: float) -> str:
    if v >= 1e7:
        return "₹" + f"{v / 1e7:.2f}" + " Cr"
    if v >= 1e5:
        return "₹" + f"{v / 1e5:.2f}" + " L"
    return inr(v)


def hms(s: float) -> str:
    s = max(0, js_round(s))
    return p2(s // 3600) + ":" + p2((s % 3600) // 60) + ":" + p2(s % 60)


def ms_fmt(s: float) -> str:
    s = max(0, js_round(s))
    return str(int(s // 60)) + "m " + p2(s % 60) + "s"


def short_cd(s: float) -> str:
    if s < 0:
        return "—"
    if s < 3600:
        return str(int(s // 60)) + "m"
    return str(int(s // 3600)) + "h" + p2((s % 3600) // 60)


def _ist(t: float) -> datetime:
    return datetime.fromtimestamp(t / 1000, tz=_IST)


def ist_time(t: float) -> str:
    d = _ist(t)
    return p2(d.hour) + ":" + p2(d.minute) + ":" + p2(d.second)


def ist_hm(t: float) -> str:
    d = _ist(t)
    return p2(d.hour) + ":" + p2(d.minute)


def ist_date(t: float) -> str:
    d = _ist(t)
    return f"{d.day} {_MONTHS[d.month - 1]} {d.year}"
