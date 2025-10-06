/**
 * Color Utilities for DroneDeploy Color Standardization
 */

const { DRONEDEPLOY_COLORS } = require('../config/constants');

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (with or without #)
 * @returns {Object|null} RGB object {r, g, b} or null if invalid
 */
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  
  // Remove # if present and handle 6-digit hex
  const cleanHex = hex.replace('#', '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to HSL for better perceptual color matching
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} HSL object {h, s, l}
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Calculate perceptual distance between two colors using HSL and weighted RGB
 * @param {string} color1 - First color (hex)
 * @param {string} color2 - Second color (hex)
 * @returns {number} Distance value (lower = more similar)
 */
function colorDistance(color1, color2) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  if (!c1 || !c2) return Infinity;
  
  // RGB distance with perceptual weighting (human eye sensitivity)
  const rDiff = c1.r - c2.r;
  const gDiff = c1.g - c2.g;
  const bDiff = c1.b - c2.b;
  const rgbDistance = Math.sqrt(2 * rDiff * rDiff + 4 * gDiff * gDiff + 3 * bDiff * bDiff);
  
  // HSL distance for better perceptual matching
  const hsl1 = rgbToHsl(c1.r, c1.g, c1.b);
  const hsl2 = rgbToHsl(c2.r, c2.g, c2.b);
  
  // Hue distance (circular, 0-360)
  let hueDiff = Math.abs(hsl1.h - hsl2.h);
  hueDiff = Math.min(hueDiff, 360 - hueDiff);
  
  // Weighted HSL distance
  const hslDistance = Math.sqrt(
    Math.pow(hueDiff * 2, 2) +           // Hue is most important
    Math.pow(hsl1.s - hsl2.s, 2) +      // Saturation
    Math.pow((hsl1.l - hsl2.l) * 0.5, 2) // Lightness less important
  );
  
  // Combine RGB and HSL distances
  return rgbDistance * 0.7 + hslDistance * 0.3;
}

/**
 * Find the nearest DroneDeploy color for a given color
 * @param {string} inputColor - Input color (hex)
 * @returns {Object} Nearest DroneDeploy color object
 */
function findNearestDroneDeployColor(inputColor) {
  if (!inputColor) return DRONEDEPLOY_COLORS[0];
  
  let nearestColor = DRONEDEPLOY_COLORS[0];
  let minDistance = Infinity;
  
  for (const ddColor of DRONEDEPLOY_COLORS) {
    const distance = colorDistance(inputColor, ddColor.color);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = ddColor;
    }
  }
  
  return nearestColor;
}

/**
 * Standardize annotation colors to DroneDeploy palette
 * @param {Object} annotation - Annotation object
 * @param {boolean} applyStandardization - Whether to apply color standardization
 * @returns {Object} Annotation with standardized colors
 */
function standardizeAnnotationColors(annotation, applyStandardization = false) {
  if (!applyStandardization) {
    return annotation;
  }
  
  const standardizedAnnotation = { ...annotation };
  
  if (annotation.color) {
    const nearestColor = findNearestDroneDeployColor(annotation.color);
    standardizedAnnotation.color = nearestColor.color;
    
    // Auto-fill fillColor if not provided
    if (!annotation.fillColor) {
      standardizedAnnotation.fillColor = nearestColor.fillColor;
    } else {
      // Standardize fillColor as well
      const nearestFillColor = findNearestDroneDeployColor(annotation.fillColor);
      standardizedAnnotation.fillColor = nearestFillColor.fillColor;
    }
  }
  
  return standardizedAnnotation;
}

/**
 * Validate hex color format
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color
 */
function isValidHexColor(color) {
  if (!color || typeof color !== 'string') return false;
  const hexRegex = /^#?[0-9A-Fa-f]{6}$/;
  return hexRegex.test(color);
}

/**
 * Normalize hex color format (ensure # prefix)
 * @param {string} color - Color string
 * @returns {string} Normalized hex color
 */
function normalizeHexColor(color) {
  if (!color) return '#000000';
  const cleanColor = color.replace('#', '');
  return `#${cleanColor}`;
}

module.exports = {
  hexToRgb,
  rgbToHsl,
  colorDistance,
  findNearestDroneDeployColor,
  standardizeAnnotationColors,
  isValidHexColor,
  normalizeHexColor
};


