def calculate_future_value(initial_investment, annual_return, years):
    # FUTURE VALUE:
    # Estimates how much money could grow to over time
    # if it grows by the same percentage every year.
    #
    # initial_investment = how much money we start with
    # Example: 10000 means $10,000
    #
    # annual_return = how much the money grows each year
    # Example: 0.05 means 5% per year
    #
    # years = how many years the money grows
    # Example: 10 means 10 years

    # Formula:
    # starting money * (1 + yearly growth rate) raised to number of years
    #
    # Example:
    # $10,000 growing 5% per year for 10 years
    # becomes about $16,288.95.
    future_value = initial_investment * (1 + annual_return) ** years

    # Send the calculated future amount back.
    return future_value

