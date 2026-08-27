import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/format';
import { CartItem } from '../components/CartItem';

export default function ShoppingCartScreen() {
  const router = useRouter();
  const { items, initializeStore } = useCartStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const formattedTotal = formatCurrency(total);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>{totalQuantity} items - Total ${formattedTotal}</Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconPlaceholder}>
              <MaterialCommunityIcons name="cart-outline" size={32} color="#666" />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Looks like you haven&apos;t added anything yet.</Text>
            <TouchableOpacity 
              style={styles.continueBtn}
              onPress={() => initializeStore()}
            >
              <Text style={styles.continueBtnText}>Reload Demo Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.bannerContainer}>
              <MaterialCommunityIcons name="truck-fast-outline" size={22} color="#666" style={styles.bannerIcon} />
              <Text style={styles.bannerText}>Arrives by April 3 to April 9th</Text>
            </View>

            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <CartItem item={item} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />

            <View style={[styles.footer, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
              <View style={styles.totalSection}>
                <View style={styles.totalLabelContainer}>
                  <Feather name="chevron-up" size={14} color="#3498db" />
                  <Text style={styles.totalLabel}>Total</Text>
                </View>
                <Text style={styles.totalValue}>${formattedTotal}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.checkoutBtn}
                onPress={() => router.push('/payment')}
                activeOpacity={0.8}
              >
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  continueBtn: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBE6',
    paddingVertical: 16,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  totalSection: {
    justifyContent: 'center',
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  checkoutBtn: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 4,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});
