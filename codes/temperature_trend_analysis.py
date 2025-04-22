# this is not a gee code, it is a python script for analysing trends in tas mon one ssp585 data

import xarray as xr
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.stattools import acf

# Load NetCDF file
file_path = "tas_mon_one_ssp585_192_ave.nc"
ds = xr.open_dataset(file_path)
var_name = "tas"
temperature = ds[var_name]

# Select location
target_lat, target_lon = -0.84245, 9.40272
temp_at_location = temperature.sel(lat=target_lat, lon=target_lon, method="nearest")

# Extract April data (1990–2025)
april_temps = temp_at_location.where(temp_at_location['time.month'] == 4, drop=True)
april_temps = april_temps.sel(time=slice('1990', '2050'))

# Convert to pandas for trend analysis
years = april_temps['time.year'].values
temps = april_temps.values
df = pd.DataFrame({'year': years, 'temperature': temps})

# Add time index (years since start)
df['time'] = df['year'] - df['year'].min()

# --- TREND ANALYSIS ---

# 1. OLS (ignores autocorrelation)
X = sm.add_constant(df['time'])  # Add intercept
ols_model = sm.OLS(df['temperature'], X)
ols_results = ols_model.fit()
ols_trend = ols_results.predict(X)

# 2. GLS with AR(1) correction - New approach
# Estimate rho using ACF
residuals = ols_results.resid
rho = acf(residuals, nlags=1, fft=True)[1]  # Lag-1 autocorrelation

# Create AR(1) covariance matrix
n = len(df)
order = np.arange(n)
cov = rho**np.abs(np.subtract.outer(order, order))

# Add small value to diagonal to ensure positive definiteness
cov += np.eye(n) * 1e-6

gls_model = sm.GLS(df['temperature'], X, sigma=cov)
gls_results = gls_model.fit()
gls_trend = gls_results.predict(X)

# --- PLOT RESULTS ---
plt.figure(figsize=(12, 6))
plt.plot(df['year'], df['temperature'], 'bo-', label='April Temperature')

# Plot trends
plt.plot(df['year'], ols_trend, 'r--', 
         label=f'OLS Trend ({ols_results.params[1]:.3f} K/yr, p={ols_results.pvalues[1]:.3f})')
plt.plot(df['year'], gls_trend, 'g--', 
         label=f'GLS-AR(1) Trend ({gls_results.params[1]:.3f} K/yr, p={gls_results.pvalues[1]:.3f})')

plt.xlabel('Year')
plt.ylabel('Temperature (K)')
plt.title(f'April Temperature at Tamale(-0.84245, 9.40272), for (1990–2025)\n'
          f'Autocorrelation (rho) = {rho:.3f}')
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()

# Print trend statistics
print("\n--- TREND ANALYSIS RESULTS ---")
print(f"1. OLS Trend (ignores autocorrelation): {ols_results.params[1]:.4f} K/yr")
print(f"   p-value: {ols_results.pvalues[1]:.4f}")
print(f"2. GLS-AR(1) Trend (accounts for autocorrelation): {gls_results.params[1]:.4f} K/yr")
print(f"   p-value: {gls_results.pvalues[1]:.4f}")
print(f"Estimated autocorrelation (rho): {rho:.4f}")
