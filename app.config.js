// Expo dynamic config: keep the Google Maps key out of committed source files.
// Set GOOGLE_MAPS_API_KEY in the local build environment before creating a native build.
const appJson = require('./app.json');

module.exports = ({ config }) => {
  const expo = appJson.expo;
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  return {
    ...config,
    ...expo,
    android: {
      ...expo.android,
      ...(mapsApiKey
        ? { config: { ...expo.android?.config, googleMaps: { apiKey: mapsApiKey } } }
        : {}),
    },
    ios: {
      ...expo.ios,
      ...(mapsApiKey
        ? { config: { ...expo.ios?.config, googleMapsApiKey: mapsApiKey } }
        : {}),
    },
  };
};
