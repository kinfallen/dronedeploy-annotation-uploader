/**
 * Application Constants and Configuration
 */

// Server Configuration
const SERVER_CONFIG = {
  PORT: process.env.PORT || 3001,
  PAYLOAD_LIMIT: '10mb',
  UPLOAD_DIR: 'uploads/',
  FILE_SIZE_LIMIT: 10 * 1024 * 1024, // 10MB
};

// DroneDeploy API Configuration
const DRONEDEPLOY_CONFIG = {
  API_URL: 'https://www.dronedeploy.com/graphql',
  TIMEOUT: 120000, // 2 minutes
  BATCH_SIZE: 50, // Annotations per batch
  BATCH_DELAY: 100, // Milliseconds between batches
  REQUEST_TIMEOUT: 30000, // 30 seconds per request
};

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

// File Format Configuration
const FILE_FORMATS = {
  CSV: {
    extensions: ['.csv'],
    mimeTypes: ['text/csv'],
    requiredFields: ['annotationType', 'title', 'lat', 'lng'],
    optionalFields: ['color', 'fillColor', 'description']
  },
  GEOJSON: {
    extensions: ['.json', '.geojson'],
    mimeTypes: ['application/json'],
    requiredStructure: ['type', 'features']
  },
  KML: {
    extensions: ['.kml'],
    mimeTypes: ['application/vnd.google-earth.kml+xml', 'text/xml']
  },
  KMZ: {
    extensions: ['.kmz'],
    mimeTypes: ['application/vnd.google-earth.kmz']
  }
};

// Annotation Configuration
const ANNOTATION_TYPES = {
  LOCATION: {
    name: 'LOCATION',
    minPoints: 1,
    geometryType: 'Point'
  },
  AREA: {
    name: 'AREA',
    minPoints: 3, // Auto-closed by backend to 4
    geometryType: 'Polygon'
  },
  LINE: {
    name: 'LINE',
    minPoints: 2,
    geometryType: 'LineString'
  }
};

// Validation Rules
const VALIDATION_RULES = {
  COORDINATES: {
    LAT_MIN: -90,
    LAT_MAX: 90,
    LNG_MIN: -180,
    LNG_MAX: 180
  },
  TEXT_FIELDS: {
    TITLE_MAX_LENGTH: 255,
    DESCRIPTION_MAX_LENGTH: 1000
  },
  FILE_LIMITS: {
    MAX_ANNOTATIONS: 10000,
    MAX_FILE_SIZE: SERVER_CONFIG.FILE_SIZE_LIMIT,
    ALLOWED_EXTENSIONS: ['.csv', '.json', '.geojson', '.kml', '.kmz']
  }
};

// Error Messages
const ERROR_MESSAGES = {
  VALIDATION: {
    MISSING_REQUIRED_FIELD: (field) => `Missing required field: ${field}`,
    INVALID_COORDINATE: (lat, lng) => `Invalid coordinates: lat=${lat}, lng=${lng}`,
    INVALID_ANNOTATION_TYPE: (type) => `Invalid annotation type: ${type}`,
    INSUFFICIENT_POINTS: (type, count, min) => `${type} requires at least ${min} points, got ${count}`,
    FILE_TOO_LARGE: `File size exceeds ${SERVER_CONFIG.FILE_SIZE_LIMIT / 1024 / 1024}MB limit`,
    TOO_MANY_ANNOTATIONS: `File contains more than ${VALIDATION_RULES.FILE_LIMITS.MAX_ANNOTATIONS} annotations`
  },
  FILE_PROCESSING: {
    INVALID_FILE_FORMAT: 'Invalid file format or corrupted file',
    PARSE_ERROR: 'Failed to parse file content',
    UNSUPPORTED_FORMAT: 'Unsupported file format'
  },
  API: {
    DRONEDEPLOY_ERROR: 'DroneDeploy API error',
    NETWORK_ERROR: 'Network connection error',
    TIMEOUT_ERROR: 'Request timeout',
    AUTHENTICATION_ERROR: 'Authentication failed - check API key'
  }
};

module.exports = {
  SERVER_CONFIG,
  DRONEDEPLOY_CONFIG,
  DRONEDEPLOY_COLORS,
  FILE_FORMATS,
  ANNOTATION_TYPES,
  VALIDATION_RULES,
  ERROR_MESSAGES
};

