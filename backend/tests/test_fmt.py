"""Formatter parity with src/lib/format.ts — Indian grouping, IST display."""

from app.fmt import en_in, hms, inr, inrc, ist_date, ist_hm, ist_time, ms_fmt, p2, short_cd


def test_en_in_grouping():
    assert en_in(4721884) == "47,21,884"
    assert en_in(1850000) == "18,50,000"
    assert en_in(1530000) == "15,30,000"
    assert en_in(999) == "999"
    assert en_in(1000) == "1,000"
    assert en_in(100000) == "1,00,000"


def test_inr():
    assert inr(74000) == "₹74,000"
    assert inrc(2200000) == "₹22.00 L"
    assert inrc(42300000) == "₹4.23 Cr"
    assert inrc(36000) == "₹36,000"


def test_durations():
    assert p2(7) == "07"
    assert hms(3723) == "01:02:03"
    assert hms(-5) == "00:00:00"
    assert ms_fmt(125) == "2m 05s"
    assert short_cd(80) == "1m"
    assert short_cd(3700) == "1h01"
    assert short_cd(-1) == "—"


def test_ist_display():
    # 2026-09-18 08:50:00 UTC → 14:20:00 IST (the console's sim base)
    t = 1789721400000
    assert ist_time(t) == "14:20:00"
    assert ist_hm(t) == "14:20"
    assert ist_date(t) == "18 SEP 2026"
