import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

const DEFAULT_GEOJSON = JSON.stringify(
  {
    type: 'Polygon',
    coordinates: [
      [
        [-58.395, -31.395],
        [-58.394, -31.395],
        [-58.394, -31.394],
        [-58.395, -31.394],
        [-58.395, -31.395],
      ],
    ],
  },
  null,
  2
);

export default function CreatePlotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ organizationId?: string }>();
  const organizationId = params.organizationId;

  const [name, setName] = useState('');
  const [crop, setCrop] = useState('');
  const [thresholdMin, setThresholdMin] = useState('25');
  const [thresholdMax, setThresholdMax] = useState('45');
  const [boundaryJson, setBoundaryJson] = useState(DEFAULT_GEOJSON);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validateBoundary(raw: string): { valid: boolean; data?: unknown; error?: string } {
    try {
      const parsed = JSON.parse(raw) as { type?: string; coordinates?: number[][][] };
      if (!parsed || typeof parsed !== 'object') return { valid: false, error: 'El GeoJSON debe ser un objeto válido.' };
      if (parsed.type !== 'Polygon') return { valid: false, error: 'El tipo debe ser "Polygon".' };
      if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
        return { valid: false, error: 'Las coordenadas deben contener al menos un anillo.' };
      }
      const ring = parsed.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 4) {
        return { valid: false, error: 'El anillo debe tener al menos 4 puntos (primer y último punto coincidentes).' };
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return { valid: false, error: 'El polígono debe ser cerrado (el primer y último punto deben coincidir).' };
      }
      return { valid: true, data: parsed };
    } catch {
      return { valid: false, error: 'Formato JSON inválido.' };
    }
  }

  async function submit() {
    if (!name.trim()) {
      setError('El nombre del lote es obligatorio.');
      return;
    }
    if (!organizationId) {
      setError('No se identificó el establecimiento activo.');
      return;
    }

    const minNum = Number(thresholdMin);
    const maxNum = Number(thresholdMax);
    if (isNaN(minNum) || isNaN(maxNum) || minNum < 0 || maxNum > 100 || minNum >= maxNum) {
      setError('Los umbrales deben ser valores entre 0 y 100 con Mínimo < Máximo.');
      return;
    }

    const boundaryCheck = validateBoundary(boundaryJson);
    if (!boundaryCheck.valid || !boundaryCheck.data) {
      setError(boundaryCheck.error ?? 'Polígono inválido.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      setError('Tiempo de espera agotado al guardar el lote.');
    }, 10_000);

    try {
      const { error: insertError } = await supabase.from('plots').insert({
        organization_id: organizationId,
        name: name.trim(),
        crop: crop.trim() || null,
        threshold_min: minNum,
        threshold_max: maxNum,
        boundary: boundaryCheck.data,
      });

      clearTimeout(timeout);

      if (insertError) {
        setError(`Error al guardar lote: ${insertError.message}`);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => router.back(), 1200);
    } catch {
      clearTimeout(timeout);
      setError('Ocurrió un error inesperado al conectar con Supabase.');
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" color="#dee4df" size={24} />
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>AGROPULSE / ALTA DE LOTE</Text>
            <Text style={styles.title}>Nuevo lote</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>NOMBRE DEL LOTE *</Text>
          <TextInput
            placeholder="Ej: Costa 3, Parcela Norte"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>CULTIVO (OPCIONAL)</Text>
          <TextInput
            placeholder="Ej: Citrus, Soja, Maíz"
            placeholderTextColor="#6b7280"
            value={crop}
            onChangeText={setCrop}
            style={styles.input}
          />

          <View style={styles.thresholdRow}>
            <View style={styles.thresholdCol}>
              <Text style={styles.label}>UMBRAL MÍN (%)</Text>
              <TextInput
                keyboardType="numeric"
                value={thresholdMin}
                onChangeText={setThresholdMin}
                style={styles.input}
              />
            </View>
            <View style={styles.thresholdCol}>
              <Text style={styles.label}>UMBRAL MÁX (%)</Text>
              <TextInput
                keyboardType="numeric"
                value={thresholdMax}
                onChangeText={setThresholdMax}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>POLÍGONO GEOJSON (4+ VÉRTICES CERRADOS)</Text>
          <TextInput
            multiline
            numberOfLines={7}
            value={boundaryJson}
            onChangeText={setBoundaryJson}
            style={[styles.input, styles.jsonInput]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Se provee un polígono predeterminado en la zona de Concordia, Entre Ríos. Podés editar las coordenadas o pegar tu propio GeoJSON.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>Lote creado exitosamente.</Text>}

        {!success && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => void submit()}
              disabled={isSubmitting || !name.trim()}
              style={[styles.submitButton, (isSubmitting || !name.trim()) && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#003824" />
              ) : (
                <Text style={styles.submitText}>Crear lote</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.back()} disabled={isSubmitting} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f1512' },
  content: { padding: 22, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#171d1a',
    borderColor: '#252b28',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { color: '#22c55e', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#dee4df', fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  form: { gap: 12, backgroundColor: '#171d1a', borderColor: '#252b28', borderWidth: 1, borderRadius: 24, padding: 18 },
  label: { color: '#8ba895', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  input: {
    backgroundColor: '#0f1512',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252b28',
    color: '#dee4df',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  thresholdRow: { flexDirection: 'row', gap: 12 },
  thresholdCol: { flex: 1, gap: 8 },
  jsonInput: {
    fontFamily: 'monospace',
    fontSize: 12,
    height: 120,
    textAlignVertical: 'top',
  },
  hint: { color: '#8ba895', fontSize: 12, lineHeight: 17 },
  error: { color: '#ef4444', fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
  success: { color: '#22c55e', fontSize: 16, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  actions: { gap: 10, marginTop: 10 },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: { color: '#003824', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
  cancelButton: {
    backgroundColor: '#171d1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252b28',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#dee4df', fontSize: 15, fontWeight: '700' },
});
