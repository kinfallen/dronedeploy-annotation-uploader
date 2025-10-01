import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  CheckCircle,
  Error as ErrorIcon,
  LocationOn,
  CropFree,
  Timeline,
  Palette,
  CompareArrows
} from '@mui/icons-material';
import axios from 'axios';
import MapViewer from './MapViewer';

const FileUpload = ({ onFileUpload, onNext, config }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [showUploadArea, setShowUploadArea] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [forceStandardColors, setForceStandardColors] = useState(true); // Default ON
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setSelectedFiles(acceptedFiles);
    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (forceStandardColors) {
        formData.append('forceStandardColors', 'true');
      }

      // Simulate progress for large files
      setUploadProgress(20);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(progress, 80)); // Leave 20% for processing
        }
      });

      setUploadProgress(90);
      
      if (response.data.success) {
        setAnnotations(response.data.annotations);
        setShowUploadArea(false); // Collapse upload area after successful upload
        setUploadProgress(100);
        
        // Debug: Log what we're receiving from server
        console.log('FileUpload received from server:', {
          annotations: response.data.annotations?.slice(0, 3),
          originalAnnotations: response.data.originalAnnotations?.slice(0, 3),
          forceStandardColorsFromServer: response.data.forceStandardColors,
          forceStandardColorsFromToggle: forceStandardColors
        });

        // Pass both annotations and color standardization setting
        onFileUpload({
          annotations: response.data.annotations,
          forceStandardColors,
          originalAnnotations: response.data.originalAnnotations || response.data.annotations
        });
        
        setUploadStatus({
          type: 'success',
          message: `Successfully parsed ${response.data.count} annotations from ${file.name}`
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: response.data.error || 'Failed to parse file'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to upload file'
      });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json', '.geojson'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
      'application/vnd.google-earth.kmz': ['.kmz']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleProceed = () => {
    onFileUpload(annotations);
  };

  const getSupportedFormats = () => [
    { name: 'CSV', description: 'Comma-separated values with coordinates' },
    { name: 'GeoJSON', description: 'Geographic JSON format' },
    { name: 'KML', description: 'Keyhole Markup Language' },
    { name: 'KMZ', description: 'Compressed KML file' }
  ];

  const getAnnotationIcon = (type) => {
    switch (type) {
      case 'LOCATION': return <LocationOn fontSize="small" />;
      case 'AREA': return <CropFree fontSize="small" />;
      case 'LINE': return <Timeline fontSize="small" />;
      default: return <LocationOn fontSize="small" />;
    }
  };

  const getAnnotationTypeColor = (type) => {
    switch (type) {
      case 'LOCATION': return 'primary';
      case 'AREA': return 'secondary';
      case 'LINE': return 'info';
      default: return 'default';
    }
  };

  const formatGeometry = (annotation) => {
    if (annotation.annotationType === 'LOCATION') {
      return `${annotation.geometry.lat?.toFixed(4)}, ${annotation.geometry.lng?.toFixed(4)}`;
    } else if (annotation.geometry && Array.isArray(annotation.geometry)) {
      return `${annotation.geometry.length} points`;
    }
    return 'Complex geometry';
  };

  const handleShowUploadArea = () => {
    setShowUploadArea(true);
    setSelectedFiles([]);
    setAnnotations([]);
    setUploadStatus(null);
    setUploadProgress(0);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Step 1: Upload Your Annotation File
      </Typography>
      
      {/* Show progress bar when uploading */}
      {uploading && uploadProgress > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {uploadProgress < 80 ? 'Uploading file...' : 
             uploadProgress < 100 ? 'Processing annotations...' : 
             'Complete!'}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: uploadProgress === 100 ? '#4caf50' : '#3F48E9'
              }
            }} 
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {uploadProgress}% complete
          </Typography>
        </Box>
      )}

      {/* Show compact summary if annotations are loaded but will move to step 2 */}
      {annotations.length > 0 && !uploading && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="success" sx={{ 
            borderRadius: 2,
            backgroundColor: 'rgba(76, 175, 80, 0.15)',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            color: '#81c784'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                <strong>Ready!</strong> Found {annotations.length} annotations. 
                {forceStandardColors ? ' Colors will be standardized to DroneDeploy palette.' : ' Using original colors.'}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleShowUploadArea}
                sx={{ textTransform: 'none', ml: 2 }}
              >
                Upload Different File
              </Button>
            </Box>
          </Alert>
        </Box>
      )}
      
      {/* Color Standardization Toggle - Outside drag and drop area */}
      <Box sx={{ 
        mb: 3,
        p: 2, 
        border: '1px solid rgba(63, 72, 233, 0.2)',
        borderRadius: 2,
        backgroundColor: 'rgba(63, 72, 233, 0.05)'
      }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={forceStandardColors}
              onChange={(e) => setForceStandardColors(e.target.checked)}
              sx={{
                color: 'primary.main',
                '&.Mui-checked': { color: 'primary.main' }
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette fontSize="small" color="primary" />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Standardize colors to DroneDeploy palette
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maps annotation colors to DroneDeploy's supported colors. You'll see both original and standardized colors in the preview.
                </Typography>
              </Box>
            </Box>
          }
          sx={{ alignItems: 'flex-start', margin: 0 }}
        />
      </Box>

      {/* Upload area - show always when no annotations, or when explicitly requested */}
      {(showUploadArea || annotations.length === 0) && (
        <>
        <Paper
        {...getRootProps()}
        elevation={isDragActive ? 3 : 1}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 3,
          p: 2,
          mb: 3,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive 
            ? 'linear-gradient(135deg, rgba(63, 72, 233, 0.2) 0%, rgba(250, 175, 51, 0.1) 100%)'
            : 'rgba(26, 26, 26, 0.9)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            background: 'linear-gradient(135deg, rgba(63, 72, 233, 0.15) 0%, rgba(250, 175, 51, 0.05) 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(63, 72, 233, 0.25)',
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to select a file
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }}>
          Choose File
        </Button>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ flexShrink: 0 }}>
              Supported formats:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {getSupportedFormats().map((format) => (
                <Box
                  key={format.name}
                  sx={{ 
                    px: 2,
                    py: 0.5,
                    backgroundColor: 'rgba(250, 175, 51, 0.08)',
                    color: '#FAAF33',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    display: 'inline-block',
                  }}
                >
                  {format.name}
                </Box>
              ))}
            </Box>
          </Box>
      </Paper>
        </>
      )}

      {selectedFiles.length > 0 && (showUploadArea || annotations.length === 0) && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected file:
          </Typography>
          <List dense>
            {acceptedFiles.map(file => (
              <ListItem key={file.path}>
                <ListItemIcon>
                  <InsertDriveFile />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024).toFixed(1)} KB`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Processing file...
          </Typography>
        </Box>
      )}

      {uploadStatus && (
        <Alert 
          severity={uploadStatus.type} 
          sx={{ mb: 2 }}
          icon={uploadStatus.type === 'success' ? <CheckCircle /> : <ErrorIcon />}
        >
          {uploadStatus.message}
        </Alert>
      )}


      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleProceed}
          disabled={annotations.length === 0}
          startIcon={<CheckCircle />}
        >
          Proceed with {annotations.length} annotations
        </Button>
      </Box>
    </Box>
  );
};

export default FileUpload;
