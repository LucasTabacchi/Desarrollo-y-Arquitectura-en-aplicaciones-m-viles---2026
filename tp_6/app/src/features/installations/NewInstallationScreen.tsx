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
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const NewInstallationScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Nueva instalación"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wizard Step Indicator */}
        <Card style={styles.wizardHeader} variant="high">
          <View style={styles.stepTitleRow}>
            <Text style={styles.stepCount}>PASO 4 DE 4</Text>
            <Text style={styles.stepName}>REVISIÓN</Text>
          </View>

          {/* 4 segments */}
          <View style={styles.stepBars}>
            <View style={[styles.stepBar, styles.stepBarActive]} />
            <View style={[styles.stepBar, styles.stepBarActive]} />
            <View style={[styles.stepBar, styles.stepBarActive]} />
            <View style={[styles.stepBar, styles.stepBarActive]} />
          </View>

          <View style={styles.stepLabels}>
            <Text style={styles.stepLabel}>Equipo</Text>
            <Text style={styles.stepLabel}>Evidencia</Text>
            <Text style={styles.stepLabel}>Notas</Text>
            <Text style={[styles.stepLabel, styles.stepLabelCurrent]}>Revisión</Text>
          </View>
        </Card>

        {/* Section 1: Equipo */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Icon name="router" size={18} color={colors.success} />
            <Text style={styles.cardTitle}>Equipo</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Dispositivo</Text>
            <Text style={styles.fieldValue}>Router MikroTik hAP ac2</Text>
          </View>

          <View style={styles.splitRow}>
            <View style={styles.splitCol}>
              <Text style={styles.fieldLabel}>Dirección IP</Text>
              <Text style={styles.fieldValueMono}>192.168.1.1</Text>
            </View>
            <View style={styles.splitCol}>
              <Text style={styles.fieldLabel}>Dirección MAC</Text>
              <Text style={styles.fieldValueMono}>B8:69:F4:11:C2:AA</Text>
            </View>
          </View>
        </Card>

        {/* Section 2: Evidencia */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Icon name="add_task" size={18} color={colors.success} />
            <Text style={styles.cardTitle}>Evidencia</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Fotos</Text>
            <View style={styles.evidenceRow}>
              <Icon name="pending_actions" size={16} color={colors.secondary} />
              <Text style={styles.fieldValue}>3 fotos adjuntas</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Coordenadas GPS</Text>
            <View style={styles.splitRow}>
              <Text style={styles.fieldValueMono}>-32.4825, -58.2372</Text>
              <Text style={styles.accuracyText}>(±5 m)</Text>
            </View>
          </View>
        </Card>

        {/* Section 3: Notas */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Icon name="terminal" size={18} color={colors.success} />
            <Text style={styles.cardTitle}>Notas</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notas técnicas</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                Equipo instalado en rack 2. Enlace de fibra verificado. Se reemplazó el router anterior.
              </Text>
            </View>
          </View>
        </Card>

        {/* Wizard Footer Actions */}
        <View style={styles.footerRow}>
          <ActionButton
            label="Atrás"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          />
          <ActionButton
            label="Guardar y generar reporte PDF"
            icon="terminal"
            variant="primary"
            onPress={() =>
              navigation.navigate('PdfPreview', {
                filePath: 'reporte_instalacion_mikrotik.pdf',
                title: 'Reporte de Instalación #1042',
              })
            }
            style={styles.nextBtn}
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
  wizardHeader: {
    gap: spacing.sm,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  stepName: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
  },
  stepBars: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerLowest,
  },
  stepBarActive: {
    backgroundColor: colors.success,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  stepLabel: {
    ...typography.labelSm,
    color: colors.muted,
    fontSize: 9,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.muted,
  },
  fieldValue: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  fieldValueMono: {
    ...typography.telemetryMono,
    color: colors.onSurface,
    marginTop: 2,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderRadius: spacing.radius.md,
  },
  splitCol: {
    flex: 1,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accuracyText: {
    ...typography.labelSm,
    color: colors.muted,
  },
  notesBox: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
  },
  notesText: {
    ...typography.bodySm,
    color: colors.onSurface,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
});
