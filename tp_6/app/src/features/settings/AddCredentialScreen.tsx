import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/spacing';
import { typography } from '../../core/theme/typography';
import { StatusHeader, Card, Icon, ActionButton } from '../../core/ui';

export const AddCredentialScreen: React.FC = () => {
  const navigation = useNavigation();
  const [alias, setAlias] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [user, setUser] = useState('admin');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.screen}>
      <StatusHeader
        title="Agregar credencial"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.formCard} variant="high">
          <Text style={styles.formTitle}>Nueva credencial segura</Text>

          {/* Alias */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NOMBRE O ALIAS DEL EQUIPO</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Router MikroTik hAP ac2"
              placeholderTextColor={colors.muted}
              value={alias}
              onChangeText={setAlias}
            />
          </View>

          {/* Host IP */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>DIRECCIÓN IP / HOST</Text>
            <TextInput
              style={[styles.input, styles.monoInput]}
              placeholder="192.168.1.1"
              placeholderTextColor={colors.muted}
              value={host}
              onChangeText={setHost}
              keyboardType="numeric"
            />
          </View>

          {/* Port and User row */}
          <View style={styles.splitRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>PUERTO</Text>
              <TextInput
                style={[styles.input, styles.monoInput]}
                placeholder="22"
                placeholderTextColor={colors.muted}
                value={port}
                onChangeText={setPort}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>USUARIO SSH</Text>
              <TextInput
                style={styles.input}
                placeholder="admin"
                placeholderTextColor={colors.muted}
                value={user}
                onChangeText={setUser}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONTRASEÑA</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Keystore Guarantee Notice */}
          <View style={styles.securityBox}>
            <Icon name="lock" size={16} color={colors.success} />
            <Text style={styles.securityText}>
              Cifrado por hardware en Keystore / Keychain. La clave nunca se almacena en texto plano ni se sincroniza.
            </Text>
          </View>

          {/* Action triggers */}
          <View style={styles.actionsRow}>
            <ActionButton
              label="Guardar credencial"
              icon="add_task"
              variant="primary"
              onPress={() => navigation.goBack()}
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
    paddingBottom: spacing.xxl + 20,
  },
  formCard: {
    gap: spacing.md,
  },
  formTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.muted,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceStroke,
    paddingHorizontal: spacing.md,
    color: colors.onSurface,
    ...typography.bodyMd,
  },
  monoInput: {
    ...typography.telemetryMono,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 151, 0.2)',
  },
  securityText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  actionsRow: {
    paddingTop: spacing.sm,
  },
});
