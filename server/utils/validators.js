/**
 * Input Validation and Sanitization Utilities
 */

const { VALIDATION_RULES, ANNOTATION_TYPES, ERROR_MESSAGES } = require('../config/constants');
const { isValidHexColor } = require('./colorUtils');

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 255) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, '') // Basic XSS prevention
    .replace(/[^\w\s\-_.,()]/g, ''); // Allow only safe characters
}

/**
 * Validate and sanitize annotation title
 * @param {string} title - Annotation title
 * @returns {string} Sanitized title
 */
function validateTitle(title) {
  if (!title) {
    throw new Error(ERROR_MESSAGES.VALIDATION.MISSING_REQUIRED_FIELD('title'));
  }
  
  const sanitized = sanitizeString(title, VALIDATION_RULES.TEXT_FIELDS.TITLE_MAX_LENGTH);
  if (!sanitized) {
    throw new Error('Title contains only invalid characters');
  }
  
  return sanitized;
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Validated coordinates
 */
function validateCoordinates(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_COORDINATE(lat, lng));
  }
  
  if (latitude < VALIDATION_RULES.COORDINATES.LAT_MIN || 
      latitude > VALIDATION_RULES.COORDINATES.LAT_MAX) {
    throw new Error(`Latitude must be between ${VALIDATION_RULES.COORDINATES.LAT_MIN} and ${VALIDATION_RULES.COORDINATES.LAT_MAX}`);
  }
  
  if (longitude < VALIDATION_RULES.COORDINATES.LNG_MIN || 
      longitude > VALIDATION_RULES.COORDINATES.LNG_MAX) {
    throw new Error(`Longitude must be between ${VALIDATION_RULES.COORDINATES.LNG_MIN} and ${VALIDATION_RULES.COORDINATES.LNG_MAX}`);
  }
  
  return { lat: latitude, lng: longitude };
}

/**
 * Validate annotation type
 * @param {string} type - Annotation type
 * @returns {string} Validated annotation type
 */
function validateAnnotationType(type) {
  if (!type) {
    throw new Error(ERROR_MESSAGES.VALIDATION.MISSING_REQUIRED_FIELD('annotationType'));
  }
  
  const upperType = type.toUpperCase();
  if (!Object.keys(ANNOTATION_TYPES).includes(upperType)) {
    throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_ANNOTATION_TYPE(type));
  }
  
  return upperType;
}

/**
 * Validate color format
 * @param {string} color - Color string
 * @param {boolean} required - Whether color is required
 * @returns {string} Validated color
 */
function validateColor(color, required = false) {
  if (!color) {
    if (required) {
      throw new Error(ERROR_MESSAGES.VALIDATION.MISSING_REQUIRED_FIELD('color'));
    }
    return '#FF0000'; // Default color
  }
  
  // Basic sanitization
  let sanitizedColor = color.toString().trim();
  
  // Add # if missing
  if (!sanitizedColor.startsWith('#') && /^[0-9A-Fa-f]{6}$/.test(sanitizedColor)) {
    sanitizedColor = `#${sanitizedColor}`;
  }
  
  if (!isValidHexColor(sanitizedColor)) {
    console.warn(`Invalid color format: ${color}, using default`);
    return '#FF0000';
  }
  
  return sanitizedColor;
}

/**
 * Validate geometry for annotation type
 * @param {Object|Array} geometry - Geometry data
 * @param {string} annotationType - Type of annotation
 * @returns {Object|Array} Validated geometry
 */
function validateGeometry(geometry, annotationType) {
  const typeConfig = ANNOTATION_TYPES[annotationType];
  if (!typeConfig) {
    throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_ANNOTATION_TYPE(annotationType));
  }
  
  switch (annotationType) {
    case 'LOCATION':
      if (!geometry || typeof geometry !== 'object' || !geometry.lat || !geometry.lng) {
        throw new Error('LOCATION geometry must have lat and lng properties');
      }
      return validateCoordinates(geometry.lat, geometry.lng);
      
    case 'AREA':
    case 'LINE':
      if (!Array.isArray(geometry)) {
        throw new Error(`${annotationType} geometry must be an array of coordinates`);
      }
      
      if (geometry.length < typeConfig.minPoints) {
        throw new Error(ERROR_MESSAGES.VALIDATION.INSUFFICIENT_POINTS(
          annotationType,
          geometry.length,
          typeConfig.minPoints
        ));
      }
      
      // Validate each coordinate pair
      const validatedCoords = [];
      for (let i = 0; i < geometry.length; i++) {
        const coord = geometry[i];
        if (!Array.isArray(coord) || coord.length < 2) {
          throw new Error(`Invalid coordinate at index ${i}: must be [lng, lat] array`);
        }
        
        const [lng, lat] = coord;
        const validated = validateCoordinates(lat, lng);
        validatedCoords.push([validated.lng, validated.lat]); // GeoJSON format
      }
      
      return validatedCoords;
      
    default:
      throw new Error(ERROR_MESSAGES.VALIDATION.INVALID_ANNOTATION_TYPE(annotationType));
  }
}

