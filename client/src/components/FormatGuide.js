import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  ExpandMore,
  LocationOn,
  Crop,
  Timeline,
  Description,
  Download
} from '@mui/icons-material';

const FormatGuide = ({ onBack }) => {
  const csvExample = `annotationType,title,lat,lng,color,fillColor
LOCATION,"Main Entrance",37.7749,-122.4194,#FF0000,#FF0000
AREA,"Building Outline",37.7750,-122.4195,#00FF00,#00FF00
AREA,"Parking Lot",37.7748,-122.4193,#0000FF,#0000FF
LINE,"Property Line",37.7751,-122.4196,#FFFF00,#FFFF00`;

  const geoJsonExample = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "title": "Main Entrance",
        "color": "#FF0000",
        "fillColor": "#FF0000"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "title": "Building Outline",
        "color": "#00FF00",
        "fillColor": "#00FF00"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-122.4195, 37.7750],
          [-122.4190, 37.7750],
          [-122.4190, 37.7745],
          [-122.4195, 37.7745],
          [-122.4195, 37.7750]
        ]]
      }
    }
  ]
}`;

  const kmlExample = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Main Entrance</name>
      <description>Entry point</description>
      <Style>
        <IconStyle>
          <color>ff0000ff</color>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>-122.4194,37.7749,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Building Outline</name>
      <Style>
        <PolyStyle>
          <color>7f00ff00</color>
        </PolyStyle>
      </Style>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              -122.4195,37.7750,0
              -122.4190,37.7750,0
              -122.4190,37.7745,0
              -122.4195,37.7745,0
              -122.4195,37.7750,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

  const formatSpecs = [
    {
      format: 'CSV',
      icon: <Description color="secondary" />,
      description: 'Comma-separated values with headers',
      annotationTypes: ['LOCATION', 'AREA', 'LINE'],
      requiredFields: ['annotationType', 'title', 'lat', 'lng'],
      optionalFields: ['color', 'fillColor', 'description'],
      notes: [
        'First row must contain column headers',
        'AREA requires minimum 3 coordinate pairs (lat,lng)',
        'LINE requires minimum 2 coordinate pairs',
        'For multi-point annotations, use additional lat/lng columns (lat2,lng2,lat3,lng3...)',
        'Colors can be hex (#FF0000) or named (red)',
        'If no fillColor provided, color value is used for fill'
      ],
      example: csvExample
    },
    {
      format: 'GeoJSON',
      icon: <LocationOn color="primary" />,
      description: 'Geographic JSON format following RFC 7946',
      annotationTypes: ['Point → LOCATION', 'Polygon → AREA', 'LineString → LINE'],
      requiredFields: ['type: "FeatureCollection"', 'features array'],
      optionalFields: ['properties.color', 'properties.fillColor', 'properties.description'],
      notes: [
        'Must be valid GeoJSON FeatureCollection',
        'Point coordinates: [longitude, latitude]',
        'Polygon must be closed (first and last coordinates identical)',
        'LineString minimum 2 coordinates',
        'Properties object contains annotation metadata',
        'Color properties should be hex values'
      ],
      example: geoJsonExample
    },
    {
      format: 'KML/KMZ',
      icon: <Crop color="success" />,
      description: 'Google Earth format (KMZ is compressed KML)',
      annotationTypes: ['Point → LOCATION', 'Polygon → AREA', 'LineString → LINE'],
      requiredFields: ['<Placemark>', '<name>', 'geometry element'],
      optionalFields: ['<Style>', '<description>', '<ExtendedData>'],
      notes: [
        'Valid XML structure required',
        'Colors in KML are AABBGGRR format (alpha, blue, green, red)',
        'Coordinates format: longitude,latitude,altitude',
        'KMZ files are automatically extracted',
        'Multiple placemarks supported',
        'Styles can be inline or referenced'
      ],
      example: kmlExample
    }
  ];

  const colorFormats = [
    { format: 'Hex with #', example: '#FF0000', description: 'Standard web color' },
    { format: 'Hex without #', example: 'FF0000', description: 'Raw hex value' },
    { format: 'Named colors', example: 'red, blue, green', description: 'CSS color names' },
    { format: 'RGB', example: 'rgb(255,0,0)', description: 'RGB function' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{ mb: 3 }}
        >
          Back to Uploader
        </Button>
        
        <Typography variant="h4" sx={{ 
          fontFamily: 'Urbanist',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #3F48E9 0%, #FAAF33 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          File Format Guide
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Complete reference for uploading annotations to DroneDeploy
        </Typography>
        
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            <strong>Supported Annotation Types:</strong> Location points, Area boundaries, and Line features. 
            All coordinates should be in WGS84 (latitude/longitude) format.
          </Typography>
        </Alert>
      </Box>

      {/* Format Details */}
      {formatSpecs.map((spec, index) => (
        <Accordion key={spec.format} defaultExpanded={index === 0} sx={{ mb: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            sx={{
              backgroundColor: 'rgba(63, 72, 233, 0.05)',
              '&:hover': { backgroundColor: 'rgba(63, 72, 233, 0.1)' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {spec.icon}
              <Typography variant="h6" sx={{ fontFamily: 'Urbanist', fontWeight: 600 }}>
                {spec.format}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {spec.description}
              </Typography>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              
              {/* Annotation Types */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Supported Annotation Types:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {spec.annotationTypes.map((type) => (
                    <Chip 
                      key={type}
                      label={type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              {/* Fields */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'error.main' }}>
                    Required Fields:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {spec.requiredFields.map((field) => (
                      <Typography key={field} variant="body2" sx={{ fontFamily: 'monospace' }}>
                        • {field}
                      </Typography>
                    ))}
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'success.main' }}>
                    Optional Fields:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {spec.optionalFields.map((field) => (
                      <Typography key={field} variant="body2" sx={{ fontFamily: 'monospace' }}>
                        • {field}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Notes */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Important Notes:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {spec.notes.map((note, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                      • {note}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Example */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Example {spec.format}:
                </Typography>
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      color: '#a3a3a3'
                    }}
                  >
                    {spec.example}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Color Reference */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: 'rgba(26, 26, 26, 0.98)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Urbanist', fontWeight: 600 }}>
          Color Format Reference
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Format</TableCell>
                <TableCell>Example</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {colorFormats.map((color) => (
                <TableRow key={color.format}>
                  <TableCell sx={{ fontWeight: 600 }}>{color.format}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{color.example}</TableCell>
                  <TableCell>{color.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Color Standardization:</strong> When enabled, all colors are automatically mapped to DroneDeploy's 
            10 supported colors using perceptual matching. You can customize these mappings in the preview step.
          </Typography>
        </Alert>
      </Paper>

      {/* Sample Files Note */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'rgba(250, 175, 51, 0.1)', border: '1px solid rgba(250, 175, 51, 0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Download color="secondary" />
          <Typography variant="h6" sx={{ fontFamily: 'Urbanist', fontWeight: 600 }}>
            Sample Files
          </Typography>
        </Box>
        <Typography variant="body2">
          Sample files for each format are included in the <code>templates/</code> folder of this application. 
          These demonstrate proper formatting and include examples of all annotation types.
        </Typography>
      </Paper>

      {/* Back Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={onBack}
          size="large"
        >
          Back to Uploader
        </Button>
      </Box>
    </Box>
  );
};

export default FormatGuide;
