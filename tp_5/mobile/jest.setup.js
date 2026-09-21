/* eslint-disable no-undef */

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'cellular',
    details: {
      isConnectionExpensive: true,
      cellularGeneration: '4g',
      carrier: 'Claro AR',
    },
  }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
}));

// Mock TcpSocket
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn().mockImplementation((_opts, callback) => {
    setTimeout(callback, 10);
    return {
      setTimeout: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
    };
  }),
}));

// Mock Geolocation
jest.mock('react-native-geolocation-service', () => ({
  requestAuthorization: jest.fn().mockResolvedValue('granted'),
  getCurrentPosition: jest.fn().mockImplementation(success =>
    success({
      coords: {
        latitude: -34.603722,
        longitude: -58.381592,
        altitude: 28.2,
        accuracy: 2.4,
      },
      timestamp: Date.now(),
    })
  ),
}));

// Mock Notifee
jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn().mockResolvedValue('qos_sla_alerts'),
  displayNotification: jest.fn().mockResolvedValue('notif-1'),
  AndroidImportance: { HIGH: 4 },
}));

// Mock SQLite
jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn().mockResolvedValue({
    executeSql: jest.fn().mockResolvedValue([{ rows: { length: 0, item: () => null } }]),
  }),
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockComponent = (props) => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: MockComponent,
    MapView: MockComponent,
    Marker: MockComponent,
    Heatmap: MockComponent,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default',
  };
});

// Mock victory-native
jest.mock('victory-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockComponent = (props) => React.createElement(View, props, props.children);
  return {
    VictoryChart: MockComponent,
    VictoryLine: MockComponent,
    VictoryAxis: MockComponent,
    VictoryTheme: { material: {} },
    VictoryScatter: MockComponent,
    VictoryArea: MockComponent,
    VictoryBar: MockComponent,
  };
});

// Mock react-native-background-fetch
jest.mock('react-native-background-fetch', () => ({
  configure: jest.fn().mockResolvedValue(undefined),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  finish: jest.fn(),
  status: jest.fn().mockResolvedValue(2),
  registerHeadlessTask: jest.fn(),
  NETWORK_TYPE_ANY: 2,
}));
