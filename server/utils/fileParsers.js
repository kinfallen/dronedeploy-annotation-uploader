/**
 * File Parsing Utilities for Different Annotation Formats
 */

const csv = require('csv-parser');
const xml2js = require('xml2js');
const JSZip = require('jszip');
const fs = require('fs');
const { ANNOTATION_TYPES, ERROR_MESSAGES } = require('../config/constants');

/**
 * Parse CSV file content
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} Array of parsed annotations
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      return reject(new Error(ERROR_MESSAGES.FILE_PROCESSING.INVALID_FILE_FORMAT));
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Clean and validate the row
          const cleanRow = {};
          Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanRow[cleanKey] = row[key]?.toString().trim();
          });
          
          // Convert to annotation format
          const annotation = convertCSVRowToAnnotation(cleanRow);
          if (annotation) {
            results.push(annotation);
          }
        } catch (error) {
          console.warn(`Skipping invalid CSV row: ${error.message}`);
        }
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('No valid annotations found in CSV file'));
        } else {
          resolve(results);
        }
      })
      .on('error', (error) => {
        reject(new Error(`${ERROR_MESSAGES.FILE_PROCESSING.PARSE_ERROR}: ${error.message}`));
      });
  });
}

/**
 * Convert CSV row to annotation object
 * @param {Object} row - CSV row data
 * @returns {Object|null} Annotation object or null if invalid
 */
function convertCSVRowToAnnotation(row) {
  // Required fields validation
  if (!row.annotationType && !row.type) {
    throw new Error('Missing required field: annotationType');
  }
  if (!row.title) {
    throw new Error('Missing required field: title');
  }
  if (!row.color) {
    throw new Error('Missing required field: color');
  }

  const annotation = {
    annotationType: (row.annotationType || row.type)?.toUpperCase(),
    title: row.title,
    color: row.color,
    fillColor: row.fillColor || row.color // Use color as fallback for fillColor
  };
  
  // Validate annotation type
  if (!Object.keys(ANNOTATION_TYPES).includes(annotation.annotationType)) {
    throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_ANNOTATION_TYPE(annotation.annotationType));
  }
  
  // Parse geometry based on annotation type
  if (annotation.annotationType === 'LOCATION') {
    // For LOCATION, lat and lng are required
    if (!row.lat || !row.lng) {
      throw new Error('LOCATION annotations require lat and lng fields');
    }
    
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates for LOCATION annotation');
    }
    
    // Create GeoJSON Point geometry format
    annotation.geometry = {
      type: 'Point',
      coordinates: [lng, lat] // GeoJSON format [lng, lat]
    };
  } else if (annotation.annotationType === 'AREA' || annotation.annotationType === 'LINE') {
    // For AREA and LINE, geometry field is required
    if (!row.geometry) {
      throw new Error(`${annotation.annotationType} annotations require geometry field`);
    }
    
    try {
      // Parse geometry string - should be array of [lng,lat] coordinates
      const geometryData = JSON.parse(row.geometry);
      
      if (!Array.isArray(geometryData)) {
        throw new Error('Geometry must be an array of coordinates');
      }
      
      // Validate minimum points
      const minPoints = ANNOTATION_TYPES[annotation.annotationType].minPoints;
      if (geometryData.length < minPoints) {
        throw new Error(ERROR_MESSAGES.VALIDATION.INSUFFICIENT_POINTS(
          annotation.annotationType,
          geometryData.length,
          minPoints
        ));
      }
      
      // Validate coordinate format
      for (const coord of geometryData) {
        if (!Array.isArray(coord) || coord.length < 2 || 
            isNaN(parseFloat(coord[0])) || isNaN(parseFloat(coord[1]))) {
          throw new Error('Invalid coordinate format. Expected [lng,lat] pairs');
        }
      }
      
      if (annotation.annotationType === 'AREA') {
        // For polygons, ensure it's closed (first and last points are the same)
        const firstPoint = geometryData[0];
        const lastPoint = geometryData[geometryData.length - 1];
        
        if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
          // Auto-close the polygon
          geometryData.push([firstPoint[0], firstPoint[1]]);
        }
        
        annotation.geometry = {
          type: 'Polygon',
          coordinates: [geometryData] // Wrap in array for polygon outer ring
        };
      } else if (annotation.annotationType === 'LINE') {
        annotation.geometry = {
          type: 'LineString',
          coordinates: geometryData
        };
      }
    } catch (error) {
      throw new Error(`Invalid geometry format: ${error.message}`);
    }
  }
  
  return annotation;
}

