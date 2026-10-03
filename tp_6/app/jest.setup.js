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
    executeAsync: jest.fn(async () => ({ rows: { _array: [] }, rowsAffected: 0 })),
    executeBatchAsync: jest.fn(async () => {}),
    transaction: jest.fn(async (cb) => cb({ executeAsync: jest.fn(), executeBatchAsync: jest.fn() })),
    close: jest.fn(async () => {}),
  })),
}));
