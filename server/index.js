const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseFile } = require('./utils/fileParsers');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'DroneDeploy Annotation Uploader API is running' });
});

// Upload and parse annotation files
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  try {
    console.log(`\n=== PARSING FILE ===`);
    console.log('File:', originalName);
    console.log('Path:', filePath);
    
    // Use the new file parsers
    const annotations = await parseFile(filePath, originalName);
    
    console.log(`Successfully parsed ${annotations.length} annotations`);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `Successfully parsed ${annotations.length} annotations from ${originalName}`,
      data: annotations
    });
    
  } catch (error) {
    console.error('Error parsing file:', error.message);
    
    // Clean up uploaded file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(400).json({ 
      error: 'Failed to parse file', 
      details: error.message 
    });
  }
});

// DroneDeploy upload endpoint - creates annotations using GraphQL API
app.post('/api/dronedeploy/upload', async (req, res) => {
  const { annotations, apiKey, planId } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!annotations || !Array.isArray(annotations)) {
    return res.status(400).json({ error: 'Annotations array is required' });
  }

  if (!planId) {
    return res.status(400).json({ error: 'Plan ID is required' });
  }

  try {
    // Construct the proper MapPlan ID format for GraphQL
    const mapPlanId = planId.startsWith('MapPlan:') ? planId : `MapPlan:${planId}`;
    
    console.log('\n=== RECEIVED REQUEST ===');
    console.log('Plan ID:', mapPlanId);
    console.log('Number of annotations:', annotations.length);
    console.log('First annotation (full object):');
    console.log(JSON.stringify(annotations[0], null, 2));
    if (annotations.length > 1) {
      console.log('Second annotation (full object):');
      console.log(JSON.stringify(annotations[1], null, 2));
    }
    console.log('========================\n');
    
    const results = [];
    const errors = [];

    // Process annotations in batches to avoid overwhelming the API
    for (const annotation of annotations) {
      try {
        // Map annotation types to DroneDeploy's expected enum values
        let annotationType = 'LOCATION'; // Default to LOCATION
        
        if (annotation.annotationType) {
          switch (annotation.annotationType.toLowerCase()) {
            case 'point':
            case 'location':
              annotationType = 'LOCATION';
              break;
            case 'polygon':
            case 'area':
              annotationType = 'AREA';
              break;
            case 'linestring':
            case 'line':
              annotationType = 'LINE';
              break;
            default:
              annotationType = 'LOCATION';
          }
        } else if (annotation.geometry) {
          // Infer type from geometry
          switch (annotation.geometry.type?.toLowerCase()) {
            case 'point':
              annotationType = 'LOCATION';
              break;
            case 'polygon':
              annotationType = 'AREA';
              break;
            case 'linestring':
              annotationType = 'LINE';
              break;
            default:
              annotationType = 'LOCATION';
          }
        }

        console.log(`Processing annotation: ${annotation.title}, Type: ${annotationType}`);
        console.log(`Raw geometry:`, JSON.stringify(annotation.geometry));
        console.log(`Geometry type:`, annotation.geometry?.type);
        console.log(`Geometry coordinates:`, JSON.stringify(annotation.geometry?.coordinates));

        // Convert geometry to DroneDeploy's expected format
        let droneDeployGeometry = null;
        
        if (annotation.geometry) {
          const geometryType = annotation.geometry.type?.toLowerCase();
          console.log(`Geometry type (normalized):`, geometryType);
          
          switch (geometryType) {
            case 'point':
              // For points, DroneDeploy expects array containing single LocationInput
              if (annotation.geometry.coordinates && annotation.geometry.coordinates.length >= 2) {
                const lat = parseFloat(annotation.geometry.coordinates[1]); // Latitude is second
                const lng = parseFloat(annotation.geometry.coordinates[0]); // Longitude is first
                
                // Ensure we have valid numbers
                if (isNaN(lat) || isNaN(lng)) {
                  console.error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
                  break;
                }
                
                droneDeployGeometry = [{ lat, lng }]; // Array with single object for LOCATION
                console.log(`🔍 LOCATION Point converted to:`, droneDeployGeometry);
                console.log(`🔍 LOCATION Point type check:`, typeof droneDeployGeometry, Array.isArray(droneDeployGeometry));
              } else {
                console.log(`Invalid point coordinates:`, annotation.geometry.coordinates);
              }
              break;
            case 'polygon':
              // For polygons, DroneDeploy expects array of LocationInput objects
              if (annotation.geometry.coordinates && annotation.geometry.coordinates[0]) {
                const outerRing = annotation.geometry.coordinates[0];
                console.log(`Polygon outer ring:`, outerRing);
                // Convert each coordinate to LocationInput format
                droneDeployGeometry = outerRing.map(coord => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    return {
                      lat: coord[1],
                      lng: coord[0]
                    };
                  }
                  return null;
                }).filter(coord => coord !== null);
                console.log(`Polygon converted to LocationInput array:`, droneDeployGeometry);
              } else {
                console.log(`Invalid polygon coordinates:`, annotation.geometry.coordinates);
              }
              break;
            case 'linestring':
              // For lines, DroneDeploy expects array of LocationInput objects
              if (annotation.geometry.coordinates && Array.isArray(annotation.geometry.coordinates)) {
                const coords = annotation.geometry.coordinates;
                console.log(`Line coordinates:`, coords);
                // Convert each coordinate to LocationInput format
                droneDeployGeometry = coords.map(coord => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    return {
                      lat: coord[1],
                      lng: coord[0]
                    };
                  }
                  return null;
                }).filter(coord => coord !== null);
                console.log(`Line converted to LocationInput array:`, droneDeployGeometry);
              } else {
                console.log(`Invalid line coordinates:`, annotation.geometry.coordinates);
              }
              break;
            default:
              console.log(`Unknown geometry type or fallback processing:`, geometryType, annotation.geometry);
              // Fallback: if it's still an array, try to convert it
              if (Array.isArray(annotation.geometry) && annotation.geometry.length >= 2) {
                droneDeployGeometry = {
                  lat: annotation.geometry[1],
                  lng: annotation.geometry[0]
                };
                console.log(`Array converted to:`, droneDeployGeometry);
              } else if (annotation.geometry.lat !== undefined && annotation.geometry.lng !== undefined) {
                // Already in correct format
                droneDeployGeometry = annotation.geometry;
                console.log(`Already in correct format:`, droneDeployGeometry);
              } else {
                console.warn('Unknown geometry format:', annotation.geometry);
                droneDeployGeometry = null;
              }
          }
        } else {
          console.log(`No geometry found for annotation:`, annotation.title);
        }

        console.log(`Final converted geometry:`, JSON.stringify(droneDeployGeometry));
        
        // Validate geometry was converted properly
        if (!droneDeployGeometry) {
          console.error(`❌ Failed to convert geometry for ${annotation.title}`);
          errors.push({
            annotation: annotation.title,
            error: 'Failed to convert geometry to DroneDeploy format'
          });
          continue;
        }
        
        // Additional validation for LOCATION type
        if (annotationType === 'LOCATION') {
          if (!Array.isArray(droneDeployGeometry) || 
              droneDeployGeometry.length !== 1 ||
              typeof droneDeployGeometry[0].lat !== 'number' || 
              typeof droneDeployGeometry[0].lng !== 'number') {
            console.error(`❌ Invalid LOCATION geometry format for ${annotation.title}:`, droneDeployGeometry);
            errors.push({
              annotation: annotation.title,
              error: 'Invalid LOCATION geometry format - must be [{lat: number, lng: number}]'
            });
            continue;
          }
        }

        // Additional validation - ensure we have valid geometry
        if (!droneDeployGeometry) {
          console.log(`Geometry validation failed: null geometry`);
          errors.push({
            annotation: annotation.title || 'Untitled',
            error: 'Invalid or missing geometry data'
          });
          continue;
        }
        
        // Validate geometry based on type
        let geometryValid = false;
        if (Array.isArray(droneDeployGeometry)) {
          // For all types - array of LocationInput objects
          geometryValid = droneDeployGeometry.length > 0 && 
            droneDeployGeometry.every(coord => 
              coord && typeof coord.lat === 'number' && typeof coord.lng === 'number'
            );
        }
        
        if (!geometryValid) {
          console.log(`Geometry validation failed:`, droneDeployGeometry);
          errors.push({
            annotation: annotation.title || 'Untitled',
            error: 'Invalid or missing geometry data'
          });
          continue;
        }

        // Build the GraphQL mutation for creating an annotation
        const createAnnotationMutation = {
          query: `
            mutation CreateAnnotation($input: CreateAnnotationInput!) {
              createAnnotation(input: $input) {
                annotation {
                  id
                  title
                  annotationType
                }
              }
            }
          `,
          variables: {
            input: {
              planId: mapPlanId,
              title: annotation.title || 'Untitled Annotation',
              annotationType: annotationType,
              geometry: droneDeployGeometry,
              color: annotation.color || '#FF0000',
              fillColor: annotation.fillColor || annotation.color || '#FF0000'
            }
          }
        };

        console.log('\n=== GRAPHQL MUTATION ===');
        console.log('Query:', createAnnotationMutation.query);
        console.log('\n=== VARIABLES ===');
        console.log(JSON.stringify(createAnnotationMutation.variables, null, 2));
        console.log('\n=== FULL REQUEST BODY ===');
        console.log(JSON.stringify(createAnnotationMutation, null, 2));
        console.log('========================\n');

        console.log(`🚨 FINAL CHECK - Annotation: ${annotation.title}, Type: ${annotationType}`);
        console.log(`🚨 FINAL GEOMETRY:`, JSON.stringify(droneDeployGeometry));
        console.log(`🚨 FINAL IS ARRAY?:`, Array.isArray(droneDeployGeometry));

        // Make request to DroneDeploy's GraphQL endpoint
        const response = await fetch('https://www.dronedeploy.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(createAnnotationMutation)
        });
        
        const result = await response.json();
        
        console.log('\n=== API RESPONSE ===');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        console.log('==================\n');
        
        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          console.error('First error object:', JSON.stringify(result.errors[0], null, 2));
          const errorMessage = result.errors[0]?.message || JSON.stringify(result.errors[0]) || 'Unknown GraphQL error';
          errors.push({
            annotation: annotation.title || 'Untitled',
            error: errorMessage
          });
          continue;
        }
        
        if (!result.data || !result.data.createAnnotation) {
          errors.push({
            annotation: annotation.title || 'Untitled',
            error: 'Invalid response from DroneDeploy API'
          });
          continue;
        }
        
        const createResult = result.data.createAnnotation;
        
        if (createResult && createResult.annotation) {
          results.push({
            id: createResult.annotation.id, // Real DroneDeploy annotation ID
            annotation: annotation.title || 'Untitled',
            title: annotation.title || 'Untitled',
            annotationType: createResult.annotation.annotationType,
            status: 'success',
            message: 'Successfully uploaded'
          });
        } else {
          errors.push({
            annotation: annotation.title || 'Untitled',
            error: 'No annotation returned from API'
          });
        }
        
        // Small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Error creating annotation:', error);
        errors.push({
          annotation: annotation.title || 'Untitled',
          error: error.message
        });
      }
    }

    // Get project ID from map details
    let projectId = null;
    if (results.length > 0) {
      try {
        // Fetch map details to get project ID
        const mapDetailsQuery = {
          query: `{
            mapPlan(id: "${mapPlanId}") {
              project {
                id
              }
            }
          }`
        };

        const mapResponse = await fetch('https://www.dronedeploy.com/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(mapDetailsQuery)
        });
        
        const mapResult = await mapResponse.json();
        if (mapResult.data && mapResult.data.mapPlan && mapResult.data.mapPlan.project) {
          projectId = mapResult.data.mapPlan.project.id;
        }
      } catch (error) {
        console.warn('Could not fetch project ID:', error.message);
        projectId = null;
      }
    }

    res.json({
      success: true,
      message: `Processed ${annotations.length} annotations: ${results.length} successful, ${errors.length} failed`,
      results: results,
      errors: errors,
      projectId: projectId,
      mapId: mapPlanId
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload annotations' });
  }
});

