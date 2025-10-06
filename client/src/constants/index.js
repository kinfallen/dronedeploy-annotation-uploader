/**
 * Frontend Constants and Configuration
 */

// UI Configuration
export const UI_CONFIG = {
  BATCH_SIZE: 50,
  TIMEOUT: 120000, // 2 minutes
  PROGRESS_UPDATE_INTERVAL: 100, // ms
  MAP_HEIGHT: 500,
  PAGINATION_ROWS_PER_PAGE: 25,
  DEBOUNCE_DELAY: 300,
};

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: ['.csv', '.json', '.geojson', '.kml', '.kmz'],
  SUPPORTED_FORMATS: ['CSV', 'GeoJSON', 'KML', 'KMZ'],
};

// DroneDeploy Colors (for frontend display)
export const DRONEDEPLOY_COLORS = [
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

// Theme Configuration
export const THEME_CONFIG = {
  PRIMARY_COLOR: '#3F48E9',
  SECONDARY_COLOR: '#FAAF33',
  BACKGROUND_DARK: '#0F0F0F',
  SURFACE_DARK: '#1A1A1A',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A3A3A3',
};

// API Endpoints
export const API_ENDPOINTS = {
  UPLOAD: '/api/upload',
  UPLOAD_ANNOTATIONS: '/api/upload-annotations',
  HEALTH: '/api/health',
  FORMATS: '/api/formats',
};

// Error Messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File too large. Maximum size is 10MB.',
  INVALID_FILE_TYPE: 'Invalid file type. Please use CSV, GeoJSON, KML, or KMZ files.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'File uploaded successfully',
  ANNOTATIONS_CREATED: 'Annotations created successfully',
  CONFIGURATION_SAVED: 'Configuration saved',
};

// Validation Rules
export const VALIDATION_RULES = {
  MAP_ID_LENGTH: 24,
  API_KEY_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 255,
  MAX_ANNOTATIONS: 10000,
};

// Animation/Transition Durations
export const ANIMATION_CONFIG = {
  SHORT: 150,
  MEDIUM: 300,
  LONG: 500,
  MAP_TRANSITION: 200,
};


