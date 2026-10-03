import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { getRepositories } from '../../store';
import { OutboxItem } from '../../store/models';
import { SyncWorker } from '../../sync/SyncWorker';

interface DisplayQueueItem {
  id: string;
  title: string;
  device: string;
  subinfo: string;
  timeStr: string;
  status: 'pending' | 'retry' | 'error' | 'synced' | 'conflict';
  attempts?: number;
}

const SAMPLE_QUEUE: DisplayQueueItem[] = [
  {
    id: 'sample-q-1',
    title: 'Reporte de instalación',
    device: 'Router MikroTik hAP ac2',
    subinfo: 'Sitio Azotea Norte',
    timeStr: 'Hoy 10:42',
    status: 'pending',
    attempts: 0,
  },
  {
    id: 'sample-q-2',
    title: 'Diagnóstico SNMP',
    device: 'ONT Huawei HG8245W5',
    subinfo: '192.168.1.254',
    timeStr: 'Hoy 10:35',
    status: 'retry',
    attempts: 2,
  },
  {
    id: 'sample-q-3',
    title: 'Diagnóstico SSH',
    device: 'Router MikroTik hAP ac2',
    subinfo: '192.168.1.1:22',
    timeStr: 'Hoy 10:15',
    status: 'error',
    attempts: 3,
  },
  {
    id: 'sample-q-4',
    title: 'Diagnóstico SNMP',
    device: 'Antena Ubiquiti LiteBeam',
    subinfo: '192.168.1.45',
    timeStr: 'Hoy 09:50',
    status: 'synced',
    attempts: 1,
  },
];

export const SyncQueueScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  const [dbItems, setDbItems] = useState<OutboxItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const repos = getRepositories();
      const items = await repos.outbox.peekPending(Date.now() + 86400000, 50);
      setDbItems(items);
    } catch {
      setDbItems([]);
    }

    try {
      const net = await NetInfo.fetch();
      setIsOnline(Boolean(net.isConnected && net.isInternetReachable !== false));
    } catch {
      setIsOnline(true);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await SyncWorker.syncAll();
      await loadData();
    } catch (err) {
      console.warn('[SyncQueueScreen] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryItem = async (id: string) => {
    setIsSyncing(true);
    try {
      await SyncWorker.retryItem(id);
      await loadData();
    } catch (err) {
      console.warn('Retry error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Map dbItems or sampleItems
  const pendingCount = dbItems.length > 0 ? dbItems.length : 3;

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Cola de sincronización"
        showBack
        onPressBack={() => navigation.goBack()}
        isOnline={isOnline}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Offline Warning Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Icon name="warning" size={20} color="#F5A524" />
            <Text style={styles.offlineBannerText}>
              Sin conexión. Se sincronizará automáticamente al recuperar red.
            </Text>
          </View>
        )}

        {/* Summary text */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {pendingCount} {pendingCount === 1 ? 'acción pendiente' : 'acciones pendientes'}
          </Text>
        </View>

        {/* Database Items (if any) */}
        {dbItems.map((item) => {
          let title = 'Registro';
          if (item.entityType === 'installation') title = 'Reporte de instalación';
          if (item.entityType === 'diagnostic') title = 'Diagnóstico SNMP / SSH';

          let payloadObj: any = {};
          try {
            payloadObj = JSON.parse(item.payloadJson);
          } catch {}

          const deviceName = payloadObj.deviceName || `ID: ${item.entityId}`;
          const isConflict = item.status === 'conflict';
          const isError = item.attempts >= 3;

          return (
            <Card key={item.id} style={styles.itemCard} variant="surface">
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{title}</Text>
                {isConflict ? (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('SyncConflict', { conflictId: item.id })
                    }
                  >
                    <StatusBadge label="Conflicto" variant="warning" dot />
                  </TouchableOpacity>
                ) : isError ? (
                  <StatusBadge label="Error" variant="critical" dot />
                ) : item.attempts > 0 ? (
                  <StatusBadge
                    label={`Reintentando (${item.attempts})`}
                    variant="warning"
                    dot
                  />
                ) : (
                  <StatusBadge label="Pendiente" variant="neutral" dot />
                )}
              </View>

              <Text style={styles.itemDevice}>{deviceName}</Text>
              <Text style={styles.itemMeta}>Entidad: {item.entityType}</Text>

              {isConflict && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.conflictBtn}
                  onPress={() =>
                    navigation.navigate('SyncConflict', { conflictId: item.id })
                  }
                >
                  <Icon name="warning" size={16} color="#F5A524" />
                  <Text style={styles.conflictBtnText}>Resolver conflicto de versión</Text>
                </TouchableOpacity>
              )}

              {isError && (
                <View style={styles.retryRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.retryBtn}
                    onPress={() => handleRetryItem(item.id)}
                  >
                    <Text style={styles.retryBtnText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })}

        {/* Default Sample Items when db is empty */}
        {dbItems.length === 0 &&
          SAMPLE_QUEUE.map((item) => (
            <Card key={item.id} style={styles.itemCard} variant="surface">
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.status === 'pending' && (
                  <StatusBadge label="Pendiente" variant="neutral" dot />
                )}
                {item.status === 'retry' && (
                  <StatusBadge
                    label={`Reintentando (${item.attempts})`}
                    variant="warning"
                    dot
                  />
                )}
                {item.status === 'error' && (
                  <StatusBadge label="Error" variant="critical" dot />
                )}
                {item.status === 'synced' && (
                  <StatusBadge label="Sincronizado" variant="success" dot />
                )}
                {item.status === 'conflict' && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('SyncConflict', { conflictId: item.id })
                    }
                  >
                    <StatusBadge label="Conflicto" variant="warning" dot />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.itemDevice}>{item.device}</Text>
              <Text style={styles.itemMeta}>{item.subinfo}</Text>
              <Text style={[styles.itemMeta, { marginTop: 2 }]}>{item.timeStr}</Text>

              {item.status === 'error' && (
                <View style={styles.retryRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.retryBtn}
                    onPress={handleManualSync}
                  >
                    <Text style={styles.retryBtnText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))}

        {/* Prominent Primary Button */}
        <View style={styles.bottomSection}>
          <ActionButton
            label={isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            icon="cloud_sync"
            variant="primary"
            onPress={handleManualSync}
            disabled={isSyncing}
          />
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
    gap: spacing.md,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 165, 36, 0.15)',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 165, 36, 0.3)',
  },
  offlineBannerText: {
    ...typography.bodyMedium,
    color: '#F5A524',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  summaryRow: {
    marginTop: spacing.xs,
  },
  summaryText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  itemCard: {
    padding: spacing.md,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemDevice: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  itemMeta: {
    ...typography.labelSmall,
    color: colors.outline,
    fontSize: 11,
  },
  retryRow: {
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  retryBtn: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  conflictBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 165, 36, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  conflictBtnText: {
    ...typography.labelSmall,
    color: '#F5A524',
    fontWeight: '700',
  },
  bottomSection: {
    marginTop: spacing.lg,
  },
});
