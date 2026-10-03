import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const DeviceDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DeviceDetail'>>();
  const { ip, mac = 'F4:C3:61:9A:82:10', model = 'ONT Huawei HG8245W5', hostname = 'ONT-AZOTEA-NORTE-01' } =
    route.params || {};

  const [activeTab, setActiveTab] = useState<'snmp' | 'ssh'>('snmp');

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Detalle de equipo"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Device Summary Card */}
        <Card style={styles.summaryCard} variant="high">
          <View style={styles.summaryTop}>
            <View style={styles.iconBox}>
              <Icon name="router" size={24} color={colors.primary} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{model}</Text>
              <Text style={styles.deviceSub}>Modelo: EchoLife HG8245W5</Text>
            </View>
            <StatusBadge label="EN LÍNEA" variant="success" dot />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DIRECCIÓN IP</Text>
              <Text style={styles.metaValue}>{ip}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DIRECCIÓN MAC</Text>
              <Text style={styles.metaValue}>{mac}</Text>
            </View>
          </View>
        </Card>

        {/* Tab Selector SNMP / SSH */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'snmp' && styles.tabBtnActive]}
            onPress={() => setActiveTab('snmp')}
          >
            <Icon
              name="radar"
              size={18}
              color={activeTab === 'snmp' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'snmp' && styles.tabBtnTextActive,
              ]}
            >
              SNMP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ssh' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('ssh');
              navigation.navigate('SshConsole', { ip, alias: model });
            }}
          >
            <Icon
              name="terminal"
              size={18}
              color={activeTab === 'ssh' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'ssh' && styles.tabBtnTextActive,
              ]}
            >
              SSH
            </Text>
          </TouchableOpacity>
        </View>

        {/* Community Bar */}
        <View style={styles.communityRow}>
          <View style={styles.communityLeft}>
            <Icon name="lock" size={16} color={colors.onSurfaceVariant} />
            <View>
              <Text style={styles.communityLabel}>COMUNIDAD SNMP</Text>
              <Text style={styles.communityValue}>public (v2c)</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Icon name="edit" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Action: Consultar de nuevo */}
        <ActionButton
          label="Consultar de nuevo"
          icon="refresh"
          variant="primary"
          onPress={() => {}}
        />

        {/* Security Alert */}
        <View style={styles.securityAlert}>
          <Icon name="warning" size={16} color={colors.warning} />
          <Text style={styles.alertText}>
            SNMP v1/v2c no cifra las credenciales
          </Text>
        </View>

        {/* OID 1: SysUptime */}
        <Card style={styles.oidCard}>
          <View style={styles.oidHeader}>
            <Text style={styles.oidLabel}>SYSUPTIME</Text>
            <Text style={styles.oidNum}>OID: 1.3.6.1.2.1.1.3.0</Text>
          </View>
          <Text style={styles.uptimeValue}>12d 4h 32m</Text>
        </Card>

        {/* OID 2: SysName */}
        <Card style={styles.oidCard}>
          <View style={styles.oidHeader}>
            <Text style={styles.oidLabel}>SYSNAME</Text>
            <Text style={styles.oidNum}>OID: 1.3.6.1.2.1.1.5.0</Text>
          </View>
          <Text style={styles.sysnameValue}>{hostname}</Text>
        </Card>

        {/* Monitoreo de Interfaces Table */}
        <Card style={styles.interfacesCard}>
          <View style={styles.interfacesHeader}>
            <Icon name="network" size={18} color={colors.secondary} />
            <Text style={styles.interfacesTitle}>Monitoreo de Interfaces</Text>
          </View>

          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 1.2 }]}>INTERFAZ</Text>
            <Text style={[styles.th, { flex: 1 }]}>ESTADO</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>ENTRADA (IN)</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>SALIDA (OUT)</Text>
          </View>

          {[
            { iface: 'ge0/0/1', up: true, in: '42.5 MB/s', out: '18.2 MB/s' },
            { iface: 'ge0/0/2', up: true, in: '1.2 MB/s', out: '0.4 MB/s' },
            { iface: 'ge0/0/3', up: true, in: '0.1 MB/s', out: '0.05 MB/s' },
            { iface: 'ge0/0/4', up: false, in: '0 B', out: '0 B' },
          ].map((row) => (
            <View key={row.iface} style={styles.tableRow}>
              <Text style={[styles.tdMono, { flex: 1.2 }]}>{row.iface}</Text>
              <View style={{ flex: 1 }}>
                <StatusBadge
                  label={row.up ? 'UP' : 'DOWN'}
                  variant={row.up ? 'success' : 'critical'}
                  dot
                />
              </View>
              <Text style={[styles.tdMonoHighlight, { flex: 1.2 }]}>{row.in}</Text>
              <Text style={[styles.tdMono, { flex: 1.2 }]}>{row.out}</Text>
            </View>
          ))}
        </Card>

        {/* SSH Console CTA */}
        <ActionButton
          label="Abrir consola SSH"
          icon="terminal"
          variant="primary"
          onPress={() => navigation.navigate('SshConsole', { ip, alias: model })}
        />
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
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  deviceSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  metaCol: {
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
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: spacing.radius.md,
    gap: spacing.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  tabBtnText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  communityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  communityLabel: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  communityValue: {
    ...typography.telemetryMono,
    color: colors.onSurface,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 36, 0.2)',
  },
  alertText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  oidCard: {
    gap: spacing.xs,
  },
  oidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  oidLabel: {
    ...typography.labelSm,
    color: colors.muted,
  },
  oidNum: {
    ...typography.telemetryMonoSm,
    color: colors.muted,
    fontSize: 10,
  },
  uptimeValue: {
    ...typography.headlineLg,
    color: colors.success,
  },
  sysnameValue: {
    ...typography.labelLg,
    color: colors.primary,
  },
  interfacesCard: {
    gap: spacing.md,
  },
  interfacesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  interfacesTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceStroke,
  },
  th: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 56, 84, 0.4)',
  },
  tdMono: {
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
  },
  tdMonoHighlight: {
    ...typography.telemetryMonoSm,
    color: colors.success,
    fontWeight: '700',
  },
});
