import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface TopNavHeaderProps {
  currentTab: string;
  networkInterface?: string;
}

export const TopNavHeader: React.FC<TopNavHeaderProps> = ({
  currentTab,
  networkInterface = 'wlan0/5G-NR',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.header}>
      {/* Upper sub-header bar */}
      <View style={styles.statusBar}>
        <View style={styles.daemonBadge}>
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
          <Text style={styles.daemonText}>DAEMON:LIVE [1000ms]</Text>
        </View>
        <Text style={styles.interfaceText}>
          <Text style={{ color: colors.outline }}>IF: </Text>
          <Text style={{ color: colors.primary }}>{networkInterface}</Text>
        </Text>
        <Text style={styles.gnssText}>3D-FIX (8 SVs)</Text>
      </View>

      {/* Main title bar */}
      <View style={styles.titleBar}>
        <View>
          <Text style={styles.appTitle}>QOS-MONITOR // TP5</Text>
          <Text style={styles.subTitle}>TELEMETRY NOC CONSOLE</Text>
        </View>
        <View style={styles.screenBadge}>
          <Text style={styles.screenBadgeText}>{currentTab.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  statusBar: {
    height: 24,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  daemonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 0,
  },
  daemonText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  interfaceText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    fontWeight: '600',
  },
  gnssText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.tertiary,
    fontWeight: '600',
  },
  titleBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  appTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  subTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  screenBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  screenBadgeText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    color: colors.onSurface,
    fontWeight: '600',
  },
});
