const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const csv = require('csv-parser');
const xml2js = require('xml2js');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

// DroneDeploy supported color palette
const DRONEDEPLOY_COLORS = [
  { name: 'Red', color: '#f34235', fillColor: '#f67168' },
  { name: 'Lime Green', color: '#ccdb38', fillColor: '#d9e46a' },
  { name: 'Cyan', color: '#00bbd3', fillColor: '#40ccde' },
  { name: 'Magenta', color: '#f50057', fillColor: '#f84081' },
  { name: 'Orange', color: '#fe9700', fillColor: '#feb140' },
  { name: 'Gold', color: '#fec006', fillColor: '#fed044' },
  { name: 'Green', color: '#4bae4f', fillColor: '#78c27b' },
  { name: 'Teal', color: '#009587', fillColor: '#40b0a5' },
  { name: 'Dark Purple', color: '#9b26af', fillColor: '#b45cc3' },
  { name: 'Amethyst', color: '#6639b6', fillColor: '#8c6bc8' }
];

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Convert RGB to HSL for better perceptual color matching
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Improved color distance using perceptual differences (HSL + weighted RGB)
function colorDistance(color1, color2) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  if (!c1 || !c2) return Infinity;
  
  // RGB distance with perceptual weighting (human eye sensitivity)
  const rDiff = c1.r - c2.r;
  const gDiff = c1.g - c2.g;
  const bDiff = c1.b - c2.b;
  const rgbDistance = Math.sqrt(2 * rDiff * rDiff + 4 * gDiff * gDiff + 3 * bDiff * bDiff);
  
  // HSL distance for better perceptual matching
  const hsl1 = rgbToHsl(c1.r, c1.g, c1.b);
  const hsl2 = rgbToHsl(c2.r, c2.g, c2.b);
  
  // Hue distance (circular, 0-360)
  let hueDiff = Math.abs(hsl1.h - hsl2.h);
  hueDiff = Math.min(hueDiff, 360 - hueDiff);
  
  // Weighted HSL distance
  const hslDistance = Math.sqrt(
    Math.pow(hueDiff * 2, 2) +           // Hue is most important
    Math.pow(hsl1.s - hsl2.s, 2) +      // Saturation
    Math.pow((hsl1.l - hsl2.l) * 0.5, 2) // Lightness less important
  );
  
  // Combine RGB and HSL distances
  return rgbDistance * 0.7 + hslDistance * 0.3;
}

// Find nearest DroneDeploy color
function findNearestDroneDeployColor(inputColor) {
  let nearestColor = DRONEDEPLOY_COLORS[0];
  let minDistance = colorDistance(inputColor, nearestColor.color);
  
  for (const ddColor of DRONEDEPLOY_COLORS) {
    const distance = colorDistance(inputColor, ddColor.color);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = ddColor;
    }
  }
  
  return nearestColor;
}

// Standardize annotation colors
function standardizeAnnotationColors(annotation, forceStandardColors) {
  if (!forceStandardColors) return annotation;
  
  // If no color provided, use default
  if (!annotation.color) {
    annotation.color = '#6639b6'; // Default to Amethyst
  }
  
  // Find nearest DroneDeploy color
  const nearestColor = findNearestDroneDeployColor(annotation.color);
  annotation.color = nearestColor.color;
  
  // Apply fillColor logic
  if (!annotation.fillColor) {
    // If no fillColor provided, use the matched DroneDeploy fillColor
    annotation.fillColor = nearestColor.fillColor;
  } else {
    // If fillColor provided, also standardize it
    const nearestFillColor = findNearestDroneDeployColor(annotation.fillColor);
    annotation.fillColor = nearestFillColor.fillColor;
  }
  
  return annotation;
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Match DroneDeploy's 10MB payload limit
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Match DroneDeploy's 10MB payload limit

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// DroneDeploy GraphQL endpoint
const DRONEDEPLOY_API_URL = 'https://www.dronedeploy.com/graphql';

// Utility functions for parsing different file formats
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', reject);
  });
};