// Get map details endpoint
app.get('/api/dronedeploy/map/:mapId', async (req, res) => {
  const { mapId } = req.params;
  const { apiKey } = req.query;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!mapId) {
    return res.status(400).json({ error: 'Map ID is required' });
  }

  try {
    // Construct the proper MapPlan ID format for GraphQL
    const mapPlanId = mapId.startsWith('MapPlan:') ? mapId : `MapPlan:${mapId}`;
    
    // GraphQL query to get map details
    const graphqlQuery = {
      query: `{
        mapPlan(id: "${mapPlanId}") {
          id
          name
          dateCreation
          sortDate
          project {
            id
          }
        }
      }`
    };

    // Make request to DroneDeploy's GraphQL endpoint
    const response = await fetch('https://www.dronedeploy.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(graphqlQuery)
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error(result.errors[0].message);
    }
    
    if (!result.data || !result.data.mapPlan) {
      throw new Error('Map not found or access denied');
    }
    
    // Process the response to determine the best date to use
    const mapPlan = result.data.mapPlan;
    const captureDate = mapPlan.sortDate || mapPlan.dateCreation; // Use sortDate if available, otherwise dateCreation
    
    res.json({
      success: true,
      data: {
        id: mapPlan.id,
        name: mapPlan.name,
        dateImagesCaptured: captureDate, // Keep this field name for client compatibility
        projectId: mapPlan.project?.id // Add project ID for link construction
      }
    });
  } catch (error) {
    console.error('Map lookup error:', error);
    res.status(500).json({ error: 'Failed to fetch map details' });
  }
});

