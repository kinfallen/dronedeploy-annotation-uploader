const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

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

// Upload and parse CSV file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const filePath = req.file.path;

  // Parse CSV file
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => {
      // Process each row of CSV data
      const annotation = {
        type: data.type || 'LOCATION',
        title: data.title || data.name || 'Untitled',
        lat: parseFloat(data.lat || data.latitude),
        lng: parseFloat(data.lng || data.longitude),
        color: data.color || '#2196f3',
        fillColor: data.fillColor || data.fill_color || '#64b5f6',
        geometry: data.geometry ? JSON.parse(data.geometry) : null
      };

      // Validate required fields
      if (annotation.type === 'LOCATION' && (!annotation.lat || !annotation.lng)) {
        console.warn('Skipping invalid location annotation:', annotation);
        return;
      }

      if ((annotation.type === 'AREA' || annotation.type === 'LINE') && !annotation.geometry) {
        console.warn('Skipping invalid geometry annotation:', annotation);
        return;
      }

      results.push(annotation);
    })
    .on('end', () => {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      
      res.json({
        success: true,
        message: `Successfully parsed ${results.length} annotations`,
        data: results
      });
    })
    .on('error', (error) => {
      console.error('CSV parsing error:', error);
      fs.unlinkSync(filePath);
      res.status(500).json({ error: 'Failed to parse CSV file' });
    });
});

// Mock DroneDeploy API endpoints (replace with actual API calls)
app.post('/api/dronedeploy/upload', async (req, res) => {
  const { annotations, apiKey, projectId } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!annotations || !Array.isArray(annotations)) {
    return res.status(400).json({ error: 'Annotations array is required' });
  }

  try {
    // Simulate upload process
    const results = annotations.map((annotation, index) => ({
      id: `annotation_${Date.now()}_${index}`,
      title: annotation.title,
      status: 'success',
      message: 'Successfully uploaded'
    }));

    res.json({
      success: true,
      message: `Successfully uploaded ${results.length} annotations`,
      results: results
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload annotations' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/upload - Upload CSV file`);
  console.log(`   POST /api/dronedeploy/upload - Upload to DroneDeploy`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

