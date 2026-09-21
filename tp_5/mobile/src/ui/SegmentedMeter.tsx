import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface SegmentedMeterProps {
  totalSegments?: number;
  activeSegments: number;
  activeColor?: string;
  inactiveColor?: string;
  height?: number;
}

export const SegmentedMeter: React.FC<SegmentedMeterProps> = ({
  totalSegments = 8,
  activeSegments,
  activeColor = colors.secondary,
  inactiveColor = colors.surfaceContainerHighest,
  height = 12,
}) => {
  const segments = Array.from({ length: totalSegments });

  return (
    <View style={styles.container}>
      {segments.map((_, index) => {
        const isActive = index < activeSegments;
        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                height,
                backgroundColor: isActive ? activeColor : inactiveColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  segment: {
    width: 5,
    borderRadius: 0,
  },
});
