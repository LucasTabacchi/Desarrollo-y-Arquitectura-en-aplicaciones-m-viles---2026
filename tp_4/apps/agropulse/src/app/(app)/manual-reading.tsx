import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { enqueueReading } from '@/lib/offline-queue';

export default function ManualReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stationId?: string; plotName?: string }>();
  const [moisture, setMoisture] = useState('');
  const [temperature, setTemperature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validateMoisture(value: string): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
  }

  function validateTemperature(value: string): number | null {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function submit() {
    if (isSubmitting || !params.stationId) return;
    const moistureValue = validateMoisture(moisture);
    if (moistureValue === null) { setError('Ingresá un valor de humedad entre 0 y 100.'); return; }
    const tempValue = temperature.trim() ? validateTemperature(temperature) : null;
    if (temperature.trim() && tempValue === null) { setError('Ingresá una temperatura válida.'); return; }

    setIsSubmitting(true);
    setError(null);

    const measuredAt = new Date().toISOString();

    const timeout = setTimeout(async () => {
      setIsSubmitting(false);
      await enqueueReading({
        stationId: params.stationId!,
        measuredAt,
        soilMoisturePct: moistureValue,
        airTemperatureC: tempValue,
      });
      setError('No se pudo enviar la lectura. Se encoló para sincronizar cuando vuelva la conexión.');
    }, 10_000);

    try {
      const result = await supabase.from('readings').insert({
        station_id: params.stationId,
        measured_at: measuredAt,
        source: 'manual',
        soil_moisture_pct: moistureValue,
        air_temperature_c: tempValue,
      });

      clearTimeout(timeout);

      if (result.error) {
        // Duplicate is OK
        if (result.error.code === '23505') {
          setSuccess(true);
          setTimeout(() => router.back(), 1200);
        } else {
          await enqueueReading({
            stationId: params.stationId!,
            measuredAt,
            soilMoisturePct: moistureValue,
            airTemperatureC: tempValue,
          });
          setError('No se pudo guardar la lectura. Se encoló para sincronizar.');
        }
      } else {
        setSuccess(true);
        setTimeout(() => router.back(), 1200);
      }
    } catch {
      clearTimeout(timeout);
      await enqueueReading({
        stationId: params.stationId!,
        measuredAt,
        soilMoisturePct: moistureValue,
        airTemperatureC: tempValue,
      });
      setError('No se pudo guardar la lectura. Se encoló para sincronizar.');
    }
    setIsSubmitting(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" color="#f4f0e6" size={22} />
        </Pressable>

        <View style={styles.iconContainer}>
          <Ionicons name="create-outline" color="#d9e878" size={36} />
        </View>

        <Text style={styles.title}>Lectura manual</Text>
        <Text style={styles.subtitle}>{params.plotName ?? 'Lectura a campo'}</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Humedad del suelo (%)*</Text>
          <TextInput
            accessibilityLabel="Porcentaje de humedad del suelo"
            keyboardType="decimal-pad"
            placeholder="ej. 35.5"
            placeholderTextColor="#718078"
            value={moisture}
            onChangeText={setMoisture}
            style={styles.input}
          />

          <Text style={styles.label}>Temperatura del aire (°C)</Text>
          <TextInput
            accessibilityLabel="Temperatura del aire en grados Celsius"
            keyboardType="decimal-pad"
            placeholder="Opcional"
            placeholderTextColor="#718078"
            value={temperature}
            onChangeText={setTemperature}
            style={styles.input}
          />

          <Text style={styles.hint}>
            Esta lectura se guardará con origen &quot;manual&quot;. Si no tenés conexión, se encolará y sincronizará automáticamente.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>Lectura guardada con éxito.</Text>}

        {!success && (
          <Pressable
            onPress={() => void submit()}
            disabled={isSubmitting || !moisture.trim()}
            style={[styles.submitButton, (isSubmitting || !moisture.trim()) && styles.buttonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#10251d" />
            ) : (
              <>
                <Ionicons name="save-outline" color="#10251d" size={20} />
                <Text style={styles.submitText}>Guardar lectura</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10251d' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  closeButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, height: 40, justifyContent: 'center', position: 'absolute', right: 24, top: 20, width: 40, zIndex: 1 },
  iconContainer: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#173827', borderRadius: 32, height: 80, justifyContent: 'center', marginBottom: 20, width: 80 },
  title: { color: '#f4f0e6', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#a8b7ae', fontSize: 15, marginBottom: 24, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#1c382c', borderColor: '#2d5040', borderRadius: 20, borderWidth: 1, padding: 18 },
  label: { color: '#a8b7ae', fontSize: 14, fontWeight: '700', marginTop: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#365345', borderRadius: 12, borderWidth: 1, color: '#f4f0e6', fontSize: 17, marginTop: 6, padding: 12 },
  hint: { color: '#8a9b91', fontSize: 12, lineHeight: 18, marginTop: 14 },
  error: { color: '#ffb4aa', fontSize: 14, lineHeight: 20, marginTop: 16, textAlign: 'center' },
  success: { color: '#549c60', fontSize: 15, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  submitButton: { alignItems: 'center', backgroundColor: '#d9e878', borderRadius: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 24, padding: 16 },
  submitText: { color: '#10251d', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
});