const parseGeoJSON = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const geojson = JSON.parse(data);
        resolve(geojson.features || []);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
};

const parseKML = async (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', async (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(data);
        // Extract placemarks from KML structure
        const placemarks = [];
        if (result.kml && result.kml.Document && result.kml.Document[0].Placemark) {
          result.kml.Document[0].Placemark.forEach(placemark => {
            placemarks.push(placemark);
          });
        }
        resolve(placemarks);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
};

const parseKMZ = async (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const contents = await zip.loadAsync(data);
    
    // Look for .kml files in the archive
    const kmlFile = Object.keys(contents.files).find(filename => 
      filename.toLowerCase().endsWith('.kml')
    );
    
    if (!kmlFile) {
      throw new Error('No KML file found in KMZ archive');
    }
    
    const kmlContent = await contents.files[kmlFile].async('text');
    
    // Parse the KML content
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(kmlContent);
    const placemarks = [];
    if (result.kml && result.kml.Document && result.kml.Document[0].Placemark) {
      result.kml.Document[0].Placemark.forEach(placemark => {
        placemarks.push(placemark);
      });
    }
    return placemarks;
  } catch (error) {
    throw error;
  }
};

// Convert parsed data to DroneDeploy annotation format
const convertToAnnotations = (data, fileType) => {
  const annotations = [];
  
  if (fileType === 'csv') {
    data.forEach(row => {
      const annotation = {
        annotationType: row.type?.toUpperCase() || 'LOCATION',
        title: row.title || row.name || 'Untitled',
        color: row.color || '#2196f3',
        fillColor: row.fillColor || '#64b5f6',
      };
      
      // Handle different annotation types
      if (annotation.annotationType === 'LOCATION' && row.lat && row.lng) {
        // Point geometry for locations
        annotation.geometry = {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng)
        };
      } else if ((annotation.annotationType === 'AREA' || annotation.annotationType === 'LINE') && row.geometry) {
        // Parse coordinate array for areas and lines
        try {
          annotation.geometry = JSON.parse(row.geometry);
        } catch (e) {
          console.error('Failed to parse geometry for', annotation.annotationType, ':', row.geometry);
        }
      } else if (row.geometry) {
        // Fallback - try to parse any geometry
        try {
          annotation.geometry = JSON.parse(row.geometry);
        } catch (e) {
          console.error('Failed to parse geometry:', row.geometry);
        }
      }
      
      annotations.push(annotation);
    });
  } else if (fileType === 'geojson') {
    data.forEach(feature => {
      const annotation = {
        annotationType: feature.properties?.type?.toUpperCase() || 'LOCATION',
        title: feature.properties?.name || feature.properties?.title || 'Untitled',
        color: feature.properties?.color || '#2196f3',
        fillColor: feature.properties?.fillColor || '#64b5f6',
      };
      
      if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
          // Point geometry for LOCATION
          annotation.annotationType = 'LOCATION';
          annotation.geometry = {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          };
        } else if (feature.geometry.type === 'Polygon') {
          // Polygon geometry for AREA
          annotation.annotationType = 'AREA';
          annotation.geometry = feature.geometry.coordinates[0]; // Use exterior ring
        } else if (feature.geometry.type === 'LineString') {
          // Line geometry for LINE
          annotation.annotationType = 'LINE';
          annotation.geometry = feature.geometry.coordinates;
        }
      }
      
      annotations.push(annotation);
    });
  } else if (fileType === 'kml') {
    data.forEach(placemark => {
      const annotation = {
        title: placemark.name?.[0] || 'Untitled',
        color: '#2196f3',
        fillColor: '#64b5f6',
      };
      
      // Handle Point geometry (LOCATION)
      if (placemark.Point && placemark.Point[0].coordinates) {
        annotation.annotationType = 'LOCATION';
        const coords = placemark.Point[0].coordinates[0].split(',');
        annotation.geometry = {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0])
        };
      }
      // Handle Polygon geometry (AREA) 
      else if (placemark.Polygon && placemark.Polygon[0].outerBoundaryIs) {
        annotation.annotationType = 'AREA';
        const coords = placemark.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0]
          .trim().split(/\s+/)
          .map(coord => coord.split(','))
          .map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
        annotation.geometry = coords;
      }
      // Handle LineString geometry (LINE)
      else if (placemark.LineString && placemark.LineString[0].coordinates) {
        annotation.annotationType = 'LINE';
        const coords = placemark.LineString[0].coordinates[0]
          .trim().split(/\s+/)
          .map(coord => coord.split(','))
          .map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
        annotation.geometry = coords;
      }
      
      // Only add if we successfully parsed the geometry
      if (annotation.annotationType) {
        annotations.push(annotation);
      }
    });
  }
  
  return annotations;
};

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const forceStandardColors = req.body.forceStandardColors === 'true';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { originalname, path: filePath } = req.file;
    const fileExt = path.extname(originalname).toLowerCase();
    
    let parsedData;
    let fileType;
    
    // Parse file based on extension
    if (fileExt === '.csv') {
      parsedData = await parseCSV(filePath);
      fileType = 'csv';
    } else if (fileExt === '.geojson' || fileExt === '.json') {
      parsedData = await parseGeoJSON(filePath);
      fileType = 'geojson';
    } else if (fileExt === '.kml') {
      parsedData = await parseKML(filePath);
      fileType = 'kml';
    } else if (fileExt === '.kmz') {
      parsedData = await parseKMZ(filePath);
      fileType = 'kml';
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }
    
    // Convert to annotation format
    let annotations = convertToAnnotations(parsedData, fileType);
    
    // Debug: Log raw parsed data colors
    if (forceStandardColors) {
      console.log('RAW parsed data sample:', parsedData.slice(0, 3).map(row => ({ 
        title: row.title || row.name, 
        color: row.color,
        type: fileType 
      })));
      console.log('CONVERTED annotations sample (before standardization):', annotations.slice(0, 3).map(a => ({ 
        title: a.title, 
        color: a.color 
      })));
    }
    
    // Store original annotations for comparison (BEFORE any standardization)
    const originalAnnotations = JSON.parse(JSON.stringify(annotations));
    
    // Debug: Log sample original colors before standardization
    if (forceStandardColors && annotations.length > 0) {
      console.log('STORED as original annotations:', originalAnnotations.slice(0, 3).map(a => ({ title: a.title, color: a.color })));
    }
    
    // Apply color standardization if requested
    if (forceStandardColors) {
      annotations = annotations.map(annotation => standardizeAnnotationColors(annotation, true));
      console.log(`Applied DroneDeploy color standardization to ${annotations.length} annotations`);
      
      // Debug: Log sample standardized colors
      console.log('AFTER standardization - Sample colors:', annotations.slice(0, 3).map(a => ({ title: a.title, color: a.color })));
      console.log('Original annotations sample:', originalAnnotations.slice(0, 3).map(a => ({ title: a.title, color: a.color })));
    }
    
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete temp file:', err);
    });
    
    res.json({
      success: true,
      annotations,
      originalAnnotations: forceStandardColors ? originalAnnotations : null,
      count: annotations.length
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-annotations', async (req, res) => {
  try {
    const { annotations, planId, apiKey, forceStandardColors, batchInfo } = req.body;
    
    // Log batch info if provided
    if (batchInfo) {
      console.log(`Processing batch ${batchInfo.batchIndex}/${batchInfo.totalBatches} (${annotations.length} annotations)`);
    }
    
    if (!annotations || !planId || !apiKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: annotations, planId, or apiKey' 
      });
    }
    
    const results = [];
    const errors = [];
    const planIdFormatted = planId.startsWith('MapPlan:') ? planId : `MapPlan:${planId}`;
    
    // First, get the project ID for creating clickable links
    let projectId = null;
    try {
      const projectQuery = `
        query {
          mapPlan(id: "${planIdFormatted}") {
            project {
              id
            }
          }
        }
      `;

      const projectResponse = await axios.post(DRONEDEPLOY_API_URL, 
        { query: projectQuery },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      if (projectResponse.data?.data?.mapPlan?.project?.id) {
        projectId = projectResponse.data.data.mapPlan.project.id;
        console.log('Project ID retrieved:', projectId);
      }
    } catch (projectError) {
      console.warn('Could not retrieve project ID:', projectError.response?.data || projectError.message);
    }
    
    // Process annotations in batches to avoid overwhelming the API
    for (let i = 0; i < annotations.length; i++) {
      let annotation = annotations[i];
      
      // Apply color standardization if requested
      if (forceStandardColors) {
        annotation = standardizeAnnotationColors(annotation, true);
      }
      
      try {
        // Create GraphQL mutation with proper geometry formatting
        
        // Format geometry properly for GraphQL based on annotation type
        let geometryString = '';
        
        if (annotation.annotationType === 'LOCATION' && annotation.geometry.lat && annotation.geometry.lng) {
          // Point geometry for locations
          geometryString = `{lat: ${annotation.geometry.lat}, lng: ${annotation.geometry.lng}}`;
          
        } else if (annotation.annotationType === 'AREA' && Array.isArray(annotation.geometry)) {
          // Polygon geometry for areas - array of lat/lng pairs, minimum 4 points with first = last
          let coordinates = annotation.geometry;
          
        // Ensure minimum 3 points (will auto-close to 4)
        if (coordinates.length < 3) {
          throw new Error(`Area annotations require minimum 3 coordinate pairs, got ${coordinates.length}`);
        }
          
          // Ensure polygon is closed (first point = last point)
          const first = coordinates[0];
          const last = coordinates[coordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push([first[0], first[1]]); // Close the polygon
          }
          
          const coordPairs = coordinates.map(coord => `{lat: ${coord[1]}, lng: ${coord[0]}}`).join(', ');
          geometryString = `[${coordPairs}]`;
          
        } else if (annotation.annotationType === 'LINE' && Array.isArray(annotation.geometry)) {
          // Line geometry - array of lat/lng pairs, minimum 2 points
          const coordinates = annotation.geometry;
          
          // Ensure minimum 2 points
          if (coordinates.length < 2) {
            throw new Error(`Line annotations require minimum 2 coordinate pairs, got ${coordinates.length}`);
          }
          
          const coordPairs = coordinates.map(coord => `{lat: ${coord[1]}, lng: ${coord[0]}}`).join(', ');
          geometryString = `[${coordPairs}]`;
          
        } else {
          throw new Error(`Invalid geometry for annotation type ${annotation.annotationType}`);
        }
        
        const mutation = `
          mutation CreateAnnotation {
            createAnnotation(
              input: {
                planId: "${planIdFormatted}"
                annotationType: ${annotation.annotationType}
                color: "${annotation.color}"
                fillColor: "${annotation.fillColor}"
                geometry: ${geometryString}
                title: "${annotation.title.replace(/"/g, '\\"')}"
              }
            ) {
              annotation {
                id
                title
              }
            }
          }
        `;
        
        const response = await axios.post(DRONEDEPLOY_API_URL, {
          query: mutation
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.errors) {
          errors.push({
            annotation: annotation.title,
            error: response.data.errors[0].message
          });
        } else if (response.data.data && response.data.data.createAnnotation) {
          results.push({
            annotation: annotation.title,
            id: response.data.data.createAnnotation.annotation.id
          });
        } else {
          errors.push({
            annotation: annotation.title,
            error: 'Unexpected API response structure'
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors.push({
          annotation: annotation.title,
          error: error.response ? 
            `${error.response.status} ${error.response.statusText}: ${error.response.data?.errors?.message || error.response.data || 'Unknown error'}` : 
            error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      totalProcessed: annotations.length,
      successCount: results.length,
      errorCount: errors.length,
      projectId: projectId,
      mapId: planId
    });
    
  } catch (error) {
    console.error('Upload annotations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Clean up uploads directory on startup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
