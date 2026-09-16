import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Ingresá tu correo electrónico y contraseña.');
      return;
    }
    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Brand Logo / Title */}
            <View style={styles.brandHeader}>
              <View style={styles.brandEmblem}>
                <Ionicons name="leaf" color="#22c55e" size={32} />
              </View>
              <Text style={styles.brandTitle}>AgroPulse</Text>
              <Text style={styles.brandSubtitle}>Agricultura de Precisión</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" color="#86948a" size={19} />
                <TextInput
                  accessibilityLabel="Correo electrónico"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="productor@agropulse.test"
                  placeholderTextColor="#5a6860"
                  style={styles.input}
                  value={email}
                />
              </View>

              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" color="#86948a" size={19} />
                <TextInput
                  accessibilityLabel="Contraseña"
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Tu contraseña"
                  placeholderTextColor="#5a6860"
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => void handleSignIn()}
                style={({ pressed }) => [styles.button, pressed && styles.pressed, isSubmitting && styles.disabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#003824" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Iniciar sesión</Text>
                    <Ionicons name="arrow-forward" color="#003824" size={19} />
                  </View>
                )}
              </Pressable>
            </View>

            <Text style={styles.footerNote}>Estancia Didáctica Concordia • Sistema AgroPulse</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f1512',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
  },
  brandHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandEmblem: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 6,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#86948a',
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#171d1a',
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  label: {
    color: '#dee4df',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    color: '#dee4df',
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    color: '#003824',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
  footerNote: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
