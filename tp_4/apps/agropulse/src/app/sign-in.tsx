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
    <ImageBackground
      source={require('../../assets/images/login-bg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
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
            <View style={styles.card}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Ionicons name="leaf-outline" color="#d9e878" size={24} />
                </View>
                <View style={styles.brandTag}>
                  <Text style={styles.eyebrow}>AGROPULSE</Text>
                  <Text style={styles.tagline}>PRECISION IOT</Text>
                </View>
              </View>

              <Text style={styles.title}>Operaciones a campo, con precisión.</Text>
              <Text style={styles.subtitle}>Iniciá sesión para ver las organizaciones y lotes que gestionás.</Text>

              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputShell}>
                <Ionicons name="mail-outline" color="#94a89d" size={19} />
                <TextInput
                  accessibilityLabel="Correo electrónico"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="productor@agropulse.test"
                  placeholderTextColor="#71877b"
                  style={styles.input}
                  value={email}
                />
              </View>

              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputShell}>
                <Ionicons name="lock-closed-outline" color="#94a89d" size={19} />
                <TextInput
                  accessibilityLabel="Contraseña"
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Tu contraseña"
                  placeholderTextColor="#71877b"
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
                  <ActivityIndicator color="#10251d" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Iniciar sesión</Text>
                    <Ionicons name="arrow-forward" color="#10251d" size={19} />
                  </View>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#071b13',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 27, 19, 0.62)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: 'rgba(13, 35, 25, 0.88)',
    borderColor: 'rgba(217, 232, 120, 0.28)',
    borderRadius: 30,
    borderWidth: 1.5,
    elevation: 12,
    gap: 10,
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#1b3f2f',
    borderColor: 'rgba(217, 232, 120, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  brandTag: {
    gap: 1,
  },
  eyebrow: {
    color: '#d9e878',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    color: '#8fa597',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8f3e8',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 34,
    marginTop: 6,
  },
  subtitle: {
    color: '#a8bfae',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  label: {
    color: '#d9e878',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    color: '#f8f3e8',
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#d9e878',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 14,
    shadowColor: '#d9e878',
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
    color: '#10251d',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
