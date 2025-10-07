/**
 * Upload History Management
 * Stores and retrieves upload history from localStorage
 */

const UPLOAD_HISTORY_KEY = 'dronedeploy_upload_history';
const MAX_HISTORY_ENTRIES = 50; // Keep last 50 uploads

export const saveUploadToHistory = (uploadData) => {
  try {
    const history = getUploadHistory();
    
    const newEntry = {
      id: Date.now().toString(), // Simple ID based on timestamp
      timestamp: new Date().toISOString(),
      mapId: uploadData.mapId,
      mapName: uploadData.mapName,
      mapDate: uploadData.mapDate,
      totalAnnotations: uploadData.totalAnnotations,
      annotationTypes: uploadData.annotationTypes, // e.g., { point: 5, polygon: 3 }
      successfulAnnotationIds: uploadData.successfulAnnotationIds,
      projectId: uploadData.projectId
    };
    
    // Add to beginning of array (most recent first)
    history.unshift(newEntry);
    
    // Keep only the most recent entries
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);
    
    localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(trimmedHistory));
    
    return newEntry;
  } catch (error) {
    console.error('Failed to save upload to history:', error);
    return null;
  }
};

export const getUploadHistory = () => {
  try {
    const history = localStorage.getItem(UPLOAD_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get upload history:', error);
    return [];
  }
};

export const removeUploadFromHistory = (uploadId) => {
  try {
    const history = getUploadHistory();
    const updatedHistory = history.filter(entry => entry.id !== uploadId);
    localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Failed to remove upload from history:', error);
    return false;
  }
};

export const clearUploadHistory = () => {
  try {
    localStorage.removeItem(UPLOAD_HISTORY_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear upload history:', error);
    return false;
  }
};

export const formatUploadSummary = (entry) => {
  const date = new Date(entry.timestamp);
  const formattedDate = date.toLocaleString();
  
  const typesSummary = Object.entries(entry.annotationTypes || {})
    .map(([type, count]) => `${count} ${type}${count === 1 ? '' : 's'}`)
    .join(', ');
  
  return {
    title: `${entry.mapName} (${entry.mapDate})`,
    subtitle: `${entry.totalAnnotations} annotation${entry.totalAnnotations === 1 ? '' : 's'} • ${formattedDate}`,
    details: typesSummary || 'Mixed types',
    annotationCount: entry.successfulAnnotationIds?.length || 0
  };
};
