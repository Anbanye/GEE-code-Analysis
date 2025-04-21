// calculating NDVI FOR TAMALE

// Load Area of Interest (AOI)
var aoi = ee.FeatureCollection('projects/gis306/assets/TM');

// Load Sentinel-2 imagery (Surface Reflectance)
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2020-12-01', '2020-12-31') // Adjust date range as needed
  .filterBounds(aoi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)) // Filter out cloudy images
  .select(['B4', 'B8']); // Select Red (B4) and NIR (B8) bands

// Function to Calculate NDVI
var calculateNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI'); // NDVI = (NIR - Red) / (NIR + Red)
  return image.addBands(ndvi);
};

// Map the NDVI function over the collection and compute median NDVI
var ndviCollection = sentinel2.map(calculateNDVI);
var ndviImage = ndviCollection.median().clip(aoi);

// Select only the NDVI band for visualization and export
var ndviBand = ndviImage.select('NDVI');

// Compute Min & Max NDVI for Visualization
var minMax = ndviBand.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: aoi,
  scale: 10, // Sentinel-2 resolution is 10m
  maxPixels: 1e13
});

// Calculate basic statistics for NDVI analysis
var stats = ndviBand.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }).combine({
    reducer2: ee.Reducer.percentile([10, 25, 50, 75, 90]),
    sharedInputs: true
  }),
  geometry: aoi,
  scale: 10,
  maxPixels: 1e13
});

// Print statistics for analysis
print('NDVI Statistics:', stats);

// Add histogram of NDVI values
var histogram = ui.Chart.image.histogram({
  image: ndviBand,
  region: aoi,
  scale: 10,
  minBucketWidth: 0.01
});
print('NDVI Value Distribution', histogram);

// Export NDVI Image as GeoTIFF
Export.image.toDrive({
  image: ndviBand,
  description: 'NDVI_Image_Export',
  fileFormat: 'GeoTIFF',
  region: aoi,
  scale: 10, // Sentinel-2 resolution is 10m
  crs: 'EPSG:4326'
});

// Add Layers to Map
Map.centerObject(aoi, 10);

// Add NDVI Image to Map with a color palette
Map.addLayer(ndviBand, {
  min: minMax.get('NDVI_min').getInfo(),
  max: minMax.get('NDVI_max').getInfo(),
  palette: ['red', 'yellow', 'green'] // Red = low NDVI, Green = high NDVI
}, 'NDVI');

// Add AOI boundary for reference
Map.addLayer(aoi, {color: 'blue'}, 'AOI Boundary');
