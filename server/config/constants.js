module.exports = {
  DRONEDEPLOY_API_URL: 'https://www.dronedeploy.com/graphql',
  PORT: 3001,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_PAYLOAD_SIZE: '10mb',
  DEFAULT_COLOR: '#2196f3',
  DEFAULT_FILL_COLOR: '#64b5f6',
  DEFAULT_ANNOTATION_COLOR: '#6639b6',
  RATE_LIMIT_DELAY: 100,
  REQUEST_TIMEOUT: 120000,
  SUPPORTED_FILE_EXTENSIONS: ['.csv', '.geojson', '.json', '.kml', '.kmz']
};
