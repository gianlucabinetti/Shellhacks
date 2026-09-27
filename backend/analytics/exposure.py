"""What a portfolio holds: its money by asset type and by company sector.

Funds are looked through: a fund's money is split across sectors by its
published sector weights, so VTI counts partly as technology, partly as
health care, and so on. Bonds, gold and silver, and crypto are not
companies and have no sector.

Pure functions over plain dicts so they are easy to test without data files.
"""

# Type id -> (label, invested in companies?)
TYPES: dict[str, tuple[str, bool]] = {
    "stock_fund": ("Stock index funds", True),
    "stock": ("Individual stocks", True),
    "bond": ("Bonds", False),
    "metal": ("Gold & silver", False),
    "crypto": ("Crypto", False),
}
TYPE_LABELS = {key: label for key, (label, _) in TYPES.items()}
UNCLASSIFIED = "Not classified"


def normalized(weights: dict[str, float]) -> dict[str, float]:
    """Scale weights to sum to 1; published breakdowns are rounded and rarely total exactly 100."""
    total = sum(w for w in weights.values() if w > 0)
    return {k: w / total for k, w in weights.items() if w > 0} if total > 0 else {}


def slices(groups: dict[str, dict[str, float]], total: float, labels: dict[str, str]) -> list[dict]:
    """Each group's dollars and share of `total`, largest first, with the holdings behind it."""
    rows = []
    for key, parts in groups.items():
        value = sum(parts.values())
        rows.append({
            "id": key, "label": labels.get(key, key), "value": value, "weight": value / total,
            "holdings": [{"symbol": s, "value": v} for s, v in sorted(parts.items(), key=lambda kv: -kv[1])],
        })
    return sorted(rows, key=lambda r: -r["value"])


def by_type(values: dict[str, float], types: dict[str, str]) -> list[dict]:
    groups: dict[str, dict[str, float]] = {}
    for symbol, value in values.items():
        groups.setdefault(types[symbol], {})[symbol] = value
    return slices(groups, sum(values.values()), TYPE_LABELS)


def by_sector(values: dict[str, float], types: dict[str, str],
              sectors: dict[str, dict[str, float]]) -> tuple[list[dict], list[dict]]:
    """(company sectors, money outside companies), both as shares of the whole portfolio."""
    total = sum(values.values())
    company: dict[str, dict[str, float]] = {}
    outside: dict[str, dict[str, float]] = {}
    for symbol, value in values.items():
        kind = types[symbol]
        if not TYPES[kind][1]:
            outside.setdefault(kind, {})[symbol] = value
            continue
        for sector, share in (normalized(sectors.get(symbol, {})) or {UNCLASSIFIED: 1.0}).items():
            company.setdefault(sector, {})[symbol] = value * share
    return slices(company, total, {}), slices(outside, total, TYPE_LABELS)


def market_mix(company_weight: float, reference: dict[str, float]) -> dict[str, float]:
    """Each sector's share of the whole portfolio if the money in companies followed `reference`."""
    return {sector: company_weight * share for sector, share in normalized(reference).items()}
