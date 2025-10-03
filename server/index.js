const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { standardizeAnnotationColors } = require('./utils/colorUtils');
const { parseCSV, parseGeoJSON, parseKML, parseKMZ } = require('./utils/fileParsers');
const { convertToAnnotations } = require('./utils/annotationConverter');
const constants = require('./config/constants');

const app = express();

app.use(cors());
app.use(express.json({ limit: constants.MAX_PAYLOAD_SIZE }));
app.use(express.urlencoded({ limit: constants.MAX_PAYLOAD_SIZE, extended: true }));

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: constants.MAX_FILE_SIZE
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const forceStandardColors = req.body.forceStandardColors === 'true';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path: filePath } = req.file;
    const fileExt = path.extname(originalname).toLowerCase();

    if (!constants.SUPPORTED_FILE_EXTENSIONS.includes(fileExt)) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    let parsedData;
    let fileType;

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
    }

    let annotations = convertToAnnotations(parsedData, fileType);

    const originalAnnotations = JSON.parse(JSON.stringify(annotations));

    if (forceStandardColors) {
      annotations = annotations.map(annotation => standardizeAnnotationColors(annotation, true));
    }

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

      const projectResponse = await axios.post(constants.DRONEDEPLOY_API_URL,
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
      }
    } catch (projectError) {
      console.warn('Could not retrieve project ID:', projectError.response?.data || projectError.message);
    }

    for (let i = 0; i < annotations.length; i++) {
      let annotation = annotations[i];

      if (forceStandardColors) {
        annotation = standardizeAnnotationColors(annotation, true);
      }

      try {
        let geometryString = '';

        if (annotation.annotationType === 'LOCATION' && annotation.geometry.lat && annotation.geometry.lng) {
          geometryString = `{lat: ${annotation.geometry.lat}, lng: ${annotation.geometry.lng}}`;

        } else if (annotation.annotationType === 'AREA' && Array.isArray(annotation.geometry)) {
          let coordinates = annotation.geometry;

          if (coordinates.length < 3) {
            throw new Error(`Area annotations require minimum 3 coordinate pairs, got ${coordinates.length}`);
          }

          const first = coordinates[0];
          const last = coordinates[coordinates.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push([first[0], first[1]]);
          }

          const coordPairs = coordinates.map(coord => `{lat: ${coord[1]}, lng: ${coord[0]}}`).join(', ');
          geometryString = `[${coordPairs}]`;

        } else if (annotation.annotationType === 'LINE' && Array.isArray(annotation.geometry)) {
          const coordinates = annotation.geometry;

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

        const response = await axios.post(constants.DRONEDEPLOY_API_URL, {
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

        await new Promise(resolve => setTimeout(resolve, constants.RATE_LIMIT_DELAY));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(constants.PORT, () => {
  console.log(`Server running on http://localhost:${constants.PORT}`);
});

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
