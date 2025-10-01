# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Start the Application
```bash
# In your terminal, navigate to the project directory
cd /Users/samuel/DDAnnotationImporter_v0.2

# Start both servers (backend + frontend)
npm run dev
```

### 2. Open the App
- Open your browser to: **http://localhost:3000**
- You should see the DroneDeploy Annotation Uploader interface

### 3. Test with Sample Data
- Use any file from the `templates/` folder:
  - `sample_locations.csv` (10 location annotations)
  - `sample_annotations.geojson` (mixed annotation types)
  - `sample_annotations.kml` (KML format)

## 📋 What You'll Need

### DroneDeploy Information
- **Map ID**: Just the ID from your DroneDeploy map URL
- **API Key**: From your DroneDeploy account settings

### How to Get Your Map ID
1. Open your map in DroneDeploy
2. Copy the URL from your browser
3. URL format: `https://www.dronedeploy.com/app2/sites/PROJECT_ID/maps/MAP_ID`
4. Copy just the MAP_ID part (after `/maps/`)

**Example:**
- **Browser URL**: `https://www.dronedeploy.com/app2/sites/661cc9454b7dd3a26e217c3e/maps/68cb3c598eab2a602e1a12a4`
- **Enter in app**: `68cb3c598eab2a602e1a12a4`

*The app automatically adds "MapPlan:" when uploading.*

## 🔧 If You Need to Stop/Start

### Stop the Application
- Press `Ctrl+C` in the terminal where you ran `npm run dev`

### Start Again
```bash
npm run dev
```

## 📁 Try These Sample Files

1. **`templates/sample_locations.csv`** - 14 annotations: locations, areas, and lines
2. **`templates/sample_annotations.geojson`** - 6 mixed annotations (locations, areas, lines)
3. **`templates/sample_annotations.kml`** - KML format with 5 locations
4. **`templates/template.csv`** - Simple template showing all 3 annotation types

## 🏗️ Architecture

- **Frontend**: React app running on http://localhost:3000
- **Backend**: Express API server on http://localhost:3001
- **File Processing**: All done locally on your machine
- **Security**: API keys never leave your computer except to call DroneDeploy
- **Satellite View**: High-resolution satellite imagery for precise annotation placement

## ✅ Success Indicators

When everything is working:
- Browser shows the stepper interface
- File uploads process successfully
- **Interactive map shows your annotations immediately after upload** 🗺️
- Map appears again in preview step with table view
- Annotations preview correctly in both map and table
- Upload to DroneDeploy completes (with your real API key)

## 🔍 Troubleshooting

### Servers Won't Start
- Make sure ports 3000 and 3001 are available
- Run `npm run install-all` if you see dependency errors

### File Upload Fails
- Check file format matches templates
- Ensure file is under 10MB
- Verify CSV columns are correct

### DroneDeploy Upload Fails
- Double-check your MapPlan ID format
- Verify API key is correct and active
- Ensure you have permissions for the target map

### Map Not Loading
- Maps now use native Leaflet for maximum stability
- Each map instance is completely independent
- **Annotation types show as**:
  - 🎯 **LOCATION**: Circular markers (points)
  - 🔺 **AREA**: Filled polygons with boundaries
  - 📏 **LINE**: Colored paths/lines
- Maps load instantly without conflicts

---

**Ready to go!** The application is designed to be stable and lightweight across both Windows and macOS. 🎯
