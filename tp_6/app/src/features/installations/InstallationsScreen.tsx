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
import { StatusHeader, Card, Icon, StatusBadge, ActionButton } from '../../core/ui';
import { RootStackParamList } from '../../core/navigation/types';

export const InstallationsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Instalaciones"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary CTA */}
        <ActionButton
          label="Nueva instalación de campo"
          icon="add_task"
          variant="primary"
          onPress={() => navigation.navigate('NewInstallation', { step: 1 })}
        />

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>REGISTROS DE INSTALACIÓN</Text>

          {/* Installation Item 1 */}
          <Card style={styles.itemCard}>
            <View style={styles.itemTop}>
              <View style={styles.deviceRow}>
                <View style={styles.iconBox}>
                  <Icon name="router" size={20} color={colors.primary} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>Router MikroTik hAP ac2</Text>
                  <Text style={styles.siteInfo}>Sitio Azotea Norte • Rack 2</Text>
                </View>
              </View>
              <StatusBadge label="PDF Generado" variant="success" dot />
            </View>

            <View style={styles.evidenceRow}>
              <View style={styles.evidenceItem}>
                <Icon name="place" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.evidenceText}>-32.4825, -58.2372</Text>
              </View>
              <View style={styles.evidenceItem}>
                <Icon name="pending_actions" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.evidenceText}>3 fotos adjuntas</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <ActionButton
                label="Ver Reporte PDF"
                variant="secondary"
                icon="terminal"
                onPress={() =>
                  navigation.navigate('PdfPreview', {
                    filePath: 'mock-report-mikrotik.pdf',
                    title: 'Reporte de Instalación #1042',
                  })
                }
                style={styles.actionBtnSmall}
              />
            </View>
          </Card>

          {/* Installation Item 2 */}
          <Card style={styles.itemCard}>
            <View style={styles.itemTop}>
              <View style={styles.deviceRow}>
                <View style={styles.iconBox}>
                  <Icon name="antenna" size={20} color={colors.secondary} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>Antena Ubiquiti LiteBeam</Text>
                  <Text style={styles.siteInfo}>Torre Principal • Enlace 5GHz</Text>
                </View>
              </View>
              <StatusBadge label="Pendiente Sync" variant="warning" dot />
            </View>

            <View style={styles.evidenceRow}>
              <View style={styles.evidenceItem}>
                <Icon name="place" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.evidenceText}>-32.4811, -58.2360</Text>
              </View>
              <View style={styles.evidenceItem}>
                <Icon name="pending_actions" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.evidenceText}>2 fotos adjuntas</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <ActionButton
                label="Ver Reporte PDF"
                variant="secondary"
                icon="terminal"
                onPress={() =>
                  navigation.navigate('PdfPreview', {
                    filePath: 'mock-report-ubiquiti.pdf',
                    title: 'Reporte de Instalación #1041',
                  })
                }
                style={styles.actionBtnSmall}
              />
            </View>
          </Card>
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
  listSection: {
    gap: spacing.sm + 2,
  },
  sectionTitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  itemCard: {
    gap: spacing.md,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  siteInfo: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderRadius: spacing.radius.md,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceText: {
    ...typography.telemetryMonoSm,
    color: colors.onSurfaceVariant,
  },
  cardActions: {
    paddingTop: 2,
  },
  actionBtnSmall: {
    height: 44,
  },
});
