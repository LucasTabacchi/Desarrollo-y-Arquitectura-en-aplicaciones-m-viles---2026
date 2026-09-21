/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import { BackgroundMeasurementService } from './src/services/BackgroundMeasurementService';

AppRegistry.registerComponent(appName, () => App);

// Register Android HeadlessTask for background-fetch events when the app is terminated.
// This ensures QoS measurements continue even with the app fully closed (RF-07).
BackgroundFetch.registerHeadlessTask(async (event) => {
  await BackgroundMeasurementService.headlessTask(event);
});
