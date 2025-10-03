const fs = require('fs');
const csv = require('csv-parser');
const xml2js = require('xml2js');
const JSZip = require('jszip');

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseGeoJSON = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const geojson = JSON.parse(data);
        resolve(geojson.features || []);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
};

const parseKML = async (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', async (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(data);
        const placemarks = [];
        if (result.kml && result.kml.Document && result.kml.Document[0].Placemark) {
          result.kml.Document[0].Placemark.forEach(placemark => {
            placemarks.push(placemark);
          });
        }
        resolve(placemarks);
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
};

const parseKMZ = async (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    const contents = await zip.loadAsync(data);

    const kmlFile = Object.keys(contents.files).find(filename =>
      filename.toLowerCase().endsWith('.kml')
    );

    if (!kmlFile) {
      throw new Error('No KML file found in KMZ archive');
    }

    const kmlContent = await contents.files[kmlFile].async('text');

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(kmlContent);
    const placemarks = [];
    if (result.kml && result.kml.Document && result.kml.Document[0].Placemark) {
      result.kml.Document[0].Placemark.forEach(placemark => {
        placemarks.push(placemark);
      });
    }
    return placemarks;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  parseCSV,
  parseGeoJSON,
  parseKML,
  parseKMZ
};