/**
 * Validate complete annotation object
 * @param {Object} annotation - Annotation to validate
 * @returns {Object} Validated annotation
 */
function validateAnnotation(annotation) {
  if (!annotation || typeof annotation !== 'object') {
    throw new Error('Annotation must be an object');
  }
  
  const validated = {
    annotationType: validateAnnotationType(annotation.annotationType),
    title: validateTitle(annotation.title),
    color: validateColor(annotation.color),
    fillColor: validateColor(annotation.fillColor),
    geometry: validateGeometry(annotation.geometry, annotation.annotationType)
  };
  
  // Add description if provided
  if (annotation.description) {
    validated.description = sanitizeString(
      annotation.description, 
      VALIDATION_RULES.TEXT_FIELDS.DESCRIPTION_MAX_LENGTH
    );
  }
  
  return validated;
}

/**
 * Validate API key format
 * @param {string} apiKey - DroneDeploy API key
 * @returns {string} Validated API key
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error(ERROR_MESSAGES.VALIDATION.MISSING_REQUIRED_FIELD('apiKey'));
  }
  
  const sanitized = apiKey.trim();
  if (sanitized.length < 10) {
    throw new Error('API key appears to be too short');
  }
  
  // Basic format validation (alphanumeric and common special chars)
  if (!/^[a-zA-Z0-9\-_.:]+$/.test(sanitized)) {
    throw new Error('API key contains invalid characters');
  }
  
  return sanitized;
}

/**
 * Validate Map/Plan ID format
 * @param {string} planId - DroneDeploy plan ID
 * @returns {string} Validated plan ID
 */
function validatePlanId(planId) {
  if (!planId || typeof planId !== 'string') {
    throw new Error(ERROR_MESSAGES.VALIDATION.MISSING_REQUIRED_FIELD('planId'));
  }
  
  let sanitized = planId.trim();
  
  // Remove MapPlan: prefix if present
  if (sanitized.startsWith('MapPlan:')) {
    sanitized = sanitized.substring(8);
  }
  
  // Basic MongoDB ObjectId format validation (24 hex chars)
  if (!/^[a-f\d]{24}$/i.test(sanitized)) {
    throw new Error('Invalid plan ID format. Should be 24 hexadecimal characters.');
  }
  
  return sanitized;
}

/**
 * Validate file upload
 * @param {Object} file - Uploaded file object
 * @returns {Object} Validation result
 */
function validateFileUpload(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Check file size
  if (file.size > VALIDATION_RULES.FILE_LIMITS.MAX_FILE_SIZE) {
    throw new Error(ERROR_MESSAGES.VALIDATION.FILE_TOO_LARGE);
  }
  
  // Check file extension
  const extension = file.originalname.toLowerCase().split('.').pop();
  if (!VALIDATION_RULES.FILE_LIMITS.ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
    throw new Error(ERROR_MESSAGES.FILE_PROCESSING.UNSUPPORTED_FORMAT);
  }
  
  return {
    isValid: true,
    extension,
    sanitizedName: sanitizeString(file.originalname, 255)
  };
}

/**
 * Validate annotation count
 * @param {Array} annotations - Array of annotations
 * @returns {boolean} True if valid count
 */
function validateAnnotationCount(annotations) {
  if (!Array.isArray(annotations)) {
    throw new Error('Annotations must be an array');
  }
  
  if (annotations.length === 0) {
    throw new Error('No annotations found');
  }
  
  if (annotations.length > VALIDATION_RULES.FILE_LIMITS.MAX_ANNOTATIONS) {
    throw new Error(ERROR_MESSAGES.VALIDATION.TOO_MANY_ANNOTATIONS);
  }
  
  return true;
}

module.exports = {
  sanitizeString,
  validateTitle,
  validateCoordinates,
  validateAnnotationType,
  validateColor,
  validateGeometry,
  validateAnnotation,
  validateApiKey,
  validatePlanId,
  validateFileUpload,
  validateAnnotationCount
};


