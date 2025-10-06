import React, { useState, lazy, Suspense } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Container, 
  Box, 
  Typography, 
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  IconButton,
  Button,
  Chip
} from '@mui/material';
import {
  ExpandMore,
  CloudUpload,
  Map
} from '@mui/icons-material';
import FileUpload from './components/FileUpload';
import AnnotationPreview from './components/AnnotationPreview';
import ConfigurationForm from './components/ConfigurationForm';
import UploadResults from './components/UploadResults';

// Dark mode theme with Urbanist and Hanken Grotesk
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3F48E9', // Custom blue
      dark: '#2832D4',
      light: '#6B73ED',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FAAF33', // Custom orange highlight
      dark: '#E6991A',
      light: '#FBBC52',
      contrastText: '#000000',
    },
    background: {
      default: '#0F0F0F', // Deep black
      paper: '#1A1A1A', // Charcoal
    },
    surface: {
      main: '#262626', // Lighter charcoal for surfaces
      light: '#404040',
      dark: '#171717',
    },
    text: {
      primary: '#FFFFFF', // Pure white for primary text
      secondary: '#A3A3A3', // Light gray for secondary text
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    success: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#15803D',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    info: {
      main: '#3B82F6',
      light: '#93C5FD',
      dark: '#1D4ED8',
    },
  },
  typography: {
    fontFamily: '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
      fontWeight: 800,
      fontSize: '3.5rem',
      lineHeight: 1.1,
      letterSpacing: '-0.025em',
      color: '#FFFFFF',
    },
    h2: {
      fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      color: '#FFFFFF',
    },
    h3: {
      fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
      color: '#FFFFFF',
    },
    h4: {
      fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: '#FFFFFF',
    },
    h5: {
      fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.005em',
      color: '#FFFFFF',
    },
    h6: {
      fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
      color: '#FFFFFF',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#E5E5E5',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.4,
      color: '#D4D4D4',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#E5E5E5',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#D4D4D4',
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.4,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: '#A3A3A3',
    },
  },
  shape: {
    borderRadius: 12, // More modern, rounded corners
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 100%)',
          minHeight: '100vh',
          color: '#FFFFFF',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #3F48E9 0%, #2832D4 100%)',
          boxShadow: '0 4px 12px rgba(63, 72, 233, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2832D4 0%, #1E28C7 100%)',
            boxShadow: '0 6px 20px rgba(63, 72, 233, 0.4)',
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: '#404040',
          color: '#FFFFFF',
          '&:hover': {
            borderWidth: 2,
            backgroundColor: '#262626',
            borderColor: '#3F48E9',
          },
        },
        large: {
          padding: '16px 32px',
          fontSize: '1rem',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #262626',
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A',
        },
        elevation0: {
          boxShadow: 'none',
          border: '1px solid #262626',
          backgroundColor: '#1A1A1A',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px -1px rgba(0, 0, 0, 0.5)',
          backgroundColor: '#1A1A1A',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -4px rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#1A1A1A',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #F1F5F9',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.8125rem',
          fontWeight: 500,
          height: 32,
        },
        outlined: {
          borderWidth: 1.5,
        },
        colorSecondary: {
          backgroundColor: 'rgba(250, 175, 51, 0.15)',
          color: '#FAAF33',
          border: '1px solid rgba(250, 175, 51, 0.3)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#262626',
            border: '1px solid #404040',
            transition: 'all 0.2s ease-in-out',
            color: '#FFFFFF',
            '&:hover': {
              borderColor: '#525252',
            },
            '&.Mui-focused': {
              borderColor: '#3F48E9',
              boxShadow: '0 0 0 3px rgba(63, 72, 233, 0.1)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#A3A3A3',
            '&.Mui-focused': {
              color: '#3F48E9',
            },
          },
          '& .MuiOutlinedInput-input': {
            color: '#FFFFFF',
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          padding: '32px 0',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        root: {
          '& .MuiStepLabel-label': {
            fontFamily: '"Urbanist", "Hanken Grotesk", sans-serif',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#A3A3A3',
            '&.Mui-active': {
              color: '#3F48E9',
              fontWeight: 700,
            },
            '&.Mui-completed': {
              color: '#FAAF33',
              fontWeight: 600,
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: 'none',
        },
        standardInfo: {
          backgroundColor: 'rgba(63, 72, 233, 0.15)',
          color: '#6B73ED',
          border: '1px solid rgba(63, 72, 233, 0.3)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(250, 175, 51, 0.15)',
          color: '#FAAF33',
          border: '1px solid rgba(250, 175, 51, 0.3)',
        },
        standardWarning: {
          backgroundColor: 'rgba(250, 175, 51, 0.15)',
          color: '#FBBC52',
          border: '1px solid rgba(250, 175, 51, 0.3)',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          color: '#FCA5A5',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #404040',
          backgroundColor: '#1A1A1A',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#262626',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#FFFFFF',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #404040',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #262626',
          color: '#E5E5E5',
        },
      },
    },
  },
});


