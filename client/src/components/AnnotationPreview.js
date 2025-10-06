import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ArrowBack,
  Upload,
  LocationOn,
  Polyline,
  CropFree,
  Preview,
  Edit,
  Save,
  Cancel,
  CompareArrows,
  Visibility,
  VisibilityOff,
  Palette,
  SwapHoriz
} from '@mui/icons-material';
import axios from 'axios';
import MapViewer from './MapViewer';

const AnnotationPreview = ({ annotations = [], config = {}, onUpload, onBack }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchInfo, setBatchInfo] = useState({ current: 0, total: 0, totalAnnotations: 0 });
  const [cancelRequested, setCancelRequested] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [editingAnnotations, setEditingAnnotations] = useState(Array.isArray(annotations) ? [...annotations] : []);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [tempEdit, setTempEdit] = useState({ title: '', color: '' });
  const [showOriginalColors, setShowOriginalColors] = useState(config.forceStandardColors || false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [colorMappings, setColorMappings] = useState({});

  // Update editing annotations when annotations prop changes
  useEffect(() => {
    if (Array.isArray(annotations)) {
      setEditingAnnotations([...annotations]);
    }
  }, [annotations]);

  // Extract unique colors and create initial mappings
  useEffect(() => {
    if (Array.isArray(annotations) && config.originalAnnotations && config.originalAnnotations.length > 0) {
      const uniqueColors = {};
      
      annotations.forEach((annotation, index) => {
        const originalColor = config.originalAnnotations[index]?.color;
        const standardizedColor = annotation.color;
        
        if (originalColor && !uniqueColors[originalColor]) {
          uniqueColors[originalColor] = standardizedColor;
        }
      });
      
      setColorMappings(uniqueColors);
    }
  }, [annotations, config.originalAnnotations]);

  // Helper function to ensure color has # prefix for CSS display
  const formatColorForDisplay = (color) => {
    if (!color) return '#cccccc';
    if (color.startsWith('#')) return color;
    // Handle colors like "FF0000" by adding # prefix
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
      return `#${color}`;
    }
    return color;
  };

  // Debug logging for color comparison
  // Update showOriginalColors when config changes
  useEffect(() => {
    if (config.forceStandardColors !== undefined) {
      setShowOriginalColors(config.forceStandardColors);
    }
  }, [config.forceStandardColors]);

  const getAnnotationIcon = (type) => {
    switch (type) {
      case 'LOCATION':
        return <LocationOn color="primary" />;
      case 'LINE':
        return <Polyline color="primary" />;
      case 'AREA':
        return <CropFree color="primary" />;
      default:
        return <LocationOn color="primary" />;
    }
  };

  const getAnnotationTypeColor = (type) => {
    switch (type) {
      case 'LOCATION':
        return 'primary';
      case 'LINE':
        return 'secondary';
      case 'AREA':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatGeometry = (geometry) => {
    if (geometry.lat && geometry.lng) {
      return `${geometry.lat.toFixed(6)}, ${geometry.lng.toFixed(6)}`;
    }
    if (Array.isArray(geometry)) {
      return `${geometry.length} coordinates`;
    }
    return 'Complex geometry';
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setTempEdit({
      title: editingAnnotations[index].title,
      color: editingAnnotations[index].color
    });
  };

  const saveEdit = () => {
    const updatedAnnotations = [...editingAnnotations];
    updatedAnnotations[editingIndex] = {
      ...updatedAnnotations[editingIndex],
      title: tempEdit.title,
      color: tempEdit.color
    };
    setEditingAnnotations(updatedAnnotations);
    setEditingIndex(-1);
    setTempEdit({ title: '', color: '' });
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setTempEdit({ title: '', color: '' });
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const totalAnnotations = editingAnnotations.length;
      
      // Starting upload process
      
      // Create batches with safer size for DroneDeploy API processing time
      const maxBatchSize = 50; // Very conservative: ~50 annotations * 0.3s = 15s processing time
      const batches = [];
      
      for (let i = 0; i < totalAnnotations; i += maxBatchSize) {
        const batch = editingAnnotations.slice(i, i + maxBatchSize);
        batches.push(batch);
      }
      
      // Created batches for upload
      
      // Set initial batch info
      setBatchInfo({ current: 0, total: batches.length, totalAnnotations });
      
      const allResults = [];
      const allErrors = [];
      
      // Upload each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check for cancellation
        if (cancelRequested) {
          allErrors.push({ error: 'Upload cancelled by user', cancelled: true });
          break;
        }

        const batch = batches[batchIndex];
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
        
        // Estimate payload size (rough calculation)
        const estimatedPayloadSize = JSON.stringify({
          annotations: batch,
          planId: config.planId,
          apiKey: 'xxx' // Don't log real API key
        }).length;
        
        // Update progress info
        const newBatchInfo = { current: batchIndex + 1, total: batches.length, totalAnnotations };
        setBatchInfo(newBatchInfo);
        setUploadProgress(progress);
        
        // Force UI update with small delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          
          const requestPayload = {
            annotations: batch,
            planId: config.planId,
            apiKey: config.apiKey,
            batchInfo: {
              batchIndex: batchIndex + 1,
              totalBatches: batches.length,
              totalAnnotations,
              payloadSizeKB: Math.round(estimatedPayloadSize/1024)
            }
          };
          
          const response = await axios.post('/api/upload-annotations', requestPayload, {
            timeout: 120000, // 2 minute timeout for DroneDeploy processing
          });
          
          if (response.data.results) {
            allResults.push(...response.data.results);
          }
          if (response.data.errors) {
            allErrors.push(...response.data.errors);
          }
          
        } catch (batchError) {
          console.error(`\n💥 === BATCH ${batchIndex + 1} FAILED ===`);
          console.error(`❌ Error type:`, batchError.name);
          console.error(`❌ Error message:`, batchError.message);
          console.error(`❌ Response status:`, batchError.response?.status);
          console.error(`❌ Response data:`, batchError.response?.data);
          console.error(`❌ Full error object:`, batchError);
          
          allErrors.push({
            error: `Batch ${batchIndex + 1} failed: ${batchError.message}`,
            batch: batchIndex + 1,
            status: batchError.response?.status,
            details: batchError.response?.data
          });
          
          // Continue with next batch even if this one fails
        }
        
        // Rate limiting: Add delay between batches to respect API limits
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced to 100ms between batches
        }
      }
      
      if (!cancelRequested) {
        setUploadProgress(100);
        setBatchInfo(prev => ({ ...prev, current: prev.total }));
      }
      
      // Combine all results
      const combinedResults = {
        success: true,
        results: allResults,
        errors: allErrors,
        totalProcessed: totalAnnotations,
        successCount: allResults.length,
        errorCount: allErrors.length,
        projectId: allResults[0]?.projectId,
        mapId: config.planId
      };

      setTimeout(() => {
        onUpload(combinedResults);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setUploadProgress(0);
      setCancelRequested(false);
      
      // Show user-friendly error message
      alert(`Upload failed: ${error.response?.status === 413 ? 'File too large. Try with fewer annotations.' : error.message}`);
    }
  };

  const handleCancelUpload = () => {
    setCancelRequested(true);
    setUploading(false);
    setUploadProgress(0);
    setBatchInfo({ current: 0, total: 0, totalAnnotations: 0 });
  };

  const handlePreview = (annotation) => {
    setSelectedAnnotation(annotation);
    setPreviewOpen(true);
  };

  const getStats = () => {
    const stats = {
      LOCATION: 0,
      LINE: 0,
      AREA: 0
    };
    
    if (Array.isArray(editingAnnotations)) {
      editingAnnotations.forEach(annotation => {
        if (annotation && annotation.annotationType) {
          stats[annotation.annotationType] = (stats[annotation.annotationType] || 0) + 1;
        }
      });
    }
    
    return stats;
  };

  const stats = getStats();

  // DroneDeploy color palette options
  const droneDeployColors = [
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

  const handleColorMappingChange = (originalColor, newDdColor) => {
    setColorMappings(prev => ({
      ...prev,
      [originalColor]: newDdColor
    }));
    
    // Apply the mapping to all annotations with this color
    setEditingAnnotations(prev => prev.map(annotation => {
      const originalAnnotationColor = config.originalAnnotations?.[annotations.indexOf(annotation)]?.color;
      if (originalAnnotationColor === originalColor) {
        return { ...annotation, color: newDdColor };
      }
      return annotation;
    }));
  };

  // Don't render if no annotations
  if (!Array.isArray(annotations) || annotations.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Step 2: Preview Annotations
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body1">
            No annotations to preview. Please go back and upload a file.
          </Typography>
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
        </Box>
      </Box>
    );
  }

  // Color mapper configuration
  const showColorMapper = config.originalAnnotations && config.forceStandardColors;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Step 2: Preview Annotations
      </Typography>
      
      <Paper elevation={2} sx={{ 
        p: 4, 
        mb: 4,
        borderRadius: 3,
        background: 'rgba(26, 26, 26, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {editingAnnotations.length} annotations ready to upload
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {stats.LOCATION > 0 && (
              <Chip 
                icon={<LocationOn />}
                label={`${stats.LOCATION} Locations`} 
                color="primary" 
                variant="outlined"
                size="small"
              />
            )}
            {stats.LINE > 0 && (
              <Chip 
                icon={<Polyline />}
                label={`${stats.LINE} Lines`} 
                color="secondary" 
                variant="outlined"
                size="small"
              />
            )}
            {stats.AREA > 0 && (
              <Chip 
                icon={<CropFree />}
                label={`${stats.AREA} Areas`} 
                sx={{
                  backgroundColor: 'rgba(250, 175, 51, 0.15)',
                  color: '#FAAF33',
                  border: '1px solid rgba(250, 175, 51, 0.3)',
                }}
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>

        <Alert severity="info" sx={{ 
          mb: 4, 
          borderRadius: 2,
          border: '1px solid rgba(63, 72, 233, 0.3)',
          backgroundColor: 'rgba(63, 72, 233, 0.15)',
          color: '#6B73ED'
        }}>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
              Target Destination
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              <strong>Map ID:</strong> {config.planId}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              All annotations will be uploaded to your DroneDeploy map with the specified ID.
            </Typography>
          </Box>
        </Alert>

        {!uploading && <MapViewer annotations={editingAnnotations} height={500} />}

      {/* Color Mapper Section */}
      {showColorMapper && (
          <Paper 
            elevation={2}
            sx={{ 
              mt: 4,
              mb: 3,
              borderRadius: 3,
              overflow: 'hidden',
              background: 'rgba(26, 26, 26, 0.98)',
              border: '1px solid rgba(250, 175, 51, 0.3)',
            }}
          >
            <Box sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, rgba(250, 175, 51, 0.15) 0%, rgba(63, 72, 233, 0.05) 100%)',
              borderBottom: '1px solid rgba(250, 175, 51, 0.2)'
            }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Palette color="primary" />
                Color Mapper
                <Chip 
                  label={`${Object.keys(colorMappings).length || 'Loading'} unique colors`}
                  sx={{ 
                    backgroundColor: '#FAAF33',
                    color: 'black',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customize how your original colors map to DroneDeploy colors. Changes apply to all annotations with that color.
              </Typography>
            </Box>

            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Original Color</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SwapHoriz fontSize="small" />
                        Maps To
                      </Box>
                    </TableCell>
                    <TableCell>DroneDeploy Color</TableCell>
                    <TableCell>Annotations Using This Color</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.keys(colorMappings).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Analyzing colors... Please wait.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.entries(colorMappings).map(([originalColor, ddColor]) => {
                    const annotationCount = annotations.filter((_, index) => 
                      config.originalAnnotations[index]?.color === originalColor
                    ).length;
                    
                    return (
                      <TableRow key={originalColor}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                backgroundColor: formatColorForDisplay(originalColor),
                                border: '1px solid #ccc',
                                borderRadius: '50%'
                              }}
                            />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                              {originalColor}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <SwapHoriz color="primary" />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 150 }}>
                            <Select
                              value={ddColor}
                              onChange={(e) => handleColorMappingChange(originalColor, e.target.value)}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2
                                }
                              }}
                            >
                              {droneDeployColors.map((color) => (
                                <MenuItem key={color.color} value={color.color}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box
                                      sx={{
                                        width: 16,
                                        height: 16,
                                        backgroundColor: color.color,
                                        border: '1px solid #ccc',
                                        borderRadius: '50%'
                                      }}
                                    />
                                    <Typography variant="body2">{color.name}</Typography>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', ml: 1 }}>
                                      {color.color}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${annotationCount} annotations`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Paper 
          elevation={2}
          sx={{ 
            mt: 4,
        borderRadius: 3,
        overflow: 'hidden',
        background: 'rgba(26, 26, 26, 0.98)',
        border: '1px solid rgba(63, 72, 233, 0.2)',
          }}
        >
          <Box sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, rgba(63, 72, 233, 0.15) 0%, rgba(250, 175, 51, 0.1) 100%)',
            borderBottom: '1px solid rgba(63, 72, 233, 0.2)'
          }}>
            <Typography variant="h5" sx={{ 
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: 'pulse 2s infinite'
              }} />
              Annotation Details
                <Box sx={{
                  ml: 1,
                  px: 1.5,
                  py: 0.5,
                  backgroundColor: '#FAAF33',
                  borderRadius: 2,
                  color: 'black',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                {editingAnnotations.length}
              </Box>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
              Review and edit your annotations before uploading to DroneDeploy
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 450 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      DD Colour
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      </Typography>
                    </Box>
                  </TableCell>
                  {config.originalAnnotations && showOriginalColors && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Original Colour
                        <Tooltip title="Hide original colors">
                          <IconButton 
                            size="small" 
                            onClick={() => setShowOriginalColors(false)}
                          >
                            <VisibilityOff fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                  {config.originalAnnotations && !showOriginalColors && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title="Show original colors for comparison">
                          <IconButton 
                            size="small" 
                            onClick={() => setShowOriginalColors(true)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                  <TableCell>Geometry</TableCell>
                  <TableCell width={120}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editingAnnotations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((annotation, globalIndex) => {
                  const index = page * rowsPerPage + globalIndex;
                  const originalAnnotation = config.originalAnnotations?.[index];
                  
                  // Debug log for first few items
                  if (index < 3 && showOriginalColors) {
                    console.log(`Row ${index}:`, {
                      hasOriginalAnnotations: !!config.originalAnnotations,
                      originalAnnotationsLength: config.originalAnnotations?.length,
                      originalAnnotation: originalAnnotation,
                      originalColor: originalAnnotation?.color,
                      standardizedColor: annotation.color,
                      title: annotation.title,
                      indexUsed: index
                    });
                  }
                  
                  return (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getAnnotationIcon(annotation.annotationType)}
                        <Chip
                          label={annotation.annotationType}
                          color={getAnnotationTypeColor(annotation.annotationType)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <TextField
                          value={tempEdit.title}
                          onChange={(e) => setTempEdit({ ...tempEdit, title: e.target.value })}
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 150 }}
                        />
                      ) : (
                        annotation.title
                      )}
                    </TableCell>
                    {/* DD Colour column - always show, this is what gets uploaded */}
                    <TableCell>
                      {editingIndex === index ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            value={tempEdit.color}
                            onChange={(e) => setTempEdit({ ...tempEdit, color: e.target.value })}
                            size="small"
                            variant="outlined"
                            sx={{ width: 100 }}
                            placeholder="#000000"
                          />
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              backgroundColor: formatColorForDisplay(tempEdit.color),
                              border: '1px solid #ccc',
                              borderRadius: '50%'
                            }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: formatColorForDisplay(annotation.color),
                              border: '1px solid #ccc',
                              borderRadius: '50%'
                            }}
                          />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {annotation.color}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    
                    {/* Original Colour column - show only when toggled on */}
                    {config.originalAnnotations && showOriginalColors && (
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: formatColorForDisplay(originalAnnotation?.color),
                              border: '1px solid #ccc',
                              borderRadius: '50%'
                            }}
                          />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {originalAnnotation?.color || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                    )}
                    
                    {/* Empty cell when original colors hidden but toggle available */}
                    {config.originalAnnotations && !showOriginalColors && (
                      <TableCell>
                        <Tooltip title="Click eye icon in header to show original colors">
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Hidden
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    )}
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {formatGeometry(annotation.geometry)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {editingIndex === index ? (
                          <>
                            <Tooltip title="Save">
                              <IconButton size="small" onClick={saveEdit} color="primary">
                                <Save fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <IconButton size="small" onClick={cancelEdit}>
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => startEditing(index)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Preview">
                              <IconButton size="small" onClick={() => handlePreview(annotation)}>
                                <Preview fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination for large datasets */}
          <TablePagination
            component="div"
            count={editingAnnotations.length}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{
              '& .MuiTablePagination-toolbar': {
                color: 'text.primary'
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                color: 'text.secondary'
              }
            }}
          />
        </Paper>

        {uploading && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2">
                Uploading annotations... ({uploadProgress}%)
              </Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelUpload}
                sx={{ ml: 2 }}
              >
                Cancel Upload
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Batch {batchInfo.current} of {batchInfo.total} • {batchInfo.totalAnnotations} total annotations • DroneDeploy processing
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
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBack />}
            disabled={uploading}
          >
            Back
          </Button>
          
          <Button
            variant="contained"
            onClick={handleUpload}
            startIcon={<Upload />}
            disabled={uploading}
            size="large"
          >
            {uploading ? 'Uploading...' : `Upload ${editingAnnotations.length} Annotations`}
          </Button>
        </Box>
      </Paper>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Annotation Preview: {selectedAnnotation?.title}
        </DialogTitle>
        <DialogContent>
          {selectedAnnotation && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Type: {selectedAnnotation.annotationType}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Colors: {selectedAnnotation.color} / {selectedAnnotation.fillColor}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                Geometry:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selectedAnnotation.geometry, null, 2)}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnotationPreview;
