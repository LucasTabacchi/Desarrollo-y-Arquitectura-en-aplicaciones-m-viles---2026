import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const PdfPreviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PdfPreview'>>();
  const { title = 'Reporte de Instalación #1042' } = route.params || {};

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Reporte PDF"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.previewCanvas} variant="high">
          {/* Simulated PDF Document Header */}
          <View style={styles.pdfHeader}>
            <View>
              <Text style={styles.pdfCompany}>NETWORK DIAGNOSTICS SUITE</Text>
              <Text style={styles.pdfTitle}>{title}</Text>
            </View>
            <Icon name="radar" size={28} color={colors.primary} />
          </View>

          <View style={styles.divider} />

          {/* Section: Datos Generales */}
          <View style={styles.pdfSection}>
            <Text style={styles.pdfSectionTitle}>1. INFORMACIÓN DEL SITIO</Text>
            <Text style={styles.pdfLine}>Sitio: Azotea Norte • Rack 2</Text>
            <Text style={styles.pdfLine}>Técnico: Carlos Méndez</Text>
            <Text style={styles.pdfLine}>Fecha: 03/10/2026 10:42</Text>
            <Text style={styles.pdfLine}>GPS: -32.4825, -58.2372 (Precisión: ±5m)</Text>
          </View>

          {/* Section: Equipo */}
          <View style={styles.pdfSection}>
            <Text style={styles.pdfSectionTitle}>2. DATOS DEL EQUIPO</Text>
            <Text style={styles.pdfLine}>Modelo: Router MikroTik hAP ac2</Text>
            <Text style={styles.pdfLine}>IP: 192.168.1.1</Text>
            <Text style={styles.pdfLine}>MAC: B8:69:F4:11:C2:AA</Text>
            <Text style={styles.pdfLine}>Uptime verificado: 12d 4h 32m</Text>
          </View>

          {/* Section: Evidencia Fotográfica */}
          <View style={styles.pdfSection}>
            <Text style={styles.pdfSectionTitle}>3. EVIDENCIA FOTOGRÁFICA (3 FOTOS)</Text>
            <View style={styles.photoGrid}>
              <View style={styles.photoPlaceholder}>
                <Icon name="antenna" size={20} color={colors.muted} />
                <Text style={styles.photoLabel}>Gabinete</Text>
              </View>
              <View style={styles.photoPlaceholder}>
                <Icon name="router" size={20} color={colors.muted} />
                <Text style={styles.photoLabel}>Cableado</Text>
              </View>
              <View style={styles.photoPlaceholder}>
                <Icon name="place" size={20} color={colors.muted} />
                <Text style={styles.photoLabel}>Fijación</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Action Triggers */}
        <View style={styles.actionsRow}>
          <ActionButton
            label="Compartir PDF"
            icon="copy"
            variant="secondary"
            onPress={() => {}}
            style={styles.halfBtn}
          />
          <ActionButton
            label="Encolar en Outbox"
            icon="cloud_sync"
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.halfBtn}
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
    gap: spacing.lg,
  },
  previewCanvas: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pdfCompany: {
    ...typography.labelSm,
    color: colors.primary,
    letterSpacing: 0.6,
  },
  pdfTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceStroke,
  },
  pdfSection: {
    gap: 4,
  },
  pdfSectionTitle: {
    ...typography.labelSm,
    color: colors.secondary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  pdfLine: {
    ...typography.bodySm,
    color: colors.onSurface,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  photoPlaceholder: {
    flex: 1,
    height: 70,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoLabel: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfBtn: {
    flex: 1,
  },
});
