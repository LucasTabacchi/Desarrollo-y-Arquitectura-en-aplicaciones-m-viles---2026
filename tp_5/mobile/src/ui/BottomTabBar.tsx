import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

export type TabKey = 'dash' | 'test' | 'map' | 'log' | 'config';

interface BottomTabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

interface TabItem {
  key: TabKey;
  label: string;
  iconSymbol: string;
}

const TABS: TabItem[] = [
  { key: 'dash', label: 'DASH', iconSymbol: '▦' },
  { key: 'test', label: 'TEST', iconSymbol: '∿' },
  { key: 'map', label: 'MAP', iconSymbol: '⊕' },
  { key: 'log', label: 'LOG', iconSymbol: '≡' },
  { key: 'config', label: 'CONFIG', iconSymbol: '⚙' },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <View style={styles.container}>
      {TABS.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.key)}
            style={[
              styles.tab,
              isActive && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.icon,
                { color: isActive ? colors.primary : colors.outline },
              ]}
            >
              {tab.iconSymbol}
            </Text>
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.primary : colors.outline },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
  },
  activeTab: {
    backgroundColor: colors.surfaceContainerHigh,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
