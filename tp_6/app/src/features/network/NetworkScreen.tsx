import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

interface ScannedDevice {
  ip: string;
  mac: string;
  name: string;
  isMdns?: boolean;
  type: 'ont' | 'router' | 'antenna' | 'switch' | 'unknown';
}

const mockDevices: ScannedDevice[] = [
  {
    ip: '192.168.1.254',
    mac: 'F4:C3:61:9A:82:10',
    name: 'ONT Huawei HG8245W5',
    isMdns: true,
    type: 'ont',
  },
  {
    ip: '192.168.1.1',
    mac: 'B8:69:F4:11:C2:AA',
    name: 'Router MikroTik hAP ac2',
    type: 'router',
  },
  {
    ip: '192.168.1.45',
    mac: 'DC:9F:DB:44:19:EF',
    name: 'Antena Ubiquiti LiteBeam',
    isMdns: true,
    type: 'antenna',
  },
  {
    ip: '192.168.1.10',
    mac: '00:26:98:A4:7B:33',
    name: 'Switch Cisco SG250-8P',
    type: 'switch',
  },
  {
    ip: '192.168.1.88',
    mac: '3C:7A:8A:22:90:54',
    name: 'Desconocido',
    type: 'unknown',
  },
];

export const NetworkScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount] = useState(142);
  const totalHosts = 254;
  const progressPercent = Math.round((scannedCount / totalHosts) * 100);

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Red"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Operational Subnet Header Card */}
        <Card style={styles.subnetCard} variant="high">
          <View style={styles.subnetHeader}>
            <Icon name="radar" size={18} color={colors.primary} />
            <Text style={styles.subnetLabel}>SUBRED OPERATIVA</Text>
          </View>
          <Text style={styles.subnetValue}>192.168.1.0/24</Text>

          {/* Scan Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressRow}>
              <View style={styles.progressLeft}>
                <Icon name="radar" size={14} color={colors.success} />
                <Text style={styles.progressText}>
                  {isScanning
                    ? `Escaneando: ${scannedCount}/${totalHosts} hosts`
                    : 'Escaneo listo'}
                </Text>
              </View>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Action Trigger */}
          <ActionButton
            label={isScanning ? 'Detener escaneo' : 'Iniciar escaneo de red'}
            variant={isScanning ? 'secondary' : 'primary'}
            onPress={() => setIsScanning(!isScanning)}
            icon={isScanning ? 'warning' : 'radar'}
          />
        </Card>

        {/* Detected Devices Section */}
        <View style={styles.devicesSection}>
          <View style={styles.devicesHeader}>
            <Text style={styles.devicesHeaderLabel}>DISPOSITIVOS DETECTADOS</Text>
            <Text style={styles.devicesHeaderCount}>
              {mockDevices.length} ONLINE
            </Text>
          </View>

          {mockDevices.map((dev) => (
            <TouchableOpacity
              key={dev.ip}
              style={styles.deviceCard}
              onPress={() =>
                navigation.navigate('DeviceDetail', {
                  ip: dev.ip,
                  mac: dev.mac,
                  model: dev.name,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.deviceTop}>
                <View style={styles.deviceTitleRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.deviceName}>{dev.name}</Text>
                </View>

                {dev.isMdns && <StatusBadge label="mDNS" variant="neutral" />}
              </View>

              <View style={styles.deviceMetaRow}>
                <View style={styles.deviceMetaCol}>
                  <Text style={styles.metaLabel}>IP ADDRESS</Text>
                  <Text style={styles.metaValue}>{dev.ip}</Text>
                </View>

                <View style={styles.deviceMetaCol}>
                  <Text style={styles.metaLabel}>MAC HARDWARE</Text>
                  <Text style={styles.metaValue}>{dev.mac}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 20,
    gap: spacing.lg,
  },
  subnetCard: {
    gap: spacing.md,
  },
  subnetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subnetLabel: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  subnetValue: {
    ...typography.headlineXl,
    color: colors.onSurface,
  },
  progressContainer: {
    gap: spacing.xs + 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  progressPercent: {
    ...typography.labelSm,
    color: colors.success,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  devicesSection: {
    gap: spacing.sm + 2,
  },
  devicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  devicesHeaderLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  devicesHeaderCount: {
    ...typography.labelSm,
    color: colors.success,
  },
  deviceCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.md,
  },
  deviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  deviceName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  deviceMetaCol: {
    flex: 1,
  },
  metaLabel: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  metaValue: {
    ...typography.telemetryMono,
    color: colors.secondary,
    marginTop: 2,
  },
});
