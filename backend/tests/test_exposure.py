"""Exposure by asset type and by sector: calculations, data file, and summary text. No network."""
from datetime import date

import pytest

from backend.analytics import exposure as ex
from backend.services.market_data import assets
from backend.services.market_insights import exposure_data, exposure_message

SECTORS = {"Technology", "Financials", "Health care", "Consumer discretionary", "Industrials",
           "Communication services", "Consumer staples", "Energy", "Real estate", "Utilities", "Materials"}


def test_funds_are_split_across_the_sectors_they_hold():
    values = {"FUND": 600.0, "CO": 300.0, "BOND": 100.0}
    types = {"FUND": "stock_fund", "CO": "stock", "BOND": "bond"}
    sectors, outside = ex.by_sector(values, types, {"FUND": {"Tech": 50, "Health": 50}, "CO": {"Tech": 100}})
    assert [(s["label"], s["value"]) for s in sectors] == [("Tech", 600), ("Health", 300)]
    assert [(h["symbol"], h["value"]) for h in sectors[0]["holdings"]] == [("FUND", 300), ("CO", 300)]
    assert [(o["label"], o["weight"]) for o in outside] == [("Bonds", pytest.approx(0.1))]
    assert sum(s["weight"] for s in sectors + outside) == pytest.approx(1)


def test_rounded_published_weights_are_normalized():
    sectors, _ = ex.by_sector({"F": 100.0}, {"F": "stock_fund"}, {"F": {"A": 60.01, "B": 40.0, "C": 0}})
    assert sum(s["weight"] for s in sectors) == pytest.approx(1)
    assert [s["label"] for s in sectors] == ["A", "B"]


def test_company_without_sector_data_is_not_classified():
    sectors, outside = ex.by_sector({"NEW": 100.0}, {"NEW": "stock"}, {})
    assert [s["label"] for s in sectors] == [ex.UNCLASSIFIED] and outside == []


def test_by_type_groups_holdings_largest_first():
    rows = ex.by_type({"VTI": 300.0, "SPY": 100.0, "BTC/USD": 500.0, "GLD": 100.0},
                      {"VTI": "stock_fund", "SPY": "stock_fund", "BTC/USD": "crypto", "GLD": "metal"})
    assert [(r["label"], r["weight"]) for r in rows] == [
        ("Crypto", 0.5), ("Stock index funds", 0.4), ("Gold & silver", 0.1)]
    assert [h["symbol"] for h in rows[1]["holdings"]] == ["VTI", "SPY"]


def test_market_mix_scales_to_the_money_in_companies():
    assert ex.market_mix(0.5, {"Tech": 40, "Health": 60}) == {"Tech": pytest.approx(0.2), "Health": pytest.approx(0.3)}


# --- data file ---------------------------------------------------------------------

def test_every_catalog_asset_has_a_type_and_companies_have_sectors():
    data = exposure_data()
    for asset in assets():
        kind = data["types"].get(asset.symbol, asset.asset_class)
        assert kind in ex.TYPES, asset.symbol
        if ex.TYPES[kind][1]:
            weights = data["sectors"][asset.symbol]["weights"]
            assert set(weights) <= SECTORS, asset.symbol
            assert sum(weights.values()) == pytest.approx(100, abs=0.5), asset.symbol
    for entry in data["sectors"].values():
        if "as_of" in entry:
            date.fromisoformat(entry["as_of"])
    assert data["market_reference"]["symbol"] in data["sectors"]


# --- summary text ----------------------------------------------------------------------

def sector(label, weight):
    return {"id": label, "label": label, "weight": weight}


def test_message_flags_a_sector_far_above_the_market():
    text = exposure_message([sector("Technology", 0.6), sector("Financials", 0.3)], [{"label": "Bonds"}], 0.9,
                            {"Technology": 0.9 * 0.37}, "the whole US stock market (VTI)")
    assert text.startswith("Technology is your largest sector: 67% of the money you have in companies.")
    assert "it is 37%, so a slump in technology would hit you harder" in text
    assert text.endswith("The other 10% is in bonds, which are not companies and have no sector.")


def test_message_when_close_to_the_market():
    text = exposure_message([sector("Technology", 0.37)], [], 1.0, {"Technology": 0.37}, "the market")
    assert "That is close to the market (37%)." in text and "The other" not in text


def test_message_without_companies():
    text = exposure_message([], [{"label": "Crypto"}, {"label": "Gold & silver"}], 0.0, {}, "the market")
    assert text == "None of this money is in companies, so it has no sector exposure. It is all in crypto and gold & silver."
