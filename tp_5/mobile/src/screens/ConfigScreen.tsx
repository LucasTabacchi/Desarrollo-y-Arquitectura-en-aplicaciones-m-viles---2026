import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { RackCard } from '../ui/RackCard';
import { TacticalButton } from '../ui/TacticalButton';
import { AppConfig, TargetHost } from '../types';
import { DatabaseService } from '../services/DatabaseService';

interface ConfigScreenProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [backendUrl, setBackendUrl] = useState(config.backendUrl);
  const [daemonEnabled, setDaemonEnabled] = useState(config.backgroundDaemonEnabled);
  const [samplingInterval, setSamplingInterval] = useState(config.samplingIntervalSeconds);
  const [cellThrottle, _setCellThrottle] = useState(config.cellThrottleEnabled);

  // Targets
  const [targets, setTargets] = useState<TargetHost[]>(config.targetHosts);

  // Thresholds
  const [rttThreshold, setRttThreshold] = useState(String(config.slaThresholds.criticalRttMs));
  const [jitterThreshold, setJitterThreshold] = useState(String(config.slaThresholds.criticalJitterMs));
  const [lossThreshold, setLossThreshold] = useState(String(config.slaThresholds.criticalLossPercent));

  const handleUpdateHost = (index: number, field: 'host' | 'port', val: string) => {
    const next = [...targets];
    if (field === 'port') {
      next[index].port = parseInt(val, 10) || 80;
    } else {
      next[index].host = val;
    }
    setTargets(next);
  };

  const handleSave = () => {
    const newConfig: AppConfig = {
      ...config,
      backendUrl,
      backgroundDaemonEnabled: daemonEnabled,
      samplingIntervalSeconds: samplingInterval,
      cellThrottleEnabled: cellThrottle,
      targetHosts: targets,
      slaThresholds: {
        criticalRttMs: parseFloat(rttThreshold) || 80,
        criticalJitterMs: parseFloat(jitterThreshold) || 15,
        criticalLossPercent: parseFloat(lossThreshold) || 2,
      },
    };
    onUpdateConfig(newConfig);
    Alert.alert('Configuración Guardada', 'Se actualizaron los parámetros operativos del monitor QoS.');
  };

  const handleClearDatabase = async () => {
    Alert.alert(
      'Purgar Base de Datos',
      '¿Deseas eliminar todas las sesiones y mediciones almacenadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Purgar',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.clearAllSessions();
            Alert.alert('Base de Datos Purgada', 'Se borró el historial de mediciones.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. CALIBRATION BANNER */}
      <View style={styles.banner}>
        <View style={styles.bannerTextCol}>
          <Text style={styles.bannerTitle}>SYS_CALIBRATION // BIOS_SETUP</Text>
          <Text style={styles.bannerSub}>ENGINE: REACT_NATIVE_TURBOMODULE // SYNC: ACTIVE</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>WRITE_MODE</Text>
        </View>
      </View>

      {/* 2. TARGET HOST MATRIX (RF-02) */}
      <RackCard title="01. MATRIZ_HOSTS_TCP // TARGET_MATRIX" tag="SYN_OK">
        <View style={styles.formGroup}>
          {targets.map((tgt, idx) => (
            <View key={tgt.id} style={styles.hostCard}>
              <Text style={styles.hostName}>{tgt.name.toUpperCase()}</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputPrefix}>HOST&gt;</Text>
                <TextInput
                  style={styles.input}
                  value={tgt.host}
                  onChangeText={txt => handleUpdateHost(idx, 'host', txt)}
                  placeholder="Host / IP"
                  placeholderTextColor={colors.outline}
                  autoCapitalize="none"
                />
                <Text style={styles.inputPrefix}>PORT&gt;</Text>
                <TextInput
                  style={[styles.input, { width: 55, flex: undefined }]}
                  value={String(tgt.port)}
                  onChangeText={txt => handleUpdateHost(idx, 'port', txt)}
                  keyboardType="numeric"
                  placeholder="Port"
                  placeholderTextColor={colors.outline}
                />
              </View>
            </View>
          ))}
        </View>
      </RackCard>

      {/* 3. REFERENCE BACKEND URL (RF-03) */}
      <RackCard title="02. BACKEND_BENCHMARK // THROUGHPUT_CORE" tag="HTTP/1.1">
        <View style={styles.hostCard}>
          <Text style={styles.hostName}>URL DEL SERVIDOR FASTIFY (DOWNLOAD/UPLOAD)</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>URL&gt;</Text>
            <TextInput
              style={styles.input}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://10.0.2.2:3000"
              placeholderTextColor={colors.outline}
              autoCapitalize="none"
            />
          </View>
        </View>
      </RackCard>

      {/* 4. BACKGROUND DAEMON & CONTINUOUS SAMPLING (RF-07) */}
      <RackCard title="03. DAEMON_MUESTREO // CONTINUOUS_CORE" tag="BACKGROUND">
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>DAEMON EN SEGUNDO PLANO</Text>
            <Text style={styles.switchSub}>Muestreo pasivo activo con pantalla apagada</Text>
          </View>
          <Switch
            value={daemonEnabled}
            onValueChange={setDaemonEnabled}
            trackColor={{ false: colors.surfaceContainerHighest, true: colors.secondaryContainer }}
            thumbColor={daemonEnabled ? colors.secondary : colors.outline}
          />
        </View>

        {/* Sampling interval */}
        <Text style={[styles.label, { marginTop: spacing.sm }]}>FRECUENCIA DE SONDEO:</Text>
        <View style={styles.rateButtons}>
          {[1, 5, 30].map(sec => (
            <TouchableOpacity
              key={sec}
              style={[
                styles.rateBtn,
                samplingInterval === sec && styles.rateBtnActive,
              ]}
              onPress={() => setSamplingInterval(sec)}
            >
              <Text style={[styles.rateBtnText, samplingInterval === sec && styles.rateBtnTextActive]}>
                {sec} SEG
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </RackCard>

      {/* 5. SLA ALARM THRESHOLD MATRIX (RF-07) */}
      <RackCard title="04. UMBRALES_SLA_ALARM // NOTIFY_DEGRADE" tag="TRIP_ARMED">
        <View style={styles.thresholdRow}>
          <View>
            <Text style={styles.switchTitle}>RTT CRÍTICO</Text>
            <Text style={styles.switchSub}>Alerta inmediata en picos</Text>
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.inputPrefix}>&gt;</Text>
            <TextInput
              style={styles.numInput}
              value={rttThreshold}
              onChangeText={setRttThreshold}
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>ms</Text>
          </View>
        </View>

        <View style={styles.thresholdRow}>
          <View>
            <Text style={styles.switchTitle}>JITTER CRÍTICO</Text>
            <Text style={styles.switchSub}>Desviación de latencia</Text>
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.inputPrefix}>&gt;</Text>
            <TextInput
              style={styles.numInput}
              value={jitterThreshold}
              onChangeText={setJitterThreshold}
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>ms</Text>
          </View>
        </View>

        <View style={styles.thresholdRow}>
          <View>
            <Text style={styles.switchTitle}>PÉRDIDA DE PAQUETES</Text>
            <Text style={styles.switchSub}>Umbral de descarte</Text>
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.inputPrefix}>&gt;</Text>
            <TextInput
              style={styles.numInput}
              value={lossThreshold}
              onChangeText={setLossThreshold}
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>%</Text>
          </View>
        </View>
      </RackCard>

      {/* 6. STORAGE MAINTENANCE */}
      <RackCard title="05. ALMACENAMIENTO // TELEMETRÍA LOCAL" tag="MAINTENANCE">
        <TacticalButton
          label="PURGAR TODAS LAS SESIONES"
          icon="purge"
          variant="danger"
          onPress={handleClearDatabase}
          style={{ marginBottom: spacing.sm }}
        />
      </RackCard>

      {/* 7. SAVE BUTTON */}
      <TacticalButton
        label="APLICAR CAMBIOS Y GUARDAR"
        icon="save"
        variant="primary"
        onPress={handleSave}
        style={{ marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  banner: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
  },
  bannerSub: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  formGroup: {
    gap: spacing.sm,
  },
  hostCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
  },
  hostName: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputPrefix: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
  },
  input: {
    flex: 1,
    height: 28,
    backgroundColor: colors.surfaceContainer,
    color: colors.onSurface,
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  switchTitle: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurface,
  },
  switchSub: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 8,
    color: colors.outline,
    marginTop: 2,
  },
  label: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    marginBottom: 4,
  },
  rateButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rateBtn: {
    flex: 1,
    height: 28,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnActive: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.secondary,
  },
  rateBtnText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
    fontWeight: '600',
  },
  rateBtnTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.xs,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  numInput: {
    width: 35,
    height: 24,
    fontFamily: typography.fontFamilyMono,
    fontSize: 11,
    color: colors.error,
    textAlign: 'right',
    padding: 0,
  },
  unitText: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 9,
    color: colors.outline,
  },
});
