import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

interface DiagnosticHistoryItem {
  id: string;
  type: 'snmp' | 'ssh' | 'report';
  target: string;
  deviceName: string;
  timestamp: string;
  status: 'synced' | 'pending' | 'failed';
  summary: string;
}

const mockHistory: DiagnosticHistoryItem[] = [
  {
    id: 'h-1',
    type: 'snmp',
    target: '192.168.1.254',
    deviceName: 'ONT Huawei HG8245W5',
    timestamp: 'Hoy 10:42',
    status: 'synced',
    summary: 'sysUpTime: 12d 4h 32m • 4 interfaces monitoreadas',
  },
  {
    id: 'h-2',
    type: 'ssh',
    target: '192.168.1.1',
    deviceName: 'Router MikroTik hAP ac2',
    timestamp: 'Hoy 09:30',
    status: 'pending',
    summary: 'Comandos: /interface print, /system resource print',
  },
  {
    id: 'h-3',
    type: 'report',
    target: '192.168.1.45',
    deviceName: 'Antena Ubiquiti LiteBeam',
    timestamp: 'Ayer 16:15',
    status: 'synced',
    summary: 'Instalación completa • 3 fotos georreferenciadas',
  },
];

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<'all' | 'snmp' | 'ssh' | 'report'>('all');
  const [search, setSearch] = useState('');

  const filtered = mockHistory.filter((item) => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (search && !item.deviceName.toLowerCase().includes(search.toLowerCase()) && !item.target.includes(search)) {
      return false;
    }
    return true;
  });

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Historial"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search input */}
        <View style={styles.searchBar}>
          <Icon name="radar" size={18} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por equipo o IP..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'snmp', label: 'SNMP' },
            { key: 'ssh', label: 'SSH' },
            { key: 'report', label: 'Reportes' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                filter === tab.key && styles.filterChipActive,
              ]}
              onPress={() => setFilter(tab.key as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === tab.key && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History List */}
        <View style={styles.historyList}>
          {filtered.map((item) => (
            <Card key={item.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.deviceRow}>
                  <View style={styles.iconBox}>
                    <Icon
                      name={
                        item.type === 'snmp'
                          ? 'radar'
                          : item.type === 'ssh'
                          ? 'terminal'
                          : 'add_task'
                      }
                      size={18}
                      color={
                        item.type === 'snmp'
                          ? colors.primary
                          : item.type === 'ssh'
                          ? colors.secondary
                          : colors.success
                      }
                    />
                  </View>
                  <View>
                    <Text style={styles.deviceName}>{item.deviceName}</Text>
                    <Text style={styles.deviceTarget}>{item.target}</Text>
                  </View>
                </View>

                <StatusBadge
                  label={item.status === 'synced' ? 'Sincronizado' : 'Pendiente'}
                  variant={item.status === 'synced' ? 'success' : 'warning'}
                  dot
                />
              </View>

              <Text style={styles.summaryText}>{item.summary}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.timestampText}>{item.timestamp}</Text>
                <TouchableOpacity
                  onPress={() =>
                    item.type === 'ssh'
                      ? navigation.navigate('SshConsole', { ip: item.target })
                      : navigation.navigate('DeviceDetail', { ip: item.target, model: item.deviceName })
                  }
                >
                  <Text style={styles.detailLink}>Ver detalles &gt;</Text>
                </TouchableOpacity>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  historyList: {
    gap: spacing.md,
  },
  historyCard: {
    gap: spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  deviceTarget: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
  },
  summaryText: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.sm,
  },
  timestampText: {
    ...typography.bodySm,
    color: colors.muted,
  },
  detailLink: {
    ...typography.labelMd,
    color: colors.primary,
  },
});
