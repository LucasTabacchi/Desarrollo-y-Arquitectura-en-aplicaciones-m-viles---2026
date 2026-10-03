import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Icon, IconName } from '../ui';
import { MainTabParamList, RootStackParamList } from './types';

// Tab screens
import { HomeScreen } from '../../features/home/HomeScreen';
import { NetworkScreen } from '../../features/network/NetworkScreen';
import { InstallationsScreen } from '../../features/installations/InstallationsScreen';
import { HistoryScreen } from '../../features/history/HistoryScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';

// Stack screens
import { DeviceDetailScreen } from '../../features/device/DeviceDetailScreen';
import { SshConsoleScreen } from '../../features/ssh/SshConsoleScreen';
import { QrScannerScreen } from '../../features/qr/QrScannerScreen';
import { NewInstallationScreen } from '../../features/installations/NewInstallationScreen';
import { PdfPreviewScreen } from '../../features/reporting/PdfPreviewScreen';
import { SyncQueueScreen } from '../../features/sync/SyncQueueScreen';
import { SyncConflictScreen } from '../../features/sync/SyncConflictScreen';
import { AddCredentialScreen } from '../../features/settings/AddCredentialScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabBarIcon = ({
  name,
  focused,
  label,
}: {
  name: IconName;
  focused: boolean;
  label: string;
}) => {
  const color = focused ? colors.primary : colors.muted;

  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.topIndicator} />}
      <Icon name={name} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="home" focused={focused} label="Inicio" />
          ),
        }}
      />
      <Tab.Screen
        name="Network"
        component={NetworkScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="network" focused={focused} label="Red" />
          ),
        }}
      />
      <Tab.Screen
        name="Installations"
        component={InstallationsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="install" focused={focused} label="Instala." />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="history" focused={focused} label="Historial" />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="settings" focused={focused} label="Ajustes" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
        <Stack.Screen name="SshConsole" component={SshConsoleScreen} />
        <Stack.Screen name="QrScanner" component={QrScannerScreen} />
        <Stack.Screen name="NewInstallation" component={NewInstallationScreen} />
        <Stack.Screen name="PdfPreview" component={PdfPreviewScreen} />
        <Stack.Screen name="SyncQueue" component={SyncQueueScreen} />
        <Stack.Screen name="SyncConflict" component={SyncConflictScreen} />
        <Stack.Screen name="AddCredential" component={AddCredentialScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: spacing.bottomBarHeight,
    backgroundColor: colors.surfaceContainer,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingBottom: 0,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    gap: 4,
  },
  topIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  tabLabel: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
  },
});
