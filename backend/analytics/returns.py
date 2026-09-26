# Finance concepts used here:
# portfolio return = how much the whole portfolio gained or lost
# volatility = how much those gains/losses jump around
# max drawdown = the biggest drop from a previous high

import statistics


def calculate_portfolio_return(weights, returns):
    # PORTFOLIO RETURN:
    # How much the entire portfolio gained or lost as a percentage.
    #
    # weights = how much of the portfolio is in each investment.
    # Example:
    # [0.60, 0.35, 0.05]
    # means:
    # 60% stocks
    # 35% bonds
    # 5% cash
    #
    # returns = how much each matching investment gained or lost.
    # Example:
    # [0.10, 0.04, 0.00]
    # means:
    # stocks gained 10%
    # bonds gained 4%
    # cash gained 0%
    #
    # The two lists match by index:
    # index 0 = stocks
    # index 1 = bonds
    # index 2 = cash

    # Start the total portfolio return at 0.
    total_return = 0

    # zip() pairs each weight with its matching investment return.
    for weight, investment_return in zip(weights, returns):

        # Multiply each investment's weight by how much it gained/lost.
        #
        # Example:
        # stocks: 0.60 * 0.10 = 0.06
        # bonds:  0.35 * 0.04 = 0.014
        # cash:   0.05 * 0.00 = 0
        #
        # Add each contribution together:
        # 0.06 + 0.014 + 0 = 0.074
        # 0.074 = 7.4%
        total_return += weight * investment_return

    # Send the final portfolio return back to whoever called the function.
    return total_return


# Example moderate portfolio used for testing/demo:
weights = [0.60, 0.35, 0.05]

# Example gains/losses for those same investments:
returns = [0.10, 0.04, 0.00]

# Call the function and save its answer.
result = calculate_portfolio_return(weights, returns)

# The function returns a decimal such as 0.074.
# Multiply by 100 to display it as 7.4%.
percent = result * 100

print(f"{result} which means {percent:.1f}% as the portfolio return.")


def calculate_volatility(portfolio_returns):
    # VOLATILITY:
    # How much the portfolio's gains and losses jump around over time.
    #
    # portfolio_returns = the whole portfolio's gain/loss
    # during several different time periods.
    #
    # Example:
    # [0.05, -0.02, 0.08]
    #
    # means:
    # period 1 = gained 5%
    # period 2 = lost 2%
    # period 3 = gained 8%
    #
    # Bigger jumps between returns = higher volatility.

    # Standard deviation measures how spread out the returns are.
    volatility = statistics.stdev(portfolio_returns)

    # Send the volatility result back.
    return volatility


def calculate_max_drawdown(portfolio_values):
    # MAX DRAWDOWN:
    # The biggest percentage drop from a previous high point.
    #
    # portfolio_values are actual dollar values, NOT percentages.
    #
    # Example:
    # [10000, 11000, 9000, 12000]
    #
    # means:
    # $10,000 -> $11,000 -> $9,000 -> $12,000

    # Start by treating the first value as the highest value seen so far.
    highest_value = portfolio_values[0]

    # Start at 0 because no drop has been found yet.
    max_drawdown = 0

    # Look through every portfolio value one at a time.
    for value in portfolio_values:

        # If the current value is a new high,
        # update highest_value.
        if value > highest_value:
            highest_value = value

        # Calculate how far the current value has dropped
        # from the highest value seen so far.
        drawdown = (value - highest_value) / highest_value

        # If this drop is worse than any previous drop,
        # save it as the new maximum drawdown.
        if drawdown < max_drawdown:
            max_drawdown = drawdown

    # Send the biggest drop back.
    return max_drawdown


