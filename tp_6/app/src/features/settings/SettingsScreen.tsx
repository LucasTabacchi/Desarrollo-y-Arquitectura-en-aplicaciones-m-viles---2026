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

interface CredentialItem {
  id: string;
  name: string;
  target: string;
}

const mockCredentials: CredentialItem[] = [
  {
    id: 'cred-1',
    name: 'Router MikroTik hAP ac2',
    target: 'admin@192.168.1.1',
  },
  {
    id: 'cred-2',
    name: 'ONT Huawei HG8245W5',
    target: 'admin@192.168.1.254',
  },
];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Ajustes"
        onPressSyncQueue={() => navigation.navigate('SyncQueue')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <View style={styles.accentBar} />
          <Text style={styles.sectionTitle}>Credenciales de equipos</Text>
        </View>

        {mockCredentials.map((cred) => (
          <Card key={cred.id} style={styles.credCard}>
            <View style={styles.cardHeader}>
              <View style={styles.credInfo}>
                <Text style={styles.credName}>{cred.name}</Text>
                <Text style={styles.credTarget}>{cred.target}</Text>
              </View>
              <View style={styles.iconBox}>
                <Icon name="router" size={20} color={colors.onSurfaceVariant} />
              </View>
            </View>

            {/* Password simulation */}
            <View style={styles.passwordField}>
              <Text style={styles.passwordLabel}>CONTRASEÑA</Text>
              <Text style={styles.passwordDots}>••••••••••</Text>
            </View>

            {/* Security Guarantee */}
            <View style={styles.securityRow}>
              <Icon name="lock" size={14} color={colors.success} />
              <Text style={styles.securityText}>
                Almacenado de forma segura (Keychain/Keystore)
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <ActionButton
                label="Editar"
                icon="edit"
                variant="secondary"
                onPress={() => navigation.navigate('AddCredential', { id: cred.id })}
                style={styles.actionBtn}
              />
              <ActionButton
                label="Eliminar"
                icon="delete"
                variant="danger"
                onPress={() => {}}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        ))}

        <ActionButton
          label="Agregar credencial"
          icon="add_task"
          variant="primary"
          onPress={() => navigation.navigate('AddCredential', {})}
        />
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  credCard: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  credInfo: {
    flex: 1,
  },
  credName: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  credTarget: {
    ...typography.telemetryMonoSm,
    color: colors.secondary,
    marginTop: 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordField: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  passwordLabel: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  passwordDots: {
    ...typography.telemetryMono,
    color: colors.onSurface,
    fontSize: 16,
    letterSpacing: 2,
    marginTop: 2,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    ...typography.labelSm,
    color: colors.success,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceStroke,
    paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 44,
  },
});
