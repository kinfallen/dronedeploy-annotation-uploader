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
  const annotation = {
    annotationType: row.annotationType?.toUpperCase(),
    title: row.title || row.name || 'Untitled',
    color: row.color || '#FF0000',
    fillColor: row.fillColor || row.color || '#FF0000'
  };
  
  // Validate annotation type
  if (!Object.keys(ANNOTATION_TYPES).includes(annotation.annotationType)) {
    throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_ANNOTATION_TYPE(annotation.annotationType));
  }
  
  // Parse geometry based on annotation type
  if (annotation.annotationType === 'LOCATION') {
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates for LOCATION annotation');
    }
    
    annotation.geometry = { lat, lng };
  } else {
    // For AREA and LINE, collect coordinate pairs
    const coordinates = [];
    let i = 1;
    
    while (row[`lat${i > 1 ? i : ''}`] && row[`lng${i > 1 ? i : ''}`]) {
      const lat = parseFloat(row[`lat${i > 1 ? i : ''}`]);
      const lng = parseFloat(row[`lng${i > 1 ? i : ''}`]);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates.push([lng, lat]); // GeoJSON format [lng, lat]
      }
      i++;
    }
    
    if (coordinates.length < ANNOTATION_TYPES[annotation.annotationType].minPoints) {
      throw new Error(ERROR_MESSAGES.VALIDATION.INSUFFICIENT_POINTS(
        annotation.annotationType,
        coordinates.length,
        ANNOTATION_TYPES[annotation.annotationType].minPoints
      ));
    }
    
    annotation.geometry = coordinates;
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
  
  const annotation = {
    title: feature.properties?.title || feature.properties?.name || 'Untitled',
    color: feature.properties?.color || '#FF0000',
    fillColor: feature.properties?.fillColor || feature.properties?.color || '#FF0000'
  };
  
  // Map GeoJSON geometry types to annotation types
  switch (feature.geometry.type) {
    case 'Point':
      annotation.annotationType = 'LOCATION';
      annotation.geometry = {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0]
      };
      break;
      
    case 'Polygon':
      annotation.annotationType = 'AREA';
      annotation.geometry = feature.geometry.coordinates[0]; // Outer ring
      break;
      
    case 'LineString':
      annotation.annotationType = 'LINE';
      annotation.geometry = feature.geometry.coordinates;
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
  if (!placemark.name) {
    throw new Error('KML placemark missing name');
  }
  
  const annotation = {
    title: placemark.name,
    color: '#FF0000', // Default color, KML color parsing is complex
    fillColor: '#FF0000'
  };
  
  // Parse different geometry types
  if (placemark.Point) {
    annotation.annotationType = 'LOCATION';
    const coords = placemark.Point.coordinates.split(',');
    annotation.geometry = {
      lat: parseFloat(coords[1]),
      lng: parseFloat(coords[0])
    };
  } else if (placemark.Polygon) {
    annotation.annotationType = 'AREA';
    const coordString = placemark.Polygon.outerBoundaryIs.LinearRing.coordinates;
    annotation.geometry = parseKMLCoordinates(coordString);
  } else if (placemark.LineString) {
    annotation.annotationType = 'LINE';
    annotation.geometry = parseKMLCoordinates(placemark.LineString.coordinates);
  } else {
    throw new Error('Unsupported KML geometry type');
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


