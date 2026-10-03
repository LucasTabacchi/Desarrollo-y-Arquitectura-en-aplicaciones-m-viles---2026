import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const SyncQueueScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const pendingItems = [
    {
      id: 'q-1',
      title: 'Diagnóstico SNMP Huawei ONT',
      type: 'SNMP Telemetry',
      created: 'Hoy 10:42',
      status: 'pending',
      retry: '1 intento',
    },
    {
      id: 'q-2',
      title: 'Comandos SSH MikroTik hAP ac2',
      type: 'SSH Command Log',
      created: 'Hoy 10:40',
      status: 'pending',
      retry: '0 intentos',
    },
    {
      id: 'q-3',
      title: 'Reporte de Instalación #1042',
      type: 'PDF + Evidencias',
      created: 'Hoy 10:35',
      status: 'conflict',
      retry: 'Conflicto de versión',
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Cola de sincronización"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Outbox Status Summary */}
        <Card style={styles.summaryCard} variant="high">
          <View style={styles.summaryTop}>
            <View style={styles.iconBox}>
              <Icon name="cloud_sync" size={24} color={colors.primary} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>Cola Offline (Outbox)</Text>
              <Text style={styles.summarySubtitle}>
                3 acciones esperando subida al backend
              </Text>
            </View>
          </View>

          <ActionButton
            label="Sincronizar ahora"
            icon="refresh"
            variant="primary"
            onPress={() => {}}
          />
        </Card>

        {/* Pending Items List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>ACCIONES EN COLA</Text>

          {pendingItems.map((item) => (
            <Card key={item.id} style={styles.queueCard}>
              <View style={styles.cardHeader}>
                <View style={styles.itemTitleCol}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemType}>{item.type}</Text>
                </View>

                {item.status === 'conflict' ? (
                  <StatusBadge label="Conflicto" variant="critical" dot />
                ) : (
                  <StatusBadge label="Encolado" variant="warning" dot />
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>{item.created} • {item.retry}</Text>

                {item.status === 'conflict' && (
                  <ActionButton
                    label="Resolver conflicto"
                    variant="danger"
                    onPress={() => navigation.navigate('SyncConflict', { conflictId: item.id })}
                    style={styles.resolveBtn}
                  />
                )}
              </View>
            </Card>
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
  summaryCard: {
    gap: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  summarySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  listSection: {
    gap: spacing.sm + 2,
  },
  sectionTitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  queueCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  itemType: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  resolveBtn: {
    height: 36,
    paddingHorizontal: spacing.sm + 4,
  },
});
