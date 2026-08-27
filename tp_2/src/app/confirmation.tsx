import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/format';

export default function ConfirmationScreen() {
  const router = useRouter();
  const { clearCart, items, getSelectedAddress } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = items.length > 0 ? 0.00 : 0;
  const total = subtotal + shipping;
  const address = getSelectedAddress();

  const handleGoHome = () => {
    clearCart();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoHome} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="chevron-left" size={24} color="#3498db" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Confirmation</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successBlock}>
            <View style={styles.iconContainer}>
              <Feather name="check" size={32} color="#fff" />
            </View>
            <View style={styles.successTextContainer}>
              <Text style={styles.title}>Thank you!</Text>
              <Text style={styles.subtitle}>Your order #BE12345 has been placed.</Text>
            </View>
          </View>

          <Text style={styles.infoText}>
            We sent an email to <Text style={{ fontWeight: '600' }}>{address?.emailAddress || 'orders@banuelson.com'}</Text> with your order confirmation and bill.
          </Text>

          <Text style={styles.infoText}>
            <Text style={{ fontWeight: '700', color: '#1A1A1A' }}>Time placed:</Text> 17/02/2020 12:45 CEST
          </Text>

          {/* Shipping Address */}
          <Text style={styles.sectionTitle}>Shipping</Text>
          {address && (
            <View style={styles.addressBlock}>
              <Text style={styles.addressText}>{address.nameAndSurname}</Text>
              <Text style={styles.addressText}>{address.emailAddress}</Text>
              <Text style={styles.addressText}>{address.phoneNumber}</Text>
              <Text style={[styles.addressText, { marginTop: 8 }]}>{address.address}</Text>
              <Text style={styles.addressText}>{address.city}, {address.country}</Text>
            </View>
          )}

          {/* Billing Address */}
          <Text style={styles.sectionTitle}>Billing</Text>
          {address && (
            <View style={styles.addressBlock}>
              <Text style={styles.addressText}>{address.nameAndSurname}</Text>
              <Text style={styles.addressText}>{address.emailAddress}</Text>
              <Text style={styles.addressText}>{address.phoneNumber}</Text>
              <Text style={[styles.addressText, { marginTop: 8 }]}>{address.address}</Text>
              <Text style={styles.addressText}>{address.city}, {address.country}</Text>
            </View>
          )}

          {/* Order Items */}
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.deliveryEstimate}>
            <Feather name="truck" size={16} color="#1A1A1A" />
            <Text style={styles.deliveryEstimateText}>Arrives by April 3 to April 9th</Text>
          </View>
          
          <View style={styles.itemsList}>
            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="contain" />
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemMeta}>Color: <Text style={{ color: '#888' }}>{item.selectedColor}</Text></Text>
                  <Text style={styles.itemMeta}>Size: <Text style={{ color: '#888' }}>{item.selectedSize}</Text></Text>
                  <View style={styles.itemBottomRow}>
                    <Text style={styles.itemMeta}>Qty: <Text style={{ color: '#888' }}>{item.quantity}</Text></Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      {item.product.name.includes('Wilson') && <Text style={styles.originalPrice}>$99.95</Text>}
                      <Text style={styles.itemPrice}>${formatCurrency(item.product.price)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Order Summary */}
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.row}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>${formatCurrency(shipping)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${formatCurrency(total)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnOutline} onPress={handleGoHome} activeOpacity={0.8}>
            <Text style={styles.btnOutlineText}>Back to Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  successBlock: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  iconContainer: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2ecc71',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  successTextContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },
  infoText: { fontSize: 13, color: '#1A1A1A', marginBottom: 16, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginTop: 8, marginBottom: 12 },
  addressBlock: { 
    backgroundColor: '#F5F5F5', borderRadius: 4, padding: 16, marginBottom: 16 
  },
  addressText: { fontSize: 13, color: '#1A1A1A', marginBottom: 2 },
  deliveryEstimate: {
    backgroundColor: '#FFF9D2',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    gap: 12,
  },
  deliveryEstimateText: { fontSize: 13, color: '#1A1A1A', fontWeight: '500' },
  itemsList: { marginBottom: 24 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  imageContainer: {
    width: 64, height: 64, borderRadius: 8, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  itemImage: { width: 50, height: 50 },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  itemMeta: { fontSize: 13, color: '#1A1A1A', marginBottom: 2 },
  itemBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  originalPrice: { fontSize: 11, color: '#999', textDecorationLine: 'line-through', marginBottom: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  summaryContainer: { marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 13, color: '#1A1A1A' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  totalValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  btnOutline: { 
    borderWidth: 1, borderColor: '#3498db', backgroundColor: '#FFF', 
    paddingVertical: 14, borderRadius: 4, alignItems: 'center',
    marginTop: 8
  },
  btnOutlineText: { color: '#3498db', fontSize: 14, fontWeight: '600' }
});