/**
 * Parse GeoJSON file content
 * @param {string} filePath - Path to GeoJSON file
 * @returns {Promise<Array>} Array of parsed annotations
 */
async function parseGeoJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(ERROR_MESSAGES.FILE_PROCESSING.INVALID_FILE_FORMAT);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const geoJSON = JSON.parse(content);
    
    if (!geoJSON.type || geoJSON.type !== 'FeatureCollection' || !Array.isArray(geoJSON.features)) {
      throw new Error('Invalid GeoJSON format: must be a FeatureCollection');
    }
    
    const annotations = [];
    
    for (const feature of geoJSON.features) {
      try {
        const annotation = convertGeoJSONFeatureToAnnotation(feature);
        if (annotation) {
          annotations.push(annotation);
        }
      } catch (error) {
        console.warn(`Skipping invalid GeoJSON feature: ${error.message}`);
      }
    }
    
    if (annotations.length === 0) {
      throw new Error('No valid annotations found in GeoJSON file');
    }
    
    return annotations;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${ERROR_MESSAGES.FILE_PROCESSING.PARSE_ERROR}: Invalid JSON format`);
    }
    throw error;
  }
}

/**
 * Convert GeoJSON feature to annotation object
 * @param {Object} feature - GeoJSON feature
 * @returns {Object|null} Annotation object or null if invalid
 */
function convertGeoJSONFeatureToAnnotation(feature) {
  if (!feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
    throw new Error('Invalid GeoJSON feature: missing geometry');
  }
  
  // Required fields validation
  if (!feature.properties?.title) {
    throw new Error('Missing required field: title in properties');
  }
  if (!feature.properties?.color) {
    throw new Error('Missing required field: color in properties');
  }
  
  const annotation = {
    title: feature.properties.title,
    color: feature.properties.color,
    fillColor: feature.properties.fillColor || feature.properties.color // Use color as fallback
  };
  
  // Map GeoJSON geometry types to annotation types and preserve geometry
  switch (feature.geometry.type) {
    case 'Point':
      annotation.annotationType = 'LOCATION';
      annotation.geometry = feature.geometry; // Keep full GeoJSON geometry
      break;
      
    case 'Polygon':
      annotation.annotationType = 'AREA';
      annotation.geometry = feature.geometry; // Keep full GeoJSON geometry
      break;
      
    case 'LineString':
      annotation.annotationType = 'LINE';
      annotation.geometry = feature.geometry; // Keep full GeoJSON geometry
      break;
      
    default:
      throw new Error(`Unsupported GeoJSON geometry type: ${feature.geometry.type}`);
  }
  
  return annotation;
}

/**
 * Parse KML file content
 * @param {string} filePath - Path to KML file
 * @returns {Promise<Array>} Array of parsed annotations
 */
async function parseKML(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(ERROR_MESSAGES.FILE_PROCESSING.INVALID_FILE_FORMAT);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(content);
    
    if (!result.kml || !result.kml.Document) {
      throw new Error('Invalid KML format: missing Document element');
    }
    
    const annotations = [];
    const placemarks = Array.isArray(result.kml.Document.Placemark) 
      ? result.kml.Document.Placemark 
      : [result.kml.Document.Placemark].filter(Boolean);
    
    for (const placemark of placemarks) {
      try {
        const annotation = convertKMLPlacemarkToAnnotation(placemark);
        if (annotation) {
          annotations.push(annotation);
        }
      } catch (error) {
        console.warn(`Skipping invalid KML placemark: ${error.message}`);
      }
    }
    
    if (annotations.length === 0) {
      throw new Error('No valid annotations found in KML file');
    }
    
    return annotations;
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.FILE_PROCESSING.PARSE_ERROR}: ${error.message}`);
  }
}

/**
 * Convert KML placemark to annotation object
 * @param {Object} placemark - KML placemark object
 * @returns {Object|null} Annotation object or null if invalid
 */
