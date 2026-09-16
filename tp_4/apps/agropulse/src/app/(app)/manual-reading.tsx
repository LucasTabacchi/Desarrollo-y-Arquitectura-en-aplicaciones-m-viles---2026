import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { enqueueReading } from '@/lib/offline-queue';
import { supabase } from '@/lib/supabase';

export default function ManualReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stationId?: string; plotName?: string }>();
  const [moisture, setMoisture] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function fetchLocation() {
    setIsLocating(true);
    setLocationMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationMessage('Permiso de GPS no concedido. Podés cargar la lectura sin GPS.');
        setIsLocating(false);
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setLocationMessage('Servicio de ubicación desactivado en el dispositivo.');
        setIsLocating(false);
        return;
      }
      let current = await Location.getLastKnownPositionAsync();
      if (!current) {
        current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (current) {
        setGpsCoords({
          latitude: Number(current.coords.latitude.toFixed(6)),
          longitude: Number(current.coords.longitude.toFixed(6)),
        });
        setLocationMessage(null);
      } else {
        setLocationMessage('No se pudo determinar la ubicación GPS exacta.');
      }
    } catch {
      setLocationMessage('No se pudo obtener la posición GPS.');
    } finally {
      setIsLocating(false);
    }
  }

  useEffect(() => {
    void fetchLocation();
  }, []);

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
    if (moistureValue === null) {
      setError('Ingresá un valor de humedad entre 0 y 100.');
      return;
    }
    const tempValue = temperature.trim() ? validateTemperature(temperature) : null;
    if (temperature.trim() && tempValue === null) {
      setError('Ingresá una temperatura válida.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const measuredAt = new Date().toISOString();
    const cleanNotes = notes.trim() || null;
    const lat = gpsCoords?.latitude ?? null;
    const lng = gpsCoords?.longitude ?? null;

    const timeout = setTimeout(async () => {
      setIsSubmitting(false);
      await enqueueReading({
        stationId: params.stationId!,
        measuredAt,
        soilMoisturePct: moistureValue,
        airTemperatureC: tempValue,
        notes: cleanNotes,
        latitude: lat,
        longitude: lng,
      });
      setError('Sin conexión o tiempo de espera agotado. Lectura encolada para sincronizar.');
    }, 10_000);

    try {
      const payload: Record<string, unknown> = {
        station_id: params.stationId,
        measured_at: measuredAt,
        source: 'manual',
        soil_moisture_pct: moistureValue,
        air_temperature_c: tempValue,
      };
      if (cleanNotes) payload.notes = cleanNotes;
      if (lat !== null) payload.latitude = lat;
      if (lng !== null) payload.longitude = lng;

      let result = await supabase.from('readings').insert(payload);

      // Graceful fallback if database schema does not yet have notes/latitude columns
      if (result.error && result.error.code === 'PGRST204') {
        delete payload.notes;
        delete payload.latitude;
        delete payload.longitude;
        result = await supabase.from('readings').insert(payload);
      }

      clearTimeout(timeout);

      if (result.error) {
        if (result.error.code === '23505') {
          setSuccess(true);
          setTimeout(() => router.back(), 1200);
        } else {
          await enqueueReading({
            stationId: params.stationId!,
            measuredAt,
            soilMoisturePct: moistureValue,
            airTemperatureC: tempValue,
            notes: cleanNotes,
            latitude: lat,
            longitude: lng,
          });
          setError('No se pudo enviar al servidor. Se encoló para sincronizar.');
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
        notes: cleanNotes,
        latitude: lat,
        longitude: lng,
      });
      setError('No se pudo guardar la lectura. Se encoló para sincronizar.');
    }
    setIsSubmitting(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" color="#dee4df" size={22} />
          </Pressable>

          <View style={styles.iconContainer}>
            <Ionicons name="create-outline" color="#22c55e" size={36} />
          </View>

          <Text style={styles.title}>Lectura manual</Text>
          <Text style={styles.subtitle}>{params.plotName ?? 'Lectura a campo'}</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Humedad del suelo (%)*</Text>
            <TextInput
              accessibilityLabel="Porcentaje de humedad del suelo"
              keyboardType="decimal-pad"
              placeholder="ej. 35.5"
              placeholderTextColor="#6b7280"
              value={moisture}
              onChangeText={setMoisture}
              style={styles.input}
            />

            <Text style={styles.label}>Temperatura del aire (°C)</Text>
            <TextInput
              accessibilityLabel="Temperatura del aire en grados Celsius"
              keyboardType="decimal-pad"
              placeholder="Opcional"
              placeholderTextColor="#6b7280"
              value={temperature}
              onChangeText={setTemperature}
              style={styles.input}
            />

            {/* RF-21: Campo Nota de campo */}
            <Text style={styles.label}>Notas u observaciones a campo</Text>
            <TextInput
              accessibilityLabel="Notas u observaciones de campo"
              multiline
              numberOfLines={3}
              placeholder="ej. Suelo compacto, sin signos de estrés hídrico..."
              placeholderTextColor="#6b7280"
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.textArea]}
            />

            {/* RF-21: Posición GPS */}
            <Text style={styles.label}>Posición GPS</Text>
            <View style={styles.gpsContainer}>
              <View style={styles.gpsInfo}>
                <Ionicons
                  name={gpsCoords ? 'location' : 'location-outline'}
                  color={gpsCoords ? '#22c55e' : '#8ba895'}
                  size={20}
                />
                <Text style={styles.gpsText}>
                  {isLocating
                    ? 'Obteniendo GPS…'
                    : gpsCoords
                    ? `${gpsCoords.latitude.toFixed(5)}, ${gpsCoords.longitude.toFixed(5)}`
                    : 'Sin ubicación'}
                </Text>
              </View>
              <Pressable
                onPress={() => void fetchLocation()}
                disabled={isLocating}
                style={styles.gpsRefreshButton}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#22c55e" />
                ) : (
                  <Ionicons name="refresh-outline" color="#22c55e" size={18} />
                )}
              </Pressable>
            </View>
            {locationMessage && <Text style={styles.locationWarning}>{locationMessage}</Text>}

            <Text style={styles.hint}>
              Esta lectura se guardará con origen &quot;manual&quot;. Si no tenés conexión a internet, se encolará y sincronizará automáticamente al volver la red.
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
                <ActivityIndicator color="#003824" />
              ) : (
                <>
                  <Ionicons name="save-outline" color="#003824" size={20} />
                  <Text style={styles.submitText}>Guardar lectura</Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1512' },
  keyboardContainer: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#171d1a',
    borderColor: '#252b28',
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: 16,
    width: 40,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: 32,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
    width: 72,
  },
  title: { color: '#dee4df', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#8ba895', fontSize: 14, marginBottom: 20, marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#171d1a', borderColor: '#252b28', borderRadius: 20, borderWidth: 1, padding: 18 },
  label: { color: '#8ba895', fontSize: 14, fontWeight: '700', marginTop: 14 },
  input: {
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 12,
    borderWidth: 1,
    color: '#dee4df',
    fontSize: 16,
    marginTop: 6,
    padding: 12,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  gpsContainer: {
    alignItems: 'center',
    backgroundColor: '#0f1512',
    borderColor: '#252b28',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gpsInfo: { alignItems: 'center', flexDirection: 'row', gap: 8, flex: 1 },
  gpsText: { color: '#dee4df', fontSize: 14, fontWeight: '600' },
  gpsRefreshButton: {
    alignItems: 'center',
    backgroundColor: '#171d1a',
    borderColor: '#252b28',
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  locationWarning: { color: '#eab308', fontSize: 12, marginTop: 6 },
  hint: { color: '#8ba895', fontSize: 12, lineHeight: 18, marginTop: 14 },
  error: { color: '#ef4444', fontSize: 14, lineHeight: 20, marginTop: 16, textAlign: 'center' },
  success: { color: '#22c55e', fontSize: 15, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
  },
  submitText: { color: '#003824', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
});
