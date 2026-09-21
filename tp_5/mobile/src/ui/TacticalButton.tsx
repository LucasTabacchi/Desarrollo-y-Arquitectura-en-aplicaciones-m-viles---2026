import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, View } from 'react-native';
import Svg, { Path, Circle, Line, Polyline, Polygon, Rect } from 'react-native-svg';
import { colors, typography, spacing } from '../theme';

export type TacticalIconType = 'diagnostic' | 'location' | 'purge' | 'save' | 'abort' | 'pause' | 'play';

interface TacticalButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: TacticalIconType;
}

export const TacticalButton: React.FC<TacticalButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceContainerHighest;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surfaceContainerHigh;
      case 'danger':
        return colors.errorContainer;
      case 'outline':
        return colors.surfaceContainerLowest;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.outline;
    switch (variant) {
      case 'primary':
        return colors.onPrimary;
      case 'secondary':
        return colors.onSurface;
      case 'danger':
        return colors.error;
      case 'outline':
        return colors.primary;
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    const iconColor = getTextColor();
    const size = 14;

    switch (icon) {
      case 'diagnostic':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
            <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </Svg>
        );
      case 'location':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="7" />
            <Line x1="12" y1="1" x2="12" y2="5" />
            <Line x1="12" y1="19" x2="12" y2="23" />
            <Line x1="1" y1="12" x2="5" y2="12" />
            <Line x1="19" y1="12" x2="23" y2="12" />
            <Circle cx="12" cy="12" r="2" fill={iconColor} />
          </Svg>
        );
      case 'purge':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 6h18" />
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <Line x1="10" y1="11" x2="10" y2="17" />
            <Line x1="14" y1="11" x2="14" y2="17" />
          </Svg>
        );
      case 'save':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <Polyline points="17 21 17 13 7 13 7 21" />
            <Polyline points="7 3 7 8 15 8" />
          </Svg>
        );
      case 'abort':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </Svg>
        );
      case 'pause':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
            <Rect x="6" y="4" width="4" height="16" />
            <Rect x="14" y="4" width="4" height="16" />
          </Svg>
        );
      case 'play':
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill={iconColor}>
            <Polygon points="5 3 19 12 5 21 5 3" />
          </Svg>
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === 'danger' ? colors.error : colors.outlineVariant,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{renderIcon()}</View> : null}
      <Text style={[styles.text, { color: getTextColor() }]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 38,
    borderWidth: 1,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  iconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
