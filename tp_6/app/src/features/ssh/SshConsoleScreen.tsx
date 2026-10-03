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
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const SshConsoleScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SshConsole'>>();
  const { ip = '192.168.1.1', user = 'admin', port = 22 } = route.params || {};

  const [terminalText, setTerminalText] = useState(
`[admin@MikroTik] > /system resource print
  uptime: 12d4h32m
  version: 7.14.2 (stable)
  board-name: hAP ac2
  architecture-name: arm
  cpu: ARM
  cpu-count: 4
  cpu-frequency: 716MHz
  free-memory: 86.4MiB
  total-memory: 128.0MiB

[admin@MikroTik] > `
  );

  const presets = [
    { label: '/interface print', cmd: '/interface print' },
    { label: '/system resource print', cmd: '/system resource print' },
    { label: '/system identity print', cmd: '/system identity print' },
  ];

  const runPreset = (cmd: string) => {
    setTerminalText((prev) => `${prev}\n[admin@MikroTik] > ${cmd}\n  executing command...\n[admin@MikroTik] > `);
  };

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Consola SSH"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <View style={styles.content}>
        {/* Host Info Card */}
        <Card style={styles.hostCard} variant="high">
          <View style={styles.hostRow}>
            <View style={styles.iconBox}>
              <Icon name="terminal" size={20} color={colors.primary} />
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostTitle}>{`${user}@${ip}:${port}`}</Text>
              <View style={styles.secRow}>
                <Icon name="lock" size={12} color={colors.success} />
                <Text style={styles.secText}>Credenciales en Keychain/Keystore</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.disconnectBtn}>
              <Text style={styles.disconnectText}>Desconectar</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Vendor Preset Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.cmd}
              style={styles.presetChip}
              onPress={() => runPreset(preset.cmd)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetPlay}>▶</Text>
              <Text style={styles.presetLabel}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Terminal Screen */}
        <View style={styles.terminalBox}>
          <ScrollView
            style={styles.terminalScroll}
            contentContainerStyle={styles.terminalContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.terminalOutput}>{terminalText}</Text>
          </ScrollView>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <ActionButton
            label="Copiar salida"
            icon="copy"
            variant="secondary"
            onPress={() => {}}
            style={styles.halfBtn}
          />
          <ActionButton
            label="Guardar en historial"
            icon="add_task"
            variant="secondary"
            onPress={() => {}}
            style={styles.halfBtn}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.margin,
    gap: spacing.md,
  },
  hostCard: {
    padding: spacing.md,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostInfo: {
    flex: 1,
  },
  hostTitle: {
    ...typography.telemetryMono,
    color: colors.onSurface,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  secText: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.success,
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  disconnectText: {
    ...typography.labelSm,
    color: colors.critical,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: 6,
  },
  presetPlay: {
    color: colors.success,
    fontSize: 10,
  },
  presetLabel: {
    ...typography.telemetryMonoSm,
    color: colors.onSurface,
  },
  terminalBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    overflow: 'hidden',
  },
  terminalScroll: {
    flex: 1,
  },
  terminalContent: {
    padding: spacing.md,
  },
  terminalOutput: {
    ...typography.telemetryMonoSm,
    color: colors.success,
    lineHeight: 18,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
});
