const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    package: 'com.agropulse.app',
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
  ],
});
