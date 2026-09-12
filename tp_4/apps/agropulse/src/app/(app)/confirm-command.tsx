import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { enqueueCommand } from '@/lib/offline-queue';

export default function ConfirmCommandScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    plotName?: string;
    valveName?: string;
    valveId?: string;
    action?: string;
    durationMinutes?: string;
    clientRequestId?: string;
  }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const action = params.action === 'close' ? 'close' : 'open';
  const durationMinutes = Number(params.durationMinutes) || 0;

  async function confirm() {
    if (isSubmitting || !params.valveId || !params.clientRequestId) return;
    setIsSubmitting(true);
    setError(null);

    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      setError('El comando tardó demasiado. Se encoló para reintentar.');
      void enqueueCommand({
        valveId: params.valveId!,
        action,
        durationMinutes,
        clientRequestId: params.clientRequestId!,
      });
    }, 10_000);

    try {
      const result = await supabase.from('irrigation_commands').insert({
        valve_id: params.valveId,
        action,
        duration_minutes: durationMinutes,
        client_request_id: params.clientRequestId,
      });

      clearTimeout(timeout);

      if (result.error) {
        const duplicate = result.error.code === '23505' || result.error.message.toLowerCase().includes('pending');
        if (duplicate) {
          setError('Ya existe un comando pendiente para esta válvula. Volviendo al lote.');
        } else {
          // Queue for offline retry
          await enqueueCommand({
            valveId: params.valveId,
            action,
            durationMinutes,
            clientRequestId: params.clientRequestId!,
          });
          setError('No se pudo enviar el comando. Se encoló para reintentar cuando vuelva la conexión.');
        }
      } else {
        setSuccess(true);
        setTimeout(() => router.back(), 1200);
      }
    } catch {
      clearTimeout(timeout);
      await enqueueCommand({
        valveId: params.valveId!,
        action,
        durationMinutes,
        clientRequestId: params.clientRequestId!,
      });
      setError('No se pudo enviar el comando. Se encoló para reintentar.');
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
          <Ionicons name={action === 'open' ? 'water-outline' : 'close-circle-outline'} color="#d9e878" size={40} />
        </View>

        <Text style={styles.title}>Confirmar comando</Text>
        <Text style={styles.subtitle}>Revisá los detalles antes de enviar.</Text>

        <View style={styles.card}>
          <SummaryRow label="Lote" value={params.plotName ?? 'Desconocido'} />
          <SummaryRow label="Válvula" value={params.valveName ?? 'Desconocida'} />
          <SummaryRow label="Acción" value={action === 'open' ? 'Abrir' : 'Cerrar'} />
          <SummaryRow label="Duración" value={`${durationMinutes} minutos`} />
          <SummaryRow label="ID de solicitud" value={params.clientRequestId ?? 'N/A'} mono />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>Comando enviado con éxito.</Text>}

        {!success && (
          <View style={styles.buttons}>
            <Pressable
              onPress={confirm}
              disabled={isSubmitting}
              style={[styles.confirmButton, isSubmitting && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#10251d" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" color="#10251d" size={20} />
                  <Text style={styles.confirmText}>Confirmar</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#10251d' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  closeButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, height: 40, justifyContent: 'center', position: 'absolute', right: 24, top: 20, width: 40, zIndex: 1 },
  iconContainer: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#173827', borderRadius: 32, height: 80, justifyContent: 'center', marginBottom: 20, width: 80 },
  title: { color: '#f4f0e6', fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#a8b7ae', fontSize: 15, marginBottom: 24, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#1c382c', borderColor: '#2d5040', borderRadius: 20, borderWidth: 1, padding: 16 },
  row: { borderBottomColor: '#2d5040', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  rowLabel: { color: '#a8b7ae', fontSize: 14 },
  rowValue: { color: '#f4f0e6', fontSize: 14, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  error: { color: '#ffb4aa', fontSize: 14, lineHeight: 20, marginTop: 16, textAlign: 'center' },
  success: { color: '#549c60', fontSize: 15, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  buttons: { gap: 10, marginTop: 24 },
  confirmButton: { alignItems: 'center', backgroundColor: '#d9e878', borderRadius: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 16 },
  confirmText: { color: '#10251d', fontSize: 16, fontWeight: '800' },
  cancelButton: { alignItems: 'center', borderColor: '#557064', borderRadius: 16, borderWidth: 1, padding: 16 },
  cancelText: { color: '#f4f0e6', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
});
