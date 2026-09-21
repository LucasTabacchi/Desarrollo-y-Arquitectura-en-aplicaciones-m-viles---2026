import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders application layout without crashing', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });
    expect(renderer).toBeDefined();

    // Cleanly unmount to trigger cleanup effects and clear daemon intervals
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
