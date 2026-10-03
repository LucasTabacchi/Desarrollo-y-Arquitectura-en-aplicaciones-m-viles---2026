import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const QrScannerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Escaneo QR"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Scanner Target Area */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinderBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            <Icon name="qr_code_scanner" size={64} color={colors.primary} />
            <Text style={styles.scanHint}>Alinee el código QR del equipo</Text>
          </View>
        </View>

        {/* Identified Device Sheet */}
        <Card style={styles.resultCard} variant="high">
          <View style={styles.resultHeader}>
            <View style={styles.iconBox}>
              <Icon name="router" size={24} color={colors.primary} />
            </View>
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle}>ONT Huawei HG8245W5</Text>
              <Text style={styles.resultSn}>S/N: HWTC78921B40</Text>
            </View>
            <StatusBadge label="Caché Offline" variant="success" dot />
          </View>

          <Text style={styles.resultDesc}>
            Ficha técnica disponible localmente sin conexión a internet.
          </Text>

          <ActionButton
            label="Abrir diagnóstico del equipo"
            icon="radar"
            variant="primary"
            onPress={() =>
              navigation.navigate('DeviceDetail', {
                ip: '192.168.1.254',
                mac: 'F4:C3:61:9A:82:10',
                model: 'ONT Huawei HG8245W5',
              })
            }
          />
        </Card>
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
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 260,
    height: 260,
    borderRadius: spacing.radius.xl,
    backgroundColor: 'rgba(22, 38, 61, 0.4)',
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: spacing.md,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  scanHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  resultCard: {
    gap: spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.surfaceContainer,
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
    color: colors.secondary,
    marginTop: 2,
  },
  resultDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});
