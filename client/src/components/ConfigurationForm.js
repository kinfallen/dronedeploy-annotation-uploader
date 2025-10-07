import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Collapse,
  CircularProgress,
  Link
} from '@mui/material';
import {
  Key,
  Map,
  ArrowBack,
  ArrowForward,
  Clear,
  ExpandMore,
  ExpandLess,
  OpenInNew
} from '@mui/icons-material';
import axios from 'axios';

const ConfigurationForm = ({ config, onSave, onBack, persistentMode = false }) => {
  const [formData, setFormData] = useState({
    planId: config.planId || '',
    apiKey: config.apiKey || ''
  });
  const [errors, setErrors] = useState({});
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [mapDetails, setMapDetails] = useState(null);
  const [loadingMapDetails, setLoadingMapDetails] = useState(false);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData({
      ...formData,
      [field]: value
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
  };

  const handleClearMapId = () => {
    setFormData({
      ...formData,
      planId: ''
    });
    if (errors.planId) {
      setErrors({
        ...errors,
        planId: ''
      });
    }
    setMapDetails(null); // Clear map details when clearing Map ID
  };

  // Fetch map details when both API key and Map ID are provided
  const fetchMapDetails = async () => {
    if (formData.planId.trim() && formData.apiKey.trim()) {
      setLoadingMapDetails(true);
      try {
        const response = await axios.get(`http://localhost:3001/api/dronedeploy/map/${formData.planId}?apiKey=${formData.apiKey}`);
        if (response.data.success) {
          setMapDetails(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch map details:', error);
        setMapDetails(null);
      } finally {
        setLoadingMapDetails(false);
      }
    } else {
      setMapDetails(null);
    }
  };

  // Trigger map details fetch when API key or Map ID changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMapDetails();
    }, 500); // Debounce to avoid too many API calls

    return () => clearTimeout(timeoutId);
  }, [formData.planId, formData.apiKey]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.planId.trim()) {
      newErrors.planId = 'Map ID is required';
    } else if (formData.planId.includes('MapPlan:')) {
      newErrors.planId = 'Just enter the ID part, not the "MapPlan:" prefix';
    }
    
    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    } else if (formData.apiKey.length < 10) {
      newErrors.apiKey = 'API Key seems too short';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  // Auto-save in persistent mode when values change
  useEffect(() => {
    if (persistentMode && (formData.planId || formData.apiKey)) {
      onSave(formData);
    }
  }, [formData.planId, formData.apiKey, persistentMode]); // Removed onSave to prevent infinite loop

  return (
    <Box sx={{ mt: 2 }}>
      {!persistentMode && (
        <Typography variant="h6" gutterBottom>
          Step 2: Configure DroneDeploy Settings
        </Typography>
      )}
      
      <Paper elevation={2} sx={{ 
        p: 4, 
        mb: 4,
        borderRadius: 3,
        background: 'rgba(26, 26, 26, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={formData.apiKey}
            onChange={handleChange('apiKey')}
            error={!!errors.apiKey}
            helperText={errors.apiKey || 'Your DroneDeploy API key for authentication'}
            placeholder="Enter your API key"
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Key />
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            fullWidth
            label="Map ID"
            value={formData.planId}
            onChange={handleChange('planId')}
            error={!!errors.planId}
            helperText={errors.planId || 'Just enter the Map ID from your DroneDeploy URL'}
            placeholder="Enter your Map ID"
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Map />
                </InputAdornment>
              ),
              endAdornment: formData.planId && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClearMapId}
                    edge="end"
                    size="small"
                    title="Clear Map ID"
                  >
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          {/* Map Preview Section */}
          {(formData.planId.trim() && formData.apiKey.trim()) && (
            <Box sx={{ mb: 3 }}>
              {loadingMapDetails ? (
                <Alert severity="info" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Loading map details...</Typography>
                </Alert>
              ) : mapDetails ? (
                <Alert severity="success">
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Map Found:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                    <strong>Name:</strong> {mapDetails.name} ({(() => {
                      try {
                        const date = new Date(mapDetails.dateImagesCaptured);
                        if (isNaN(date.getTime())) {
                          return mapDetails.dateImagesCaptured;
                        }
                        return date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        });
                      } catch (error) {
                        return mapDetails.dateImagesCaptured;
                      }
                    })()})
                  </Typography>
                  {mapDetails.projectId && (
                    <Link
                      href={`https://www.dronedeploy.com/app2/sites/${mapDetails.projectId.replace('Project:', '')}/maps/${formData.planId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      View in DroneDeploy <OpenInNew fontSize="small" />
                    </Link>
                  )}
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography variant="body2">
                    Unable to fetch map details. Please check your API key and Map ID.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
          
          <Box sx={{ mb: 3 }}>
            <Button
              variant="text"
              onClick={() => setHelpExpanded(!helpExpanded)}
              startIcon={helpExpanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 1, textTransform: 'none' }}
            >
              How to find your Map ID:
            </Button>
            
            <Collapse in={helpExpanded}>
              <Alert severity="info">
                <Typography variant="body2" component="div">
                  1. Open your map in DroneDeploy<br />
                  2. Look at the URL in your browser<br />
                  3. URL format: https://www.dronedeploy.com/app2/sites/<strong>PROJECT_ID</strong>/maps/<strong>MAP_ID</strong><br />
                  4. Copy just the <strong>MAP_ID</strong> part (after /maps/)<br />
                  5. <strong>Examples:</strong><br />
                  &nbsp;&nbsp;&nbsp;• URL: /maps/<strong>68cb3c598eab2a602e1a12a4</strong> → Enter: <strong>68cb3c598eab2a602e1a12a4</strong><br />
                  &nbsp;&nbsp;&nbsp;• URL: /maps/<strong>6729ae04309c758354e71ce1</strong> → Enter: <strong>6729ae04309c758354e71ce1</strong>
                </Typography>
              </Alert>
            </Collapse>
          </Box>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Your API key is stored locally and only sent to DroneDeploy's servers during upload.
              It is never transmitted elsewhere.
            </Typography>
          </Alert>

          {!persistentMode && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={onBack}
                startIcon={<ArrowBack />}
              >
                Back
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                endIcon={<ArrowForward />}
                disabled={!formData.planId.trim() || !formData.apiKey.trim()}
              >
                Continue to Preview
              </Button>
            </Box>
          )}
          
          {persistentMode && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  backgroundColor: (formData.planId.trim() && formData.apiKey.trim()) ? 'success.main' : 'warning.main' 
                }} />
                {(formData.planId.trim() && formData.apiKey.trim()) ? 'Configuration saved' : 'Please fill in all fields'}
              </Typography>
            </Box>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default ConfigurationForm;