// SAVI analysis in  GEE
// Load Area of Interest (AOI) - Same as your original script
var aoi = ee.FeatureCollection('projects/gis306/assets/TM');

// Load Sentinel-2 imagery (Surface Reflectance)
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate('2020-12-01', '2020-12-31') // Same date range as your NDVI analysis
  .filterBounds(aoi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
  .select(['B4', 'B8']); // Red (B4) and NIR (B8) bands for SAVI

// Function to Calculate SAVI
var calculateSAVI = function(image) {
  var L = 0.5; // Soil brightness correction factor (0.5 works well for mixed vegetation/soil)
  var savi = image.expression(
    '(1 + L) * (NIR - RED) / (NIR + RED + L)', {
      'NIR': image.select('B8'),
      'RED': image.select('B4'),
      'L': L
    }).rename('SAVI');
  return image.addBands(savi);
};

// Map the SAVI function over the collection and compute median SAVI
var saviCollection = sentinel2.map(calculateSAVI);
var saviImage = saviCollection.median().clip(aoi);

// Select only the SAVI band for visualization and export
var saviBand = saviImage.select('SAVI');

// Compute Min & Max SAVI for Visualization
var minMax = saviBand.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: aoi,
  scale: 10, // Sentinel-2 resolution
  maxPixels: 1e13
});

// Calculate basic statistics for SAVI analysis
var stats = saviBand.reduceRegion({
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
print('SAVI Statistics:', stats);

// Add histogram of SAVI values
var histogram = ui.Chart.image.histogram({
  image: saviBand,
  region: aoi,
  scale: 10,
  minBucketWidth: 0.01
});
print('SAVI Value Distribution', histogram);

// Export SAVI Image as GeoTIFF
Export.image.toDrive({
  image: saviBand,
  description: 'SAVI_Image_Export',
  fileFormat: 'GeoTIFF',
  region: aoi,
  scale: 10,
  crs: 'EPSG:4326'
});

// Add Layers to Map
Map.centerObject(aoi, 10);

// Add SAVI Image to Map with dynamic min/max from the AOI
var visParams = {
  min: -1, // Theoretical minimum for SAVI
  max: 1,  // Theoretical maximum for SAVI
  palette: ['brown', 'yellow', 'green'] // Brown = low vegetation, Green = high vegetation
};

// Or use calculated min/max (uncomment to use)
// var visParams = {
//   min: minMax.get('SAVI_min').getInfo(),
//   max: minMax.get('SAVI_max').getInfo(),
//   palette: ['brown', 'yellow', 'green']
// };

Map.addLayer(saviBand, visParams, 'SAVI');

// Add AOI boundary for reference
Map.addLayer(aoi, {color: 'blue'}, 'AOI Boundary');

// Add a legend
var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'SAVI Legend',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

var makeColor = function(color) {
  return ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 0 8px'
    }
  });
};

var legendItems = [
  {label: 'Low Vegetation', color: 'brown'},
  {label: 'Moderate Vegetation', color: 'yellow'},
  {label: 'High Vegetation', color: 'green'}
];

legend.add(legendTitle);
legendItems.forEach(function(item) {
  var wrapper = ui.Panel({
    widgets: [
      ui.Label(item.label),
      makeColor(item.color)
    ],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
  legend.add(wrapper);
});

Map.add(legend);
