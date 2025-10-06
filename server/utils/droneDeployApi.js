/**
 * DroneDeploy API Integration Utilities
 */

const axios = require('axios');
const { DRONEDEPLOY_CONFIG, ERROR_MESSAGES } = require('../config/constants');
const { validateApiKey, validatePlanId } = require('./validators');

/**
 * Create GraphQL client with authentication
 * @param {string} apiKey - DroneDeploy API key
 * @returns {Function} GraphQL query function
 */
function createGraphQLClient(apiKey) {
  const validatedApiKey = validateApiKey(apiKey);
  
  return async function executeQuery(query, variables = {}) {
    try {
      const response = await axios.post(
        DRONEDEPLOY_CONFIG.API_URL,
        { query, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validatedApiKey}`,
          },
          timeout: DRONEDEPLOY_CONFIG.REQUEST_TIMEOUT,
        }
      );
      
      if (response.data.errors) {
        const errorMessages = response.data.errors.map(err => err.message).join(', ');
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }
      
      return response.data.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          throw new Error(ERROR_MESSAGES.API.AUTHENTICATION_ERROR);
        } else if (status >= 500) {
          throw new Error(`${ERROR_MESSAGES.API.DRONEDEPLOY_ERROR}: Server error (${status})`);
        } else {
          throw new Error(`${ERROR_MESSAGES.API.DRONEDEPLOY_ERROR}: HTTP ${status}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error(ERROR_MESSAGES.API.TIMEOUT_ERROR);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error(ERROR_MESSAGES.API.NETWORK_ERROR);
      } else {
        throw new Error(`${ERROR_MESSAGES.API.DRONEDEPLOY_ERROR}: ${error.message}`);
      }
    }
  };
}

/**
 * Get project ID for a given map plan
 * @param {string} planId - Map plan ID
 * @param {string} apiKey - DroneDeploy API key
 * @returns {Promise<string>} Project ID
 */
async function getProjectId(planId, apiKey) {
  const validatedPlanId = validatePlanId(planId);
  const client = createGraphQLClient(apiKey);
  
  const query = `
    query GetProjectId($planId: ID!) {
      mapPlan(id: $planId) {
        project {
          id
        }
      }
    }
  `;
  
  try {
    const data = await client(query, { planId: `MapPlan:${validatedPlanId}` });
    
    if (!data.mapPlan?.project?.id) {
      throw new Error('Map plan not found or no associated project');
    }
    
    return data.mapPlan.project.id;
  } catch (error) {
    throw new Error(`Failed to retrieve project ID: ${error.message}`);
  }
}

/**
 * Format geometry for GraphQL mutation
 * @param {Object|Array} geometry - Annotation geometry
 * @param {string} annotationType - Type of annotation
 * @returns {string} Formatted geometry string
 */
function formatGeometryForGraphQL(geometry, annotationType) {
  switch (annotationType) {
    case 'LOCATION':
      return `{lat: ${geometry.lat}, lng: ${geometry.lng}}`;
      
    case 'AREA':
      // Ensure polygon is closed
      const areaCoords = [...geometry];
      if (areaCoords.length >= 3) {
        const first = areaCoords[0];
        const last = areaCoords[areaCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          areaCoords.push(first); // Close the polygon
        }
      }
      const areaCoordStrings = areaCoords.map(coord => `{lat: ${coord[1]}, lng: ${coord[0]}}`);
      return `[${areaCoordStrings.join(', ')}]`;
      
    case 'LINE':
      const lineCoordStrings = geometry.map(coord => `{lat: ${coord[1]}, lng: ${coord[0]}}`);
      return `[${lineCoordStrings.join(', ')}]`;
      
    default:
      throw new Error(`Unsupported annotation type: ${annotationType}`);
  }
}

/**
 * Create annotation via GraphQL mutation
 * @param {Object} annotation - Annotation object
 * @param {string} planId - Map plan ID
 * @param {string} apiKey - DroneDeploy API key
 * @returns {Promise<Object>} Created annotation result
 */
