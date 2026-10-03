import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, ActionButton } from '../../core/ui';

export const SyncConflictScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Conflicto de sincronización"
        isOnline={false}
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.dialogCard} variant="high">
          <Text style={styles.dialogTitle}>Conflicto de sincronización</Text>
          <Text style={styles.dialogSubtitle}>
            Este registro fue modificado en el servidor.
          </Text>

          {/* Local Version */}
          <View style={styles.versionBox}>
            <View style={styles.versionHeader}>
              <Text style={styles.versionTag}>VERSIÓN LOCAL</Text>
              <Text style={styles.versionTime}>Hoy 10:42</Text>
            </View>
            <Text style={styles.deviceTitle}>Router MikroTik hAP ac2</Text>
            <Text style={styles.deviceNotes}>
              Equipo instalado en rack 2. Enlace de fibra verificado. Se reemplazó el router anterior.
            </Text>
          </View>

          {/* Server Version */}
          <View style={styles.versionBox}>
            <View style={styles.versionHeader}>
              <Text style={styles.versionTag}>VERSIÓN DEL SERVIDOR</Text>
              <Text style={styles.versionTime}>Hoy 10:45</Text>
            </View>
            <Text style={styles.deviceTitle}>Router MikroTik hAP ac2</Text>
            <Text style={styles.deviceNotes}>
              Equipo registrado en Nodo Central. Notas distintas a las locales.
            </Text>
          </View>

          {/* Conflict Resolution Actions */}
          <View style={styles.actionRow}>
            <ActionButton
              label="Mantener mía"
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={styles.halfBtn}
            />
            <ActionButton
              label="Usar servidor"
              variant="primary"
              onPress={() => navigation.goBack()}
              style={styles.halfBtn}
            />
          </View>
        </Card>
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
    paddingBottom: spacing.xxl,
  },
  dialogCard: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  dialogTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  dialogSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  versionBox: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    gap: spacing.xs,
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  versionTag: {
    ...typography.labelSm,
    color: colors.primary,
  },
  versionTime: {
    ...typography.bodySm,
    color: colors.muted,
  },
  deviceTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  deviceNotes: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
});
