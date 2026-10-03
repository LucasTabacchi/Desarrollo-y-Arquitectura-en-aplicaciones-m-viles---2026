import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';
import { DeviceSheetCache, DeviceSheet } from '../../evidence/DeviceSheetCache';
import { getRepositories, initDatabase } from '../../store';

export const QrScannerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [identifiedSheet, setIdentifiedSheet] = useState<DeviceSheet | null>({
    model: 'EchoLife HG8245W5',
    vendor: 'Huawei',
    category: 'ont',
    serialNumber: 'HWTC78921B40',
    mac: 'F4:C3:61:9A:82:10',
    ip: '192.168.1.254',
    hardwareSpecs: {
      ports: '4x GE + 2x POTS + 1x USB + 1x GPON',
      firmwareDefault: 'V500R019C00SPC120',
      opticalPower: 'Rx -8 dBm a -27 dBm',
    },
    installationChecklist: [
      'Verificar potencia óptica entre -15 y -24 dBm',
      'Configurar VLAN 100 de datos',
    ],
  });

  const cache = useMemo(() => new DeviceSheetCache(), []);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const handleCodeDetected = useCallback(
    async (code: string) => {
      try {
        let repos;
        try {
          repos = getRepositories();
        } catch (_) {
          repos = await initDatabase();
        }
        const activeCache = new DeviceSheetCache(repos.devices);
        const sheet = await activeCache.resolveDeviceSheet(code);
        setIdentifiedSheet(sheet);
      } catch (_) {
        Alert.alert('Código QR', `Código leído: ${code}`);
      }
    },
    []
  );

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Escaneo QR / Código"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Camera / Viewfinder Box */}
        <View style={styles.viewfinderContainer}>
          {hasPermission && device && !showManualInput ? (
            <View style={styles.cameraBox}>
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
              />
              {/* Overlay guides */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          ) : (
            <View style={styles.simulatedBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <Icon name="qr_code_scanner" size={56} color={colors.primary} />
              <Text style={styles.scanHint}>
                {hasPermission
                  ? 'Apunta la cámara al código QR del equipo'
                  : 'Cámara simulada (modo laboratorio)'}
              </Text>
            </View>
          )}
        </View>

        {/* Manual Input Toggle */}
        <View style={styles.manualBar}>
          <TouchableOpacity
            style={styles.toggleManualBtn}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Icon name="edit" size={16} color={colors.primary} />
            <Text style={styles.toggleManualText}>
              {showManualInput ? 'Usar lector de cámara' : 'Ingresar código manualmente'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="S/N, MAC o modelo (ej: HWTC1234, MikroTik)..."
                placeholderTextColor={colors.muted}
                value={manualCode}
                onChangeText={setManualCode}
                onSubmitEditing={() => {
                  if (manualCode.trim()) {
                    handleCodeDetected(manualCode.trim());
                  }
                }}
              />
              <TouchableOpacity
                style={styles.manualSubmitBtn}
                onPress={() => {
                  if (manualCode.trim()) {
                    handleCodeDetected(manualCode.trim());
                  }
                }}
              >
                <Text style={styles.manualSubmitText}>Buscar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Identified Device Sheet Card */}
        {identifiedSheet && (
          <Card style={styles.resultCard} variant="high">
            <View style={styles.resultHeader}>
              <View style={styles.iconBox}>
                <Icon name="router" size={24} color={colors.primary} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{identifiedSheet.model}</Text>
                <Text style={styles.resultSn}>
                  S/N: {identifiedSheet.serialNumber || '—'}
                </Text>
              </View>
              <StatusBadge label="Ficha Offline" variant="success" dot />
            </View>

            <View style={styles.specsRow}>
              <Text style={styles.specLabel}>PUERTOS:</Text>
              <Text style={styles.specValue}>{identifiedSheet.hardwareSpecs.ports}</Text>
            </View>

            {identifiedSheet.hardwareSpecs.opticalPower && (
              <View style={styles.specsRow}>
                <Text style={styles.specLabel}>POTENCIA:</Text>
                <Text style={styles.specValue}>
                  {identifiedSheet.hardwareSpecs.opticalPower}
                </Text>
              </View>
            )}

            <View style={styles.specsRow}>
              <Text style={styles.specLabel}>FIRMWARE:</Text>
              <Text style={styles.specValue}>
                {identifiedSheet.hardwareSpecs.firmwareDefault}
              </Text>
            </View>

            <View style={styles.actionButtonsCol}>
              <ActionButton
                label="Abrir diagnóstico SNMP"
                icon="radar"
                variant="primary"
                onPress={() =>
                  navigation.navigate('DeviceDetail', {
                    ip: identifiedSheet.ip || '192.168.1.254',
                    mac: identifiedSheet.mac || 'F4:C3:61:9A:82:10',
                    model: identifiedSheet.model,
                    hostname: identifiedSheet.model,
                  })
                }
              />
              <ActionButton
                label="Registrar nueva instalación"
                icon="add_task"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('NewInstallation', {
                    initialDeviceName: identifiedSheet.model,
                    initialIp: identifiedSheet.ip || '192.168.1.254',
                    initialMac: identifiedSheet.mac || 'F4:C3:61:9A:82:10',
                  })
                }
              />
            </View>
          </Card>
        )}
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
    padding: spacing.margin,
    gap: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  cameraBox: {
    width: 260,
    height: 240,
    borderRadius: spacing.radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    position: 'relative',
  },
  simulatedBox: {
    width: 260,
    height: 240,
    borderRadius: spacing.radius.xl,
    backgroundColor: 'rgba(22, 38, 61, 0.4)',
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    position: 'relative',
  },
  scanHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  manualBar: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.sm,
  },
  toggleManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleManualText: {
    ...typography.labelLg,
    color: colors.primary,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.onSurface,
    ...typography.bodySm,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  manualSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: {
    ...typography.labelSm,
    color: colors.surfaceContainerLowest,
  },
  resultCard: {
    gap: spacing.sm + 2,
  },
  resultHeader: {
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
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  resultSn: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: 2,
  },
  specLabel: {
    ...typography.labelSm,
    color: colors.muted,
  },
  specValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
  },
  actionButtonsCol: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
