import React from 'react';
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
import { StatusHeader, Card, Icon, StatusBadge } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Inicio"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header de la Suite */}
        <View style={styles.operatorSection}>
          <Text style={styles.greeting}>Suite de Diagnóstico</Text>

          <View style={styles.siteBanner}>
            <Icon name="radar" size={18} color={colors.primary} />
            <Text style={styles.siteText}>Operaciones de Red en Campo</Text>
          </View>
        </View>

        {/* Connectivity & Sync Buffer Card */}
        <Card style={styles.syncCard} variant="high">
          <View style={styles.syncCardHeader}>
            <View style={styles.syncIconContainer}>
              <Icon name="cloud_sync" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.syncTitleCol}>
              <Text style={styles.syncCategory}>ALMACENAMIENTO LOCAL</Text>
              <Text style={styles.syncTitle}>Sincronización de Campo</Text>
            </View>
            <View style={styles.syncCountBadge}>
              <Text style={styles.syncCountText}>3</Text>
            </View>
          </View>

          {/* Buffer breakdown */}
          <View style={styles.bufferBreakdown}>
            <View style={styles.bufferLeft}>
              <Icon name="pending_actions" size={18} color={colors.secondary} />
              <Text style={styles.bufferText}>3 acciones pendientes</Text>
            </View>
            <Text style={styles.bufferDetails}>2 diag • 1 PDF</Text>
          </View>

          {/* Sync Card Footer */}
          <View style={styles.syncCardFooter}>
            <View style={styles.syncTimestampRow}>
              <Icon name="history" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.syncTimestampText}>Hoy 10:42 con Nodo Central</Text>
            </View>

            <TouchableOpacity
              style={styles.verColaButton}
              onPress={() => navigation.navigate('SyncQueue')}
              accessibilityLabel="Ver cola de sincronización"
            >
              <Text style={styles.verColaText}>Ver cola</Text>
              <Icon name="chevron_right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Big Action Triggers */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionHeaderLabel}>ACCIONES RÁPIDAS DE DIAGNÓSTICO</Text>

          {/* Action 1: Radar Scan */}
          <TouchableOpacity
            style={styles.actionRadar}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Network' })}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionRadarIconBox}>
                <Icon name="radar" size={26} color={colors.onPrimary} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionRadarTitle}>Escanear red local</Text>
                <Text style={styles.actionRadarSubtitle}>Subred actual: 192.168.1.0/24</Text>
              </View>
            </View>
            <Icon name="arrow_forward" size={20} color={colors.onPrimary} />
          </TouchableOpacity>

          {/* Action 2: QR Scanner */}
          <TouchableOpacity
            style={styles.actionStandard}
            onPress={() => navigation.navigate('QrScanner')}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionIconBox}>
                <Icon name="qr_code_scanner" size={22} color={colors.primary} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionStandardTitle}>Escanear código QR</Text>
                <Text style={styles.actionStandardSubtitle}>Identificar ONT/Router al instante</Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Action 3: New Field Installation */}
          <TouchableOpacity
            style={styles.actionStandard}
            onPress={() => navigation.navigate('NewInstallation', { step: 1 })}
            activeOpacity={0.85}
          >
            <View style={styles.actionLeft}>
              <View style={styles.actionIconBox}>
                <Icon name="add_task" size={22} color={colors.success} />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionStandardTitle}>Nueva instalación</Text>
                <Text style={styles.actionStandardSubtitle}>Asistente en 4 pasos con fotos y GPS</Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.recentHeaderTitleRow}>
              <Icon name="terminal" size={18} color={colors.primary} />
              <Text style={styles.recentHeaderTitle}>Actividad reciente</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('MainTabs', { screen: 'History' })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.verTodoText}>Ver todo</Text>
            </TouchableOpacity>
          </View>

          {/* Activity Item 1 */}
          <TouchableOpacity
            style={styles.activityCard}
            onPress={() =>
              navigation.navigate('DeviceDetail', {
                ip: '192.168.1.254',
                mac: 'F4:C3:61:9A:82:10',
                model: 'ONT Huawei HG8245W5',
                hostname: 'ONT-AZOTEA-NORTE-01',
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.activityTop}>
              <View style={styles.activityDeviceCol}>
                <View style={styles.activityIconBox}>
                  <Icon name="router" size={18} color={colors.primary} />
                </View>
                <View style={styles.activityTextCol}>
                  <Text style={styles.activityDeviceName}>ONT Huawei HG8245W5</Text>
                  <Text style={styles.activityIp}>IP: 192.168.1.254</Text>
                </View>
              </View>
              <Text style={styles.activityTime}>25 min</Text>
            </View>

            <View style={styles.activityBottom}>
              <View style={styles.activityStatusRow}>
                <Icon name="check_circle" size={15} color={colors.success} />
                <Text style={styles.activityStatusDesc}>Diagnóstico SNMP completado</Text>
              </View>
              <StatusBadge label="Sincronizado" variant="success" dot />
            </View>
          </TouchableOpacity>

          {/* Activity Item 2 */}
          <TouchableOpacity
            style={styles.activityCard}
            onPress={() =>
              navigation.navigate('DeviceDetail', {
                ip: '192.168.1.1',
                mac: 'B8:69:F4:11:C2:AA',
                model: 'Router MikroTik hAP ac2',
                hostname: 'admin@MikroTik',
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.activityTop}>
              <View style={styles.activityDeviceCol}>
                <View style={styles.activityIconBox}>
                  <Icon name="switch" size={18} color={colors.secondary} />
                </View>
                <View style={styles.activityTextCol}>
                  <Text style={styles.activityDeviceName}>Router MikroTik hAP ac2</Text>
                  <Text style={styles.activityIp}>IP: 192.168.1.1</Text>
                </View>
              </View>
              <Text style={styles.activityTime}>1 h</Text>
            </View>

            <View style={styles.activityBottom}>
              <View style={styles.activityStatusRow}>
                <Icon name="terminal" size={15} color={colors.onSurfaceVariant} />
                <Text style={styles.activityStatusDesc}>Comandos SSH ejecutados</Text>
              </View>
              <StatusBadge label="Pendiente" variant="warning" dot />
            </View>
          </TouchableOpacity>

          {/* Activity Item 3 */}
          <TouchableOpacity
            style={styles.activityCard}
            onPress={() =>
              navigation.navigate('DeviceDetail', {
                ip: '192.168.1.45',
                mac: 'DC:9F:DB:44:19:EF',
                model: 'Antena Ubiquiti LiteBeam',
                hostname: 'LBE-5AC-Gen2',
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.activityTop}>
              <View style={styles.activityDeviceCol}>
                <View style={styles.activityIconBox}>
                  <Icon name="antenna" size={18} color={colors.primary} />
                </View>
                <View style={styles.activityTextCol}>
                  <Text style={styles.activityDeviceName}>Antena Ubiquiti LiteBeam</Text>
                  <Text style={styles.activityIp}>IP: 192.168.1.45</Text>
                </View>
              </View>
              <Text style={styles.activityTime}>2 h</Text>
            </View>

            <View style={styles.activityBottom}>
              <View style={styles.activityStatusRow}>
                <Icon name="pending_actions" size={15} color={colors.onSurfaceVariant} />
                <Text style={styles.activityStatusDesc}>Reporte de instalación generado</Text>
              </View>
              <StatusBadge label="Pendiente" variant="warning" dot />
            </View>
          </TouchableOpacity>
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
  operatorSection: {
    gap: spacing.sm,
  },
  greeting: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  siteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.sm,
  },
  siteText: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  syncCard: {
    gap: spacing.md,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncIconContainer: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  syncTitleCol: {
    flex: 1,
  },
  syncCategory: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  syncTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  syncCountBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCountText: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  bufferBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bufferLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bufferText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  bufferDetails: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  syncCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  syncTimestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTimestampText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  verColaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: spacing.touchTargetMin,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  verColaText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  actionsSection: {
    gap: spacing.sm + 2,
  },
  sectionHeaderLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  actionRadar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryContainer,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    minHeight: 64,
  },
  actionRadarIconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionRadarTitle: {
    ...typography.headlineSm,
    color: colors.onPrimary,
  },
  actionRadarSubtitle: {
    ...typography.labelSm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  actionStandard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTextCol: {
    flex: 1,
  },
  actionStandardTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  actionStandardSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  recentSection: {
    gap: spacing.sm + 2,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  recentHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentHeaderTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  verTodoText: {
    ...typography.labelMd,
    color: colors.primary,
  },
  activityCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.xl,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.md,
  },
  activityTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activityDeviceCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm + 2,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextCol: {
    flex: 1,
  },
  activityDeviceName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  activityIp: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  activityTime: {
    ...typography.bodySm,
    color: colors.muted,
  },
  activityBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  activityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityStatusDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