function convertKMLPlacemarkToAnnotation(placemark) {
  // Required field validation
  if (!placemark.name) {
    throw new Error('KML placemark missing required field: name');
  }
  
  const annotation = {
    title: placemark.name,
    color: '#FF0000', // Default color, KML color parsing is complex
    fillColor: '#FF0000' // Default fillColor
  };
  
  // Parse different geometry types
  if (placemark.Point) {
    annotation.annotationType = 'LOCATION';
    const coords = placemark.Point.coordinates.split(',');
    if (coords.length < 2) {
      throw new Error('Invalid Point coordinates in KML');
    }
    annotation.geometry = {
      type: 'Point',
      coordinates: [parseFloat(coords[0]), parseFloat(coords[1])] // [lng, lat]
    };
  } else if (placemark.Polygon) {
    annotation.annotationType = 'AREA';
    if (!placemark.Polygon.outerBoundaryIs?.LinearRing?.coordinates) {
      throw new Error('Invalid Polygon structure in KML');
    }
    const coordString = placemark.Polygon.outerBoundaryIs.LinearRing.coordinates;
    const coordinates = parseKMLCoordinates(coordString);
    
    // Validate minimum points for area
    if (coordinates.length < ANNOTATION_TYPES.AREA.minPoints) {
      throw new Error(ERROR_MESSAGES.VALIDATION.INSUFFICIENT_POINTS(
        'AREA',
        coordinates.length,
        ANNOTATION_TYPES.AREA.minPoints
      ));
    }
    
    annotation.geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    };
  } else if (placemark.LineString) {
    annotation.annotationType = 'LINE';
    if (!placemark.LineString.coordinates) {
      throw new Error('Invalid LineString structure in KML');
    }
    const coordinates = parseKMLCoordinates(placemark.LineString.coordinates);
    
    // Validate minimum points for line
    if (coordinates.length < ANNOTATION_TYPES.LINE.minPoints) {
      throw new Error(ERROR_MESSAGES.VALIDATION.INSUFFICIENT_POINTS(
        'LINE',
        coordinates.length,
        ANNOTATION_TYPES.LINE.minPoints
      ));
    }
    
    annotation.geometry = {
      type: 'LineString',
      coordinates: coordinates
    };
  } else {
    throw new Error('Unsupported KML geometry type or missing geometry');
  }
  
  return annotation;
}

/**
 * Parse KML coordinate string
 * @param {string} coordString - KML coordinate string
 * @returns {Array} Array of [lng, lat] coordinates
 */
function parseKMLCoordinates(coordString) {
  return coordString.trim().split(/\s+/).map(coordPair => {
    const [lng, lat] = coordPair.split(',').map(parseFloat);
    return [lng, lat];
  }).filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
}

/**
 * Parse KMZ file (compressed KML)
 * @param {string} filePath - Path to KMZ file
 * @returns {Promise<Array>} Array of parsed annotations
 */
async function parseKMZ(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(ERROR_MESSAGES.FILE_PROCESSING.INVALID_FILE_FORMAT);
    }
    
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    
    // Find KML file in the archive
    const kmlFile = Object.keys(zip.files).find(filename => 
      filename.toLowerCase().endsWith('.kml')
    );
    
    if (!kmlFile) {
      throw new Error('No KML file found in KMZ archive');
    }
    
    const kmlContent = await zip.files[kmlFile].async('text');
    
    // Create temporary KML file and parse it
    const tempKMLPath = filePath.replace('.kmz', '_temp.kml');
    fs.writeFileSync(tempKMLPath, kmlContent);
    
    try {
      const annotations = await parseKML(tempKMLPath);
      fs.unlinkSync(tempKMLPath); // Clean up temp file
      return annotations;
    } catch (error) {
      fs.unlinkSync(tempKMLPath); // Clean up temp file on error
      throw error;
    }
  } catch (error) {
    throw new Error(`${ERROR_MESSAGES.FILE_PROCESSING.PARSE_ERROR}: ${error.message}`);
  }
}

/**
 * Parse file based on extension
 * @param {string} filePath - Path to file
 * @param {string} originalName - Original filename
 * @returns {Promise<Array>} Array of parsed annotations
 */
async function parseFile(filePath, originalName) {
  const extension = originalName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv':
      return parseCSV(filePath);
    case 'json':
    case 'geojson':
      return parseGeoJSON(filePath);
    case 'kml':
      return parseKML(filePath);
    case 'kmz':
      return parseKMZ(filePath);
    default:
      throw new Error(ERROR_MESSAGES.FILE_PROCESSING.UNSUPPORTED_FORMAT);
  }
}

module.exports = {
  parseCSV,
  parseGeoJSON,
  parseKML,
  parseKMZ,
  parseFile,
  convertCSVRowToAnnotation,
  convertGeoJSONFeatureToAnnotation,
  convertKMLPlacemarkToAnnotation
};


