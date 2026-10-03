import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    enableScreens: jest.fn(),
    ScreenContainer: View,
    Screen: View,
    NativeScreen: View,
    NativeScreenContainer: View,
    ScreenStack: View,
    ScreenStackItem: View,
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderBackButtonImage: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderCenterView: View,
    SearchBar: View,
    shouldUseActivityState: jest.fn(),
    compatibilityFlags: {},
  };
});

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
    executeBatch: jest.fn(async () => {}),
    transaction: jest.fn(async (cb) => cb({ execute: jest.fn() })),
    closeAsync: jest.fn(async () => {}),
  })),
}));

jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => ({
    bind: jest.fn((port, addr, cb) => cb && cb()),
    send: jest.fn((data, offset, length, port, addr, cb) => cb && cb()),
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn((opts, cb) => {
    if (cb) cb();
    return {
      on: jest.fn(),
      destroy: jest.fn(),
    };
  }),
}));

jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => ({
    scan: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
  }));
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
    },
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

