import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  CircularProgress,
  Link
} from '@mui/material';
import {
  ArrowBack,
  ExpandMore,
  ExpandLess,
  Delete,
  Undo,
  History,
  LocationOn,
  Polyline,
  CropFree,
  OpenInNew,
  Warning
} from '@mui/icons-material';
import axios from 'axios';
import { getUploadHistory, removeUploadFromHistory, formatUploadSummary } from '../utils/uploadHistory';

const UndoUpload = ({ onBack, config = {} }) => {
  const [uploadHistory, setUploadHistory] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ open: false, entry: null });
  const [undoing, setUndoing] = useState(false);
  const [undoResult, setUndoResult] = useState(null);

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = () => {
    const history = getUploadHistory();
    setUploadHistory(history);
  };

  const toggleExpanded = (entryId) => {
    setExpandedItems(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  const handleUndoClick = (entry) => {
    setConfirmDialog({ open: true, entry });
  };

  const handleConfirmUndo = async () => {
    const { entry } = confirmDialog;
    setConfirmDialog({ open: false, entry: null });
    
    // Check if API key is available
    if (!config.apiKey || !config.apiKey.trim()) {
      setUndoResult({
        success: false,
        message: 'API key is required. Please configure your API key in the main uploader first.'
      });
      return;
    }
    
    setUndoing(true);
    setUndoResult(null);

    try {
      // Call the server to delete annotations
      const response = await axios.post('http://localhost:3001/api/dronedeploy/undo-upload', {
        annotationIds: entry.successfulAnnotationIds,
        planId: entry.mapId,
        apiKey: config.apiKey
      });

      if (response.data.success) {
        // Remove from history on successful undo
        removeUploadFromHistory(entry.id);
        loadUploadHistory(); // Refresh the list
        
        setUndoResult({
          success: true,
          message: `Successfully removed ${entry.successfulAnnotationIds.length} annotation${entry.successfulAnnotationIds.length === 1 ? '' : 's'} from ${entry.mapName}`
        });
      } else {
        throw new Error(response.data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Undo failed:', error);
      setUndoResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Failed to undo upload'
      });
    } finally {
      setUndoing(false);
    }
  };

  const getGeometryIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'point':
        return <LocationOn fontSize="small" />;
      case 'polygon':
        return <CropFree fontSize="small" />;
      case 'linestring':
        return <Polyline fontSize="small" />;
      default:
        return <LocationOn fontSize="small" />;
    }
  };

  const getGeometryTypeFromAnnotationTypes = (annotationTypes) => {
    if (!annotationTypes) return [];
    
    return Object.entries(annotationTypes).map(([type, count]) => ({
      type,
      count,
      icon: getGeometryIcon(type)
    }));
  };

  if (uploadHistory.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Undo Previous Uploads
        </Typography>
        
        {!config.apiKey && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              API key is required to undo uploads. Please configure your API key in the main uploader first.
            </Typography>
          </Alert>
        )}
        
        <Paper elevation={2} sx={{ 
          p: 4, 
          mb: 4,
          borderRadius: 3,
          background: 'rgba(26, 26, 26, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Upload History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload some annotations first, and they'll appear here for easy removal if needed.
          </Typography>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBack />}
          >
            Back to Main Menu
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Undo Previous Uploads
      </Typography>
      
      {undoResult && (
        <Alert 
          severity={undoResult.success ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setUndoResult(null)}
        >
          {undoResult.message}
        </Alert>
      )}

      <Paper elevation={2} sx={{ 
        mb: 4,
        borderRadius: 3,
        background: 'rgba(26, 26, 26, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <List>
          {uploadHistory.map((entry, index) => {
            const summary = formatUploadSummary(entry);
            const isExpanded = expandedItems[entry.id];
            const geometryTypes = getGeometryTypeFromAnnotationTypes(entry.annotationTypes);

            return (
              <Box key={entry.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {summary.title}
                        </Typography>
                        {entry.projectId && (
                          <Link
                            href={`https://www.dronedeploy.com/app2/sites/${entry.projectId.replace('Project:', '')}/maps/${entry.mapId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'inline-flex', alignItems: 'center' }}
                          >
                            <OpenInNew fontSize="small" />
                          </Link>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {summary.subtitle}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          {geometryTypes.map(({ type, count, icon }) => (
                            <Chip
                              key={type}
                              icon={icon}
                              label={`${count} ${type}${count === 1 ? '' : 's'}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      edge="end"
                      onClick={() => toggleExpanded(entry.id)}
                      title={isExpanded ? 'Collapse' : 'Expand details'}
                    >
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleUndoClick(entry)}
                      color="error"
                      title="Undo this upload"
                      disabled={undoing}
                    >
                      <Undo />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <Collapse in={isExpanded}>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Upload Details:</strong>
                      </Typography>
                      <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        • Map ID: {entry.mapId}<br />
                        • Uploaded: {new Date(entry.timestamp).toLocaleString()}<br />
                        • Total Annotations: {entry.totalAnnotations}<br />
                        • Successful IDs: {entry.successfulAnnotationIds?.length || 0}<br />
                        {entry.successfulAnnotationIds && entry.successfulAnnotationIds.length > 0 && (
                          <>• First few IDs: {entry.successfulAnnotationIds.slice(0, 3).join(', ')}
                          {entry.successfulAnnotationIds.length > 3 && '...'}</>
                        )}
                      </Typography>
                    </Alert>
                    
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleUndoClick(entry)}
                      disabled={undoing}
                      size="small"
                    >
                      Remove These Annotations
                    </Button>
                  </Box>
                </Collapse>
                
                {index < uploadHistory.length - 1 && <Divider />}
              </Box>
            );
          })}
        </List>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Button
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowBack />}
          disabled={undoing}
        >
          Back to Main Menu
        </Button>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => !undoing && setConfirmDialog({ open: false, entry: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          Confirm Undo Upload
        </DialogTitle>
        <DialogContent>
          {confirmDialog.entry && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This action cannot be undone. The annotations will be permanently deleted from DroneDeploy.
                </Typography>
              </Alert>
              
              <Typography variant="body1" gutterBottom>
                You are about to remove <strong>{confirmDialog.entry.successfulAnnotationIds?.length || 0} annotation{confirmDialog.entry.successfulAnnotationIds?.length === 1 ? '' : 's'}</strong> from:
              </Typography>
              
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {confirmDialog.entry.mapName} ({confirmDialog.entry.mapDate})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Map ID: {confirmDialog.entry.mapId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Uploaded: {new Date(confirmDialog.entry.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, entry: null })}
            disabled={undoing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmUndo}
            color="error"
            variant="contained"
            disabled={undoing}
            startIcon={undoing ? <CircularProgress size={16} /> : <Delete />}
          >
            {undoing ? 'Removing...' : 'Remove Annotations'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UndoUpload;
