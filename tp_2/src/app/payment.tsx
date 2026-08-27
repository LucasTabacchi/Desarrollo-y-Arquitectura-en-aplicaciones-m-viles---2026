import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/format';

import { Feather } from '@expo/vector-icons';

export default function SecurePaymentScreen() {
  const router = useRouter();
  const { savedCards, selectedCardId, items, ensureMockData, getSelectedAddress, addCard } = useCartStore();

  useEffect(() => {
    ensureMockData();
  }, [ensureMockData]);

  const [billingSame, setBillingSame] = useState(true);

  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const shipping = items.length > 0 ? 0.00 : 0; // Shipping is $0.00 in Figma
  const total = subtotal + shipping;
  const selectedAddress = getSelectedAddress();
  const selectedCard = savedCards.find(c => c.id === selectedCardId);

  const handlePay = () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please provide a shipping address.');
      return;
    }
    if (!selectedCard) {
      Alert.alert('Error', 'Please add a payment method.');
      return;
    }
    router.push('/order-review');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="chevron-left" size={24} color="#3498db" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <View style={styles.secureBadge}>
            <Feather name="shield" size={16} color="#4CD964" style={styles.secureBadgeIcon} />
            <View>
              <Text style={styles.secureBadgeText}>SECURE</Text>
              <Text style={styles.secureBadgeSub}>SSL ENCRYPTION</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Shipping Address Block */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipping</Text>
            {selectedAddress && (
              <TouchableOpacity onPress={() => router.push('/saved-addresses')}>
                <Text style={styles.changeText}>Add / Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedAddress ? (
            <>
              <TouchableOpacity style={styles.addressBlock} onPress={() => router.push('/saved-addresses')} activeOpacity={0.8}>
                <View style={styles.addressDetails}>
                  <Text style={styles.addressText}>{selectedAddress.nameAndSurname}</Text>
                  <Text style={styles.addressText}>{selectedAddress.emailAddress}</Text>
                  <Text style={styles.addressText}>{selectedAddress.phoneNumber}</Text>
                  <Text style={styles.addressText}>{selectedAddress.address}</Text>
                  <Text style={styles.addressText}>{selectedAddress.city}, {selectedAddress.country}</Text>
                </View>
                <Feather name="chevron-right" size={24} color="#3498db" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setBillingSame(!billingSame)}>
                <View style={[styles.checkbox, billingSame && styles.checkboxSelected]}>
                  {billingSame && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Billing and delivery addresses are same.</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.addressBlock, { paddingVertical: 20 }]} onPress={() => router.push('/add-address')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Feather name="truck" size={20} color="#1A1A1A" />
                <Text style={styles.addressText}>Add Address</Text>
              </View>
              <Feather name="chevron-right" size={24} color="#3498db" />
            </TouchableOpacity>
          )}

          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>Payment</Text>
            {selectedCard && (
              <TouchableOpacity onPress={() => router.push('/saved-cards')}>
                <Text style={styles.changeText}>Add / Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {selectedCard ? (
            <TouchableOpacity style={styles.addressBlock} onPress={() => router.push('/saved-cards')} activeOpacity={0.8}>
              <View style={[styles.mcLogo, { position: 'relative', right: 0, marginRight: 16 }]}>
                <View style={[styles.mcCircle, { backgroundColor: '#EB001B', zIndex: 2 }]} />
                <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', marginLeft: -8, zIndex: 1 }]} />
              </View>
              <View style={styles.addressDetails}>
                <Text style={styles.cardTypeLabel}>My Virtual Debit Card</Text>
                <Text style={styles.cardNumberMask}>● ● ●  {selectedCard.last4}</Text>
              </View>
              <Feather name="chevron-right" size={24} color="#3498db" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.addressBlock, { paddingVertical: 20 }]} onPress={() => router.push('/add-card')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Feather name="credit-card" size={20} color="#1A1A1A" />
                <Text style={styles.addressText}>Add Card</Text>
              </View>
              <Feather name="chevron-right" size={24} color="#3498db" />
            </TouchableOpacity>
          )}

          {/* Items Preview */}
          <View style={styles.itemsPreviewHeader}>
            <Text style={styles.itemsCount}>{items.length} items</Text>
            <View style={styles.deliveryBadge}>
              <Text style={styles.deliveryBadgeText}>Arrives by April 3 to April 9th</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={styles.itemDetail}>Color: {item.selectedColor}</Text>
                  <Text style={styles.itemDetail}>Size: {item.selectedSize}</Text>
                  <View style={styles.itemQtyPrice}>
                    <Text style={styles.itemDetail}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>${item.product.price}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View style={styles.footerTotal}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${formatCurrency(total)}</Text>
            </View>
            <TouchableOpacity 
              style={styles.payBtn}
              onPress={handlePay}
              activeOpacity={0.8}
            >
              <Text style={styles.payBtnText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            This is the final step, after you touching <Text style={{fontWeight: '700'}}>Pay Now</Text> button, the payment will be transaction
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 32,
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 28,
    color: '#3498db',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secureBadgeIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  secureBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  secureBadgeSub: {
    fontSize: 7,
    color: '#666',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  changeText: {
    fontSize: 13,
    color: '#3498db',
  },
  addressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  addressDetails: {
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    color: '#1A1A1A',
    marginBottom: 2,
    lineHeight: 18,
  },
  cardTypeLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  cardNumberMask: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    letterSpacing: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#1A1A1A',
  },
  addAddressBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addAddressBtnText: {
    fontSize: 14,
    color: '#666',
  },
  cardFormBlock: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardFormTitle: {
    fontSize: 13,
    color: '#1A1A1A',
  },
  inputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    marginBottom: 12,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 9,
    color: '#999',
    marginBottom: 2,
  },
  input: {
    fontSize: 13,
    color: '#1A1A1A',
    padding: 0,
  },
  mcLogo: {
    position: 'absolute',
    right: 12,
    top: '50%',
    flexDirection: 'row',
  },
  mcCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
  },
  infoIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    color: '#3498db',
    fontSize: 16,
  },
  itemsPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemsCount: {
    fontSize: 12,
    color: '#666',
  },
  deliveryBadge: {
    backgroundColor: '#FFFBE6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deliveryBadgeText: {
    fontSize: 10,
    color: '#1A1A1A',
  },
  itemsScroll: {
    flexDirection: 'row',
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 11,
    color: '#666',
  },
  itemQtyPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerTotal: {
    flexDirection: 'column',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  payBtn: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
  },
  payBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
    lineHeight: 14,
  }
});

