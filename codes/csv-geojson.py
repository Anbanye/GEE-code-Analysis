import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

# === 1. Load CSV ===
# Replace with your actual CSV file path
csv_file = 'your_file.csv'  # <-- PLACEHOLDER

# Read the CSV file into a DataFrame
df = pd.read_csv(csv_file)

# === 2. Check if required columns exist ===
if not {'latitude', 'longitude'}.issubset(df.columns):
    raise ValueError("CSV must contain 'latitude' and 'longitude' columns.")

# === 3. Convert to GeoDataFrame ===
# Create Point geometries from latitude and longitude
geometry = [Point(xy) for xy in zip(df['longitude'], df['latitude'])]
gdf = gpd.GeoDataFrame(df, geometry=geometry)

# Set coordinate reference system to WGS84 (EPSG:4326)
gdf.set_crs(epsg=4326, inplace=True)

# === 4. Export to GeoJSON ===
output_file = 'output.geojson'
gdf.to_file(output_file, driver='GeoJSON')

print(f"GeoJSON file saved as: {output_file}")
