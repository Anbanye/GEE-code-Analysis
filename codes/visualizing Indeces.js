// change the aoi to your specific area of interest if you want to use this for a particular place
// Load AOI
var aoi = ee.FeatureCollection('projects/gis306/assets/Upper_West');

// Load and preprocess Sentinel-2 data
var sentinel = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterBounds(aoi)
  .filterDate('2024-12-01', '2024-12-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
  .map(function(image) {
    var scl = image.select('SCL');
    var cloudMask = scl.neq(3).and(scl.neq(8));
    return image.updateMask(cloudMask);
  });

var image = sentinel.mosaic().clip(aoi);

// Compute indices
var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
var mndwi = image.normalizedDifference(['B3', 'B11']).rename('MNDWI');
var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
var savi = image.expression('(B8 - B4) / (B8 + B4 + 0.5) * 1.5', {
  'B8': image.select('B8'),
  'B4': image.select('B4')
}).rename('SAVI');

var inputImage = image.addBands([ndbi, ndvi, mndwi, ndwi, savi]);

// Add True Color Composite
Map.addLayer(image, 
  {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 
  'True Color Composite');

// Optionally add individual indices for inspection
Map.addLayer(ndvi, 
  {min: -1, max: 1, palette: ['brown', 'white', 'green']}, 
  'NDVI');
Map.addLayer(ndbi, 
  {min: -1, max: 1, palette: ['blue', 'white', 'red']}, 
  'NDBI');
Map.addLayer(savi, 
  {min: -1, max: 1, palette: ['white', 'green', 'brown']}, 
  'SAVI');

// Center view
Map.centerObject(aoi, 12);
