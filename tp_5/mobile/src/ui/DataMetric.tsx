import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface DataMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DataMetric: React.FC<DataMetricProps> = ({
  label,
  value,
  unit,
  sublabel,
  color = colors.onSurface,
  size = 'md',
}) => {
  const valueFontSize = size === 'lg' ? 26 : size === 'md' ? 18 : 13;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: valueFontSize, color }]}>
          {value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    flex: 1,
  },
  label: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontFamily: typography.fontFamilyMono,
    fontWeight: '700',
  },
  unit: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    color: colors.outline,
    marginLeft: 2,
  },
  sublabel: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
});
