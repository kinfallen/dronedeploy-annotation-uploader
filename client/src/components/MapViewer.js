import React, { useEffect, useRef, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import L from 'leaflet';

// Fix for default markers not showing up in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom colored icons
const createColoredIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const MapViewer = ({ annotations, height = 400 }) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);
  
  // Generate a unique ID for this map instance
  const mapId = useMemo(() => `map-${Date.now()}-${Math.random()}`, []);

  // Calculate bounds and center from all annotations
  const mapBounds = useMemo(() => {
    if (annotations.length === 0) {
      return {
        center: [-38.1858, 145.8111], // Default center
        bounds: null
      };
    }
    
    const coordinates = [];
    
    annotations.forEach(annotation => {
      // Handle server-converted format (lat/lng properties for points)
      if (annotation.lat && annotation.lng) {
        coordinates.push([annotation.lat, annotation.lng]);
      }
      // Handle server-converted format (geometry array for polygons/lines)
      else if (Array.isArray(annotation.geometry)) {
        annotation.geometry.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            const [lng, lat] = coord;
            if (typeof lat === 'number' && typeof lng === 'number') {
              coordinates.push([lat, lng]);
            }
          }
        });
      }
      // Handle original GeoJSON format (fallback)
      else if (annotation.geometry?.type === 'Point' && annotation.geometry?.coordinates) {
        const [lng, lat] = annotation.geometry.coordinates;
        coordinates.push([lat, lng]);
      } else if (annotation.geometry?.type === 'Polygon' && annotation.geometry?.coordinates) {
        const outerRing = annotation.geometry.coordinates[0];
        outerRing.forEach(([lng, lat]) => {
          coordinates.push([lat, lng]);
        });
      } else if (annotation.geometry?.type === 'LineString' && annotation.geometry?.coordinates) {
        annotation.geometry.coordinates.forEach(([lng, lat]) => {
          coordinates.push([lat, lng]);
        });
      }
    });
    
    if (coordinates.length === 0) {
      return {
        center: [-38.1858, 145.8111],
        bounds: null
      };
    }
    
    // Calculate bounds
    const lats = coordinates.map(coord => coord[0]);
    const lngs = coordinates.map(coord => coord[1]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    console.log('MapViewer bounds calculation:', {
      coordinates: coordinates.slice(0, 3), // Log first 3 for debugging
      totalCoords: coordinates.length,
      bounds: [[minLat, minLng], [maxLat, maxLng]],
      center: [centerLat, centerLng]
    });
    
    return {
      center: [centerLat, centerLng],
      bounds: [[minLat, minLng], [maxLat, maxLng]]
    };
  }, [annotations]);

  // Clear existing markers
  const clearMarkers = () => {
    if (mapRef.current) {
      markersRef.current.forEach(marker => {
        if (mapRef.current.hasLayer(marker)) {
          mapRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
    }
  };

  // Add annotations to map
  const addAnnotationsToMap = (map) => {
    clearMarkers();
    const bounds = [];

    annotations.forEach((annotation, index) => {
      const { type, annotationType, title, color, fillColor } = annotation;
      const finalType = type || annotationType; // Handle both server and original formats

      // Handle server-converted format for LOCATION (Points) - lat/lng directly on annotation
      if ((finalType === 'LOCATION' || finalType === 'POINT') && annotation.lat && annotation.lng) {
        // Point marker - server format has lat/lng directly on annotation
        const marker = L.marker([annotation.lat, annotation.lng], {
          icon: createColoredIcon(color)
        }).addTo(map);

        marker.bindPopup(`
          <div>
            <strong>${title}</strong><br/>
            <span style="font-size: 12px; color: #666;">${finalType}</span><br/>
            <span style="font-size: 11px;">${annotation.lat.toFixed(6)}, ${annotation.lng.toFixed(6)}</span>
          </div>
        `);

        markersRef.current.push(marker);
        bounds.push([annotation.lat, annotation.lng]);

      } 
      // Handle original format for LOCATION (Points) - nested under geometry
      else if ((finalType === 'LOCATION' || finalType === 'POINT') && annotation.geometry?.lat && annotation.geometry?.lng) {
        // Point marker - original format has lat/lng under geometry
        const marker = L.marker([annotation.geometry.lat, annotation.geometry.lng], {
          icon: createColoredIcon(color)
        }).addTo(map);

        marker.bindPopup(`
          <div>
            <strong>${title}</strong><br/>
            <span style="font-size: 12px; color: #666;">${finalType}</span><br/>
            <span style="font-size: 11px;">${annotation.geometry.lat.toFixed(6)}, ${annotation.geometry.lng.toFixed(6)}</span>
          </div>
        `);

        markersRef.current.push(marker);
        bounds.push([annotation.geometry.lat, annotation.geometry.lng]);

      } 
      // Handle server-converted format for AREA (Polygons) - geometry array
      else if ((finalType === 'AREA' || finalType === 'POLYGON') && Array.isArray(annotation.geometry)) {
        // Polygon - handle both flat array and nested array formats
        let coordinates;
        
        // Check if it's a nested array (GeoJSON format) or flat array (CSV format)
        if (Array.isArray(annotation.geometry[0]) && Array.isArray(annotation.geometry[0][0])) {
          // Nested format: [[[lng,lat], [lng,lat], ...]]
          coordinates = annotation.geometry[0];
        } else if (Array.isArray(annotation.geometry[0])) {
          // Flat format: [[lng,lat], [lng,lat], ...]
          coordinates = annotation.geometry;
        } else {
          console.warn('Invalid AREA geometry format:', annotation.geometry);
          return;
        }
        
        // Convert to [lat, lng] format and filter out invalid coordinates
        const positions = coordinates
          .filter(coord => Array.isArray(coord) && coord.length >= 2 && 
                          typeof coord[0] === 'number' && typeof coord[1] === 'number')
          .map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
        
        if (positions.length >= 3) { // Need at least 3 points for a polygon (backend will auto-close)
          try {
            const polygon = L.polygon(positions, {
              color: color,
              fillColor: fillColor || color,
              fillOpacity: 0.3,
              weight: 2
            }).addTo(map);

            polygon.bindPopup(`
              <div>
                <strong>${title}</strong><br/>
                <span style="font-size: 12px; color: #666;">${annotationType}</span><br/>
                <span style="font-size: 11px;">${positions.length} vertices</span>
              </div>
            `);

            markersRef.current.push(polygon);
            positions.forEach(pos => bounds.push(pos));
          } catch (error) {
            console.error('Error creating polygon for', title, ':', error);
          }
        } else {
          console.warn('AREA annotation needs at least 3 valid coordinate pairs (backend auto-closes polygon), got:', positions.length);
        }

      } else if (annotationType === 'LINE' && Array.isArray(annotation.geometry)) {
        // Line - convert coordinates and filter out invalid ones
        const positions = annotation.geometry
          .filter(coord => Array.isArray(coord) && coord.length >= 2 && 
                          typeof coord[0] === 'number' && typeof coord[1] === 'number')
          .map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
        
        if (positions.length >= 2) { // Need at least 2 points for a line
          try {
            const polyline = L.polyline(positions, {
              color: color,
              weight: 3,
              opacity: 0.8
            }).addTo(map);

            polyline.bindPopup(`
              <div>
                <strong>${title}</strong><br/>
                <span style="font-size: 12px; color: #666;">${annotationType}</span><br/>
                <span style="font-size: 11px;">${positions.length} points</span>
              </div>
            `);

            markersRef.current.push(polyline);
            positions.forEach(pos => bounds.push(pos));
          } catch (error) {
            console.error('Error creating polyline for', title, ':', error);
          }
        } else {
          console.warn('LINE annotation needs at least 2 valid coordinate pairs, got:', positions.length);
        }
      }
      // Handle original GeoJSON format (fallback)
      else if (annotation.geometry?.type === 'Point' && annotation.geometry?.coordinates) {
        const [lng, lat] = annotation.geometry.coordinates;
        const marker = L.marker([lat, lng], {
          icon: createColoredIcon(color)
        }).addTo(map);

        marker.bindPopup(`
          <div>
            <strong>${title}</strong><br/>
            <span style="font-size: 12px; color: #666;">Point</span><br/>
            <span style="font-size: 11px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
          </div>
        `);

        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      }
      else {
        console.warn('Unsupported annotation format:', {
          type: finalType,
          hasLat: !!annotation.lat,
          hasLng: !!annotation.lng,
          hasGeometry: !!annotation.geometry,
          geometryType: annotation.geometry?.type,
          annotation
        });
      }
    });

    // Fit bounds if we have annotations
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.log('Map bounds fitting error:', error);
      }
    }
    
    console.log('MapViewer addAnnotationsToMap:', {
      totalAnnotations: annotations.length,
      boundsCount: bounds.length,
      markersAdded: markersRef.current.length
    });
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || annotations.length === 0) return;

    // Clean up existing map
    if (mapRef.current) {
      clearMarkers();
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create new map
    const map = L.map(containerRef.current, {
      center: mapBounds.center,
      zoom: 15, // Default zoom, will be adjusted with fitBounds if we have bounds
      scrollWheelZoom: true
    });

    // Add satellite tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 18
    }).addTo(map);

    mapRef.current = map;

    // Add annotations
    addAnnotationsToMap(map);

    // Fit bounds to show all annotations with padding
    if (mapBounds.bounds) {
      // Add some padding around the bounds
      map.fitBounds(mapBounds.bounds, {
        padding: [20, 20], // 20px padding on all sides
        maxZoom: 16 // Don't zoom in too much for single points
      });
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        clearMarkers();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, mapBounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        clearMarkers();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (annotations.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Upload a file to see annotation${annotations.length === 1 ? '' : 's'} on the map
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Map Preview ({annotations.length} annotation{annotations.length === 1 ? '' : 's'})
        </Typography>
        <Box sx={{ height, borderRadius: 1, overflow: 'hidden' }}>
          <div
            id={mapId}
            ref={containerRef}
            style={{ 
              height: '100%', 
              width: '100%',
              borderRadius: '4px'
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default MapViewer;