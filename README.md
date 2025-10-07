# DroneDeploy Annotation Uploader

A modern, lightweight web application for uploading annotations to DroneDeploy maps via their GraphQL API. Built with React and Node.js for cross-platform stability and excellent user experience.

**GraphQL Endpoint**: `https://www.dronedeploy.com/graphql`

## Features

- **Multiple File Formats**: Support for CSV, GeoJSON, KML, and KMZ files
- **Drag & Drop Interface**: Modern UI with drag and drop file upload
- **Interactive Map Viewer**: Visualize annotations on an interactive map 🗺️
- **Real-time Preview**: Preview annotations before uploading in table and map views
- **Batch Upload**: Upload multiple annotations with progress tracking
- **Error Handling**: Comprehensive error reporting and retry capabilities
- **Cross-platform**: Works identically on Windows and macOS
- **Secure**: API keys stored locally, only sent to DroneDeploy

## Supported Annotation Types

- **LOCATION**: Point-based annotations (single lat/lng coordinate pair)
- **AREA**: Polygon-based annotations (minimum 3 coordinate pairs, automatically closed by backend)
- **LINE**: Line-based annotations (minimum 2 coordinate pairs for paths)

## Quick Start

### Prerequisites

- Node.js 16+ installed
- DroneDeploy API key
- MapPlan ID from your DroneDeploy map

### Installation

1. Install dependencies:
```bash
npm run install-all
```

2. Start the application:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Usage Guide

### Step 1: Upload File
- Drag and drop your annotation file or click to browse
- Supported formats: CSV, GeoJSON, KML, KMZ
- Maximum file size: 10MB

### Step 2: Configure Settings
- Enter your **Map ID** (just the ID part from your DroneDeploy map URL)
- Enter your **API Key** (from DroneDeploy settings)

### Step 3: Preview Annotations
- Review all annotations that will be uploaded
- Check annotation types, colors, and coordinates
- Preview individual annotations

### Step 4: Upload & Results
- Upload all annotations to DroneDeploy
- View detailed results with success/failure reports
- Retry failed uploads or start with a new file

## 🗺️ Interactive Satellite Map Viewer

The app includes an interactive satellite map viewer for precise annotation visualization:

- **High-Resolution Satellite Imagery**: Esri World Imagery for accurate positioning
- **Real-time Visualization**: See annotations immediately after file upload
- **Multiple Annotation Types**: 
  - 🎯 Location points with colored markers
  - 🔺 Area polygons with fill colors  
  - 📏 Line paths with customizable colors
- **Interactive Features**:
  - Click on annotations for details
  - Zoom and pan to explore satellite imagery
  - Automatic bounds fitting to show all annotations
- **Precise Placement**: Satellite view helps verify annotation accuracy
- **Preview Before Upload**: Review annotation placement on satellite imagery before sending to DroneDeploy

## File Format Templates

### CSV Format

The CSV file should include these columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| type | Yes | Annotation type | LOCATION, AREA, LINE |
| title | Yes | Annotation name | "Building A" |
| lat | For LOCATION | Latitude | -38.18583043875179 |
| lng | For LOCATION | Longitude | 145.81114563959918 |
| color | Yes | Border color | #2196f3 |
| fillColor | No | Fill color | #64b5f6 |
| geometry | For AREA/LINE | Coordinate array as JSON string | See examples below |

#### Example CSV with all types:
```csv
type,title,lat,lng,color,fillColor,geometry
LOCATION,Equipment Storage,-38.18583043875179,145.81114563959918,#6639b6,#8c6bc8,
AREA,Building Footprint,,,#4caf50,#81c784,"[[145.81090,-38.1857],[145.81120,-38.1857],[145.81120,-38.1859]]"
LINE,Access Road,,,#ff9800,#ffb74d,"[[145.81070,-38.1858],[145.81080,-38.1859],[145.81090,-38.1860]]"
```

#### Geometry Format Notes:
- **LOCATION**: Use `lat` and `lng` columns, leave `geometry` empty
- **AREA**: Use `geometry` column with array of [lng,lat] pairs, minimum 3 points (automatically closed by backend)
- **LINE**: Use `geometry` column with array of [lng,lat] pairs, minimum 2 points

### GeoJSON Format

Standard GeoJSON format with additional properties:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "type": "LOCATION",
        "name": "Sample Location",
        "color": "#2196f3",
        "fillColor": "#64b5f6"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [145.81114563959918, -38.18583043875179]
      }
    }
  ]
}
```

### KML Format

Standard KML format with Placemark elements:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Sample Location</name>
      <Point>
        <coordinates>145.81114563959918,-38.18583043875179,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>
```

### KMZ Format

Compressed KML files (.kmz) are automatically extracted and processed.

## Finding Your Map ID

1. Open your map in DroneDeploy
2. Look at the URL in your browser
3. The URL format is: `https://www.dronedeploy.com/app2/sites/PROJECT_ID/maps/MAP_ID`
4. Copy just the **MAP_ID** part (after `/maps/`)
5. **Examples**: 
   - URL: `https://www.dronedeploy.com/app2/sites/661cc9454b7dd3a26e217c3e/maps/68cb3c598eab2a602e1a12a4`
   - Enter in app: `68cb3c598eab2a602e1a12a4`
   
   - URL: `https://www.dronedeploy.com/app2/sites/507f1f77bcf86cd799439011/maps/6729ae04309c758354e71ce1`  
   - Enter in app: `6729ae04309c758354e71ce1`

*Note: The app automatically adds the "MapPlan:" prefix when uploading to DroneDeploy.*

### Map ID Format
DroneDeploy Map IDs are typically 24-character alphanumeric strings like:
- `68cb3c598eab2a602e1a12a4`
- `6729ae04309c758354e71ce1` 
- `507f1f77bcf86cd799439011`

## API Key Setup

1. Go to DroneDeploy Settings
2. Navigate to API section
3. Generate or copy your API key
4. The key should start with your organization identifier

## File Templates

Sample files are provided in the `templates/` directory:

- `template.csv` - Basic CSV template
- `sample_locations.csv` - Sample location annotations
- `sample_annotations.geojson` - Sample GeoJSON with multiple types
- `sample_annotations.kml` - Sample KML file

## Troubleshooting

### Common Upload Errors

- **Invalid coordinates**: Ensure lat/lng values are within valid ranges
- **Malformed geometry**: Check JSON syntax for complex geometries
- **API authentication**: Verify your API key is correct and active
- **MapPlan permissions**: Ensure you have upload permissions for the target map

### Performance Tips

- Keep files under 1000 annotations for best performance
- Use batch processing for very large datasets
- Check network connectivity for upload issues

## Development

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   └── App.js        # Main application
├── server/                # Express backend
│   └── index.js          # API server
├── templates/            # Sample files
└── uploads/             # Temporary upload directory
```

### Available Scripts

- `npm run dev` - Start development servers
- `npm run client` - Start React development server only
- `npm run server` - Start Express server only
- `npm run build` - Build production version
- `npm run install-all` - Install all dependencies

### Environment

- Frontend: React 19 + Material-UI 5 + Native Leaflet Maps
- Backend: Node.js + Express
- File parsing: CSV parser, XML2JS, JSZip
- HTTP client: Axios
- Mapping: Leaflet.js + Esri Satellite Imagery

## Security

- API keys are stored locally in browser memory only
- Keys are only transmitted to DroneDeploy's API endpoints
- No data is sent to any third-party services
- All file processing happens locally

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the DroneDeploy API documentation
3. Verify your file format matches the templates
4. Check browser console for detailed error messages

## License

MIT License - see LICENSE file for details