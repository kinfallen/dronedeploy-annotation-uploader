const convertToAnnotations = (data, fileType) => {
  const annotations = [];

  if (fileType === 'csv') {
    data.forEach(row => {
      const annotation = {
        annotationType: row.type?.toUpperCase() || 'LOCATION',
        title: row.title || row.name || 'Untitled',
        color: row.color || '#2196f3',
        fillColor: row.fillColor || '#64b5f6',
      };

      if (annotation.annotationType === 'LOCATION' && row.lat && row.lng) {
        annotation.geometry = {
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng)
        };
      } else if ((annotation.annotationType === 'AREA' || annotation.annotationType === 'LINE') && row.geometry) {
        try {
          annotation.geometry = JSON.parse(row.geometry);
        } catch (e) {
          console.error('Failed to parse geometry for', annotation.annotationType, ':', row.geometry);
        }
      } else if (row.geometry) {
        try {
          annotation.geometry = JSON.parse(row.geometry);
        } catch (e) {
          console.error('Failed to parse geometry:', row.geometry);
        }
      }

      annotations.push(annotation);
    });
  } else if (fileType === 'geojson') {
    data.forEach(feature => {
      const annotation = {
        annotationType: feature.properties?.type?.toUpperCase() || 'LOCATION',
        title: feature.properties?.name || feature.properties?.title || 'Untitled',
        color: feature.properties?.color || '#2196f3',
        fillColor: feature.properties?.fillColor || '#64b5f6',
      };

      if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
          annotation.annotationType = 'LOCATION';
          annotation.geometry = {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          };
        } else if (feature.geometry.type === 'Polygon') {
          annotation.annotationType = 'AREA';
          annotation.geometry = feature.geometry.coordinates[0];
        } else if (feature.geometry.type === 'LineString') {
          annotation.annotationType = 'LINE';
          annotation.geometry = feature.geometry.coordinates;
        }
      }

      annotations.push(annotation);
    });
  } else if (fileType === 'kml') {
    data.forEach(placemark => {
      const annotation = {
        title: placemark.name?.[0] || 'Untitled',
        color: '#2196f3',
        fillColor: '#64b5f6',
      };

      if (placemark.Point && placemark.Point[0].coordinates) {
        annotation.annotationType = 'LOCATION';
        const coords = placemark.Point[0].coordinates[0].split(',');
        annotation.geometry = {
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0])
        };
      }
      else if (placemark.Polygon && placemark.Polygon[0].outerBoundaryIs) {
        annotation.annotationType = 'AREA';
        const coords = placemark.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0]
          .trim().split(/\s+/)
          .map(coord => coord.split(','))
          .map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
        annotation.geometry = coords;
      }
      else if (placemark.LineString && placemark.LineString[0].coordinates) {
        annotation.annotationType = 'LINE';
        const coords = placemark.LineString[0].coordinates[0]
          .trim().split(/\s+/)
          .map(coord => coord.split(','))
          .map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
        annotation.geometry = coords;
      }

      if (annotation.annotationType) {
        annotations.push(annotation);
      }
    });
  }

  return annotations;
};

module.exports = {
  convertToAnnotations
};
