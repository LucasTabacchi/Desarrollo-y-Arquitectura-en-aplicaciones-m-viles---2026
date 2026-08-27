import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrderReviewScreen() {
  const router = useRouter();
  const { items } = useCartStore();
  const insets = useSafeAreaInsets();

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = items.length > 0 ? 5.00 : 0;
  const total = subtotal + shipping;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      {/* Bottom Sheet */}
      <View style={styles.sheetContainer}>
        <View style={styles.dragIndicator} />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order Review</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.map((item, index) => (
            <View key={item.id} style={[styles.itemRow, index > 0 && styles.itemDivider]}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="contain" />
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>${formatCurrency(item.product.price)}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemQty}>{item.quantity} Qty</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Sub-total</Text>
            <Text style={styles.summaryValue}>${formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>${formatCurrency(shipping)}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${formatCurrency(total)}</Text>
          </View>

          <TouchableOpacity style={styles.payBtn} onPress={() => router.push('/confirmation')} activeOpacity={0.8}>
            <Text style={styles.payBtnText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  dragIndicator: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5E5',
    alignSelf: 'center', marginTop: 12, marginBottom: 8
  },
  header: {
    alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0'
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  itemDivider: { borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  imageContainer: {
    width: 60, height: 60, borderRadius: 8, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  itemImage: { width: 50, height: 50 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  itemRight: { alignItems: 'flex-end' },
  itemQty: { fontSize: 12, color: '#666' },
  footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalRow: { marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0', marginBottom: 0 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#3498db' },
  payBtn: { backgroundColor: '#3498db', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