// Undo upload endpoint - delete annotations using GraphQL mutation
app.post('/api/dronedeploy/undo-upload', async (req, res) => {
  const { annotationIds, planId, apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!annotationIds || !Array.isArray(annotationIds) || annotationIds.length === 0) {
    return res.status(400).json({ error: 'Annotation IDs array is required' });
  }

  if (!planId) {
    return res.status(400).json({ error: 'Plan ID is required' });
  }

  try {
    // Construct the proper MapPlan ID format for GraphQL
    const mapPlanId = planId.startsWith('MapPlan:') ? planId : `MapPlan:${planId}`;
    
    // GraphQL mutation to delete annotations
    const graphqlMutation = {
      query: `
        mutation UndoAnnotations {
          deleteAnnotations(input: {
            annotationIds: [${annotationIds.map(id => `"${id}"`).join(', ')}],
            planId: "${mapPlanId}"
          }) {
            annotationIds
          }
        }
      `
    };

    console.log('Executing undo mutation for', annotationIds.length, 'annotations on map', mapPlanId);

    // Make request to DroneDeploy's GraphQL endpoint
    const response = await fetch('https://www.dronedeploy.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(graphqlMutation)
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors during undo:', result.errors);
      throw new Error(result.errors[0].message);
    }
    
    if (!result.data || !result.data.deleteAnnotations) {
      throw new Error('Invalid response from DroneDeploy API');
    }
    
    const deleteResult = result.data.deleteAnnotations;
    const deletedIds = deleteResult.annotationIds || [];
    
    console.log('Successfully deleted', deletedIds.length, 'annotations');
    
    res.json({
      success: true,
      message: `Successfully deleted ${deletedIds.length} annotation${deletedIds.length === 1 ? '' : 's'}`,
      deletedCount: deletedIds.length
    });
  } catch (error) {
    console.error('Undo upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete annotations' 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/upload - Upload CSV file`);
  console.log(`   POST /api/dronedeploy/upload - Upload to DroneDeploy`);
  console.log(`   GET  /api/dronedeploy/map/:mapId - Get map details`);
  console.log(`   POST /api/dronedeploy/undo-upload - Undo annotation upload`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

