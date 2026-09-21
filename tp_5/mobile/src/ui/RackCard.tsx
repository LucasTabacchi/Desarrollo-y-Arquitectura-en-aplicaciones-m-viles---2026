import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface RackCardProps {
  title: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const RackCard: React.FC<RackCardProps> = ({
  title,
  subtitle,
  tag,
  tagColor = colors.secondary,
  children,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: tagColor }]} />
          <Text style={styles.title}>{title.toUpperCase()}</Text>
        </View>
        {(tag || subtitle) && (
          <Text style={[styles.tag, { color: tagColor }]}>
            {tag || subtitle}
          </Text>
        )}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    borderRadius: 0,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
  },
  title: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tag: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: spacing.md,
  },
});