function App() {
  const [currentPage, setCurrentPage] = useState('uploader'); // 'uploader' or 'guide'
  const [activeStep, setActiveStep] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [config, setConfig] = useState({
    planId: '',
    apiKey: '',
    forceStandardColors: false
  });
  const [uploadResults, setUploadResults] = useState(null);
  const [configExpanded, setConfigExpanded] = useState(true);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setAnnotations([]);
    setUploadResults(null);
    // Keep config persistent - don't reset
  };

  const handleFileUpload = (uploadData) => {

    // Handle both old format (just annotations) and new format (object with annotations + metadata)
    if (Array.isArray(uploadData)) {
      setAnnotations(uploadData);
    } else {
      setAnnotations(uploadData.annotations);
      setConfig(prev => ({ 
        ...prev, 
        forceStandardColors: uploadData.forceStandardColors,
        originalAnnotations: uploadData.originalAnnotations 
      }));
    }
    handleNext();
  };

  const handleConfigUpdate = (configData) => {
    setConfig(prev => ({ ...prev, ...configData }));
  };

  const handleUploadComplete = (results) => {
    setUploadResults(results);
    handleNext();
  };

  const startNewUpload = () => {
    setActiveStep(0);
    setAnnotations([]);
    setUploadResults(null);
  };

  const toggleConfigExpanded = () => {
    setConfigExpanded(!configExpanded);
  };

  const isConfigComplete = config.planId.trim() && config.apiKey.trim();

  // Lazy load FormatGuide component
  const FormatGuide = lazy(() => import('./components/FormatGuide'));

  // Show Format Guide page
  if (currentPage === 'guide') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0F0F0F 0%, #1A1A1A 100%)',
        }}>
          <Container maxWidth="lg">
            <Suspense fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Typography>Loading Format Guide...</Typography>
              </Box>
            }>
              <FormatGuide onBack={() => setCurrentPage('uploader')} />
            </Suspense>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  // Show main uploader page  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Modern Hero Section */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h2" component="h1" sx={{ 
              mb: 2,
              background: 'linear-gradient(135deg, #3F48E9 0%, #FAAF33 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
            }}>
              DroneDeploy Annotation Uploader
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ 
              maxWidth: '600px', 
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.6
            }}>
              Seamlessly upload location, area, and line annotations to your DroneDeploy maps from CSV, GeoJSON, or KML/KMZ files
            </Typography>
          </Box>
          
          {/* Subtle feature badges */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {['CSV Support', 'GeoJSON Support', 'KML/KMZ Support'].map((feature) => (
              <Box key={feature} sx={{
                px: 3, py: 1,
                backgroundColor: 'rgba(63, 72, 233, 0.15)',
                borderRadius: 6,
                border: '1px solid rgba(63, 72, 233, 0.3)',
              }}>
                <Typography variant="caption" color="primary" sx={{ fontWeight: 500 }}>
                  {feature}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {/* Format Guide Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setCurrentPage('guide')}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                px: 3
              }}
            >
              📚 Format Guide & Examples
            </Button>
          </Box>
        </Box>

        {/* Persistent Configuration Section */}
        <Paper elevation={2} sx={{ 
          mb: 4,
          background: 'rgba(26, 26, 26, 0.98)',
          border: '1px solid rgba(63, 72, 233, 0.3)',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          {/* Configuration Header - Always Visible */}
          <Box sx={{ 
            p: 3,
            background: configExpanded 
              ? 'linear-gradient(135deg, rgba(63, 72, 233, 0.15) 0%, rgba(250, 175, 51, 0.05) 100%)'
              : 'rgba(26, 26, 26, 0.98)',
            borderBottom: configExpanded ? '1px solid rgba(63, 72, 233, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(63, 72, 233, 0.1) 0%, rgba(250, 175, 51, 0.03) 100%)'
            }
          }}
          onClick={toggleConfigExpanded}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  ⚙️ Configuration
                </Typography>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: isConfigComplete ? 'success.main' : 'warning.main',
                  ml: 1
                }} />
              </Box>
              
              {!configExpanded && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {isConfigComplete 
                    ? `✓ Map: ${config.planId.substring(0, 8)}... | API: ${config.apiKey.substring(0, 8)}...`
                    : 'Click to configure DroneDeploy credentials'
                  }
                </Typography>
              )}
              
              {configExpanded && (
                <Typography variant="body2" color="text.secondary">
                  Set up your DroneDeploy credentials once - they'll persist across multiple uploads
                </Typography>
              )}
            </Box>
            
            <IconButton 
              color="primary" 
              size="small"
              sx={{ 
                transform: configExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <ExpandMore />
            </IconButton>
          </Box>
          
          {/* Collapsible Configuration Form */}
          <Collapse in={configExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, pt: 0 }}>
              <ConfigurationForm
                config={config}
                onSave={handleConfigUpdate}
                persistentMode={true}
              />
            </Box>
          </Collapse>
        </Paper>

        {/* Main Upload Workflow */}
        <Paper elevation={3} sx={{ 
          p: 4,
          background: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
        }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Upload File</StepLabel>
              <StepContent>
                <FileUpload 
                  onFileUpload={handleFileUpload}
                  onNext={handleNext}
                  config={config}
                />
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Preview Annotations</StepLabel>
              <StepContent>
                <AnnotationPreview
                  annotations={annotations}
                  config={config}
                  onUpload={handleUploadComplete}
                  onBack={handleBack}
                />
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Upload Results</StepLabel>
              <StepContent>
                <UploadResults
                  results={uploadResults}
                  onReset={handleReset}
                  onNewUpload={startNewUpload}
                />
              </StepContent>
            </Step>
          </Stepper>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
