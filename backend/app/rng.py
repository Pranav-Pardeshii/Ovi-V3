"""Bit-exact port of frontend/src/lib/rng.ts.

The frontend derives every stable identifier (mule tokens, SHAP tables,
pipeline timings, hash chips) from these three functions, so the backend must
reproduce them exactly for the same seed strings. JS bitwise ops are 32-bit;
the helpers below emulate signed 32-bit semantics (| 0, Math.imul) and
unsigned shifts (>>>).
"""

_MASK32 = 0xFFFFFFFF
_HEX = "0123456789ABCDEF"


def _i32(x: int) -> int:
    """Reinterpret a 32-bit pattern as a signed int (JS `| 0`)."""
    x &= _MASK32
    return x - 0x1_0000_0000 if x >= 0x8000_0000 else x


def _imul(a: int, b: int) -> int:
    """32-bit integer multiply keeping the low word, signed (Math.imul)."""
    return _i32((a * b) & _MASK32)


def _shr_u(x: int, k: int) -> int:
    """Unsigned right shift (JS `>>>`)."""
    return (x & _MASK32) >> k


def to_utf16_units(s: str) -> list[int]:
    """UTF-16 code units — what JS `charCodeAt` walks.

    Astral-plane characters become surrogate pairs, matching JS exactly.
    """
    b = s.encode("utf-16-le")
    return [int.from_bytes(b[i : i + 2], "little") for i in range(0, len(b), 2)]


def js_hash(s: str) -> int:
    """FNV-1a 32-bit over UTF-16 code units, unsigned (hash in rng.ts)."""
    h = 2166136261
    for u in to_utf16_units(s):
        h ^= u
        h = _imul(h, 16777619)
    return _shr_u(h, 0)


def mulberry32(a: int):
    """mulberry32 PRNG returning floats in [0, 1) — identical sequence to TS."""
    state = _i32(a)

    def nxt() -> float:
        nonlocal state
        state = _i32(state + 0x6D2B79F5)
        t = _imul(state ^ _shr_u(state, 15), 1 | state)
        t = _i32(t + _imul(t ^ _shr_u(t, 7), 61 | t)) ^ t
        return _shr_u(t ^ _shr_u(t, 14), 0) / 4294967296

    return nxt


def hex_n(seed_str: str, n: int) -> str:
    """n hex chars from a seed string (hexN in rng.ts)."""
    h = js_hash(seed_str)
    out = []
    for _ in range(n):
        h = _shr_u(_imul(h ^ _shr_u(h, 13), 0x5BD1E995), 0)
        out.append(_HEX[h % 16])
    return "".join(out)
