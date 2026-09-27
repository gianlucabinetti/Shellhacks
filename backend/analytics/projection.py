"""Range of possible future values from a volatility and an assumed average return.

Log-normal (geometric Brownian motion) percentiles in closed form: no random
sampling, so results are exact and repeatable. With expected annual return r
and volatility s, the growth rate is m = ln(1 + r), and after t years

    value_p = start * exp((m - s**2 / 2) * t + z_p * s * sqrt(t))

The -s**2/2 term is "volatility drag": the more a portfolio swings, the lower
its typical (median) outcome for the same average return.
"""
import math

PERCENTILES = {"p5": -1.6448536269514722, "p25": -0.6744897501960817, "p50": 0.0,
               "p75": 0.6744897501960817, "p95": 1.6448536269514722}


def normal_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def value_at(start: float, volatility: float, annual_return: float, years: float, z: float) -> float:
    drift = (math.log(1 + annual_return) - volatility ** 2 / 2) * years
    return start * math.exp(drift + z * volatility * math.sqrt(years))


def project_range(start: float, volatility: float, annual_return: float, years: int) -> list[dict]:
    """Monthly percentile bands from today (month 0) to `years`."""
    return [
        {"month": month, **{name: value_at(start, volatility, annual_return, month / 12, z) for name, z in PERCENTILES.items()}}
        for month in range(years * 12 + 1)
    ]


def probability_below(start: float, target: float, volatility: float, annual_return: float, years: float) -> float:
    """Chance the value ends below `target` after `years` under the same model."""
    if volatility <= 0:
        return float(value_at(start, 0, annual_return, years, 0) < target)
    drift = (math.log(1 + annual_return) - volatility ** 2 / 2) * years
    return normal_cdf((math.log(target / start) - drift) / (volatility * math.sqrt(years)))