async function createAnnotation(annotation, planId, apiKey) {
  const validatedPlanId = validatePlanId(planId);
  const client = createGraphQLClient(apiKey);
  
  const formattedGeometry = formatGeometryForGraphQL(annotation.geometry, annotation.annotationType);
  
  const mutation = `
    mutation CreateAnnotation {
      createAnnotation(
        planId: "MapPlan:${validatedPlanId}"
        annotationType: ${annotation.annotationType.toLowerCase()}
        color: "${annotation.color}"
        fillColor: "${annotation.fillColor}"
        title: "${annotation.title.replace(/"/g, '\\"')}"
        geometry: ${formattedGeometry}
      ) {
        id
        title
        color
        fillColor
        annotationType
      }
    }
  `;
  
  try {
    const data = await client(mutation);
    
    if (!data.createAnnotation) {
      throw new Error('Failed to create annotation - no data returned');
    }
    
    return {
      success: true,
      annotation: data.createAnnotation,
      originalTitle: annotation.title
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      originalTitle: annotation.title
    };
  }
}

/**
 * Create multiple annotations with batch processing
 * @param {Array} annotations - Array of annotation objects
 * @param {string} planId - Map plan ID
 * @param {string} apiKey - DroneDeploy API key
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Object>} Batch upload results
 */
async function createAnnotationsBatch(annotations, planId, apiKey, onProgress = null) {
  const results = [];
  const errors = [];
  const BATCH_SIZE = 25;
  let completed = 0;

  for (let batchStart = 0; batchStart < annotations.length; batchStart += BATCH_SIZE) {
    const batch = annotations.slice(batchStart, batchStart + BATCH_SIZE);

    // Map each annotation in the batch to a promise
    const promises = batch.map((annotation, idx) =>
      createAnnotation(annotation, planId, apiKey)
        .then(result => ({ result, annotation, index: batchStart + idx }))
        .catch(error => ({ error, annotation, index: batchStart + idx }))
    );

    // Wait for all in this batch to finish
    const batchResults = await Promise.all(promises);

    for (const { result, error, annotation, index } of batchResults) {
      if (result && result.success) {
        results.push(result);
      } else {
        errors.push({
          annotation: annotation.title,
          error: (result && result.error) || (error && error.message) || 'Unknown error',
          index: index + 1
        });
      }

      completed++;
      if (onProgress) {
        onProgress({
          completed,
          total: annotations.length,
          current: annotation.title,
          success: result ? result.success : false
        });
      }
    }

    // Add delay between batches to respect rate limits
    if (batchStart + BATCH_SIZE < annotations.length) {
      await new Promise(resolve => setTimeout(resolve, DRONEDEPLOY_CONFIG.BATCH_DELAY));
    }
  }

  return {
    success: true,
    results,
    errors,
    totalProcessed: annotations.length,
    successCount: results.length,
    errorCount: errors.length
  };
}

/**
 * Validate API connectivity and permissions
 * @param {string} apiKey - DroneDeploy API key
 * @returns {Promise<boolean>} True if API is accessible
 */
async function validateApiConnection(apiKey) {
  const client = createGraphQLClient(apiKey);
  
  const query = `
    query TestConnection {
      viewer {
        id
        username
      }
    }
  `;
  
  try {
    const data = await client(query);
    return !!data.viewer?.id;
  } catch (error) {
    throw new Error(`API connection failed: ${error.message}`);
  }
}

/**
 * Get map plan details
 * @param {string} planId - Map plan ID
 * @param {string} apiKey - DroneDeploy API key
 * @returns {Promise<Object>} Map plan details
 */
async function getMapPlanDetails(planId, apiKey) {
  const validatedPlanId = validatePlanId(planId);
  const client = createGraphQLClient(apiKey);
  
  const query = `
    query GetMapPlan($planId: ID!) {
      mapPlan(id: $planId) {
        id
        title
        project {
          id
          title
        }
        camera {
          lat
          lng
        }
      }
    }
  `;
  
  try {
    const data = await client(query, { planId: `MapPlan:${validatedPlanId}` });
    
    if (!data.mapPlan) {
      throw new Error('Map plan not found');
    }
    
    return data.mapPlan;
  } catch (error) {
    throw new Error(`Failed to get map plan details: ${error.message}`);
  }
}

module.exports = {
  createGraphQLClient,
  getProjectId,
  createAnnotation,
  createAnnotationsBatch,
  validateApiConnection,
  getMapPlanDetails,
  formatGeometryForGraphQL
};



