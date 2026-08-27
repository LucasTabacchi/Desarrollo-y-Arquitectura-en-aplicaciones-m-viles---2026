import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/useCartStore';

export default function SavedAddressesScreen() {
  const router = useRouter();
  const { addresses, selectedAddressId, selectAddress } = useCartStore();
  const [localSelected, setLocalSelected] = useState<string | null>(selectedAddressId);

  React.useEffect(() => {
    setLocalSelected(selectedAddressId);
  }, [selectedAddressId]);

  const handleSave = () => {
    if (localSelected) {
      selectAddress(localSelected);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved addresses yet.</Text>
            </View>
          ) : (
            addresses.map((addr) => {
              const isSelected = addr.id === localSelected;
              return (
                <TouchableOpacity 
                  key={addr.id}
                  style={[styles.addressCard, isSelected && styles.addressCardSelected]}
                  onPress={() => setLocalSelected(addr.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.radioRow}>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.addressTitle}>{addr.addressTitle}</Text>
                    </View>
                    <TouchableOpacity 
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => router.push({ pathname: '/add-address', params: { id: addr.id } })}
                    >
                      <Text style={styles.editIcon}>✎</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressDetail}>{addr.address}</Text>
                    {!!addr.streetAddress2 && <Text style={styles.addressDetail}>{addr.streetAddress2}</Text>}
                    <Text style={styles.addressDetail}>{addr.city}, {addr.country}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity style={styles.addBtnRow} onPress={() => router.push('/add-address')}>
            <Text style={styles.addBtnPlus}>+</Text>
            <Text style={styles.addBtnText}>Add New Address</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 24, color: '#3498db' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  content: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 14 },
  addressCard: {
    backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  addressCardSelected: { borderColor: '#3498db' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  radio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  radioSelected: { borderColor: '#3498db' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3498db' },
  addressTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  editIcon: { fontSize: 16, color: '#999' },
  addressInfo: { paddingLeft: 24 },
  addressDetail: { fontSize: 12, color: '#666', marginBottom: 2 },
  addBtnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addBtnPlus: { fontSize: 20, color: '#3498db', marginRight: 8, fontWeight: '300' },
  addBtnText: { fontSize: 14, color: '#3498db', fontWeight: '600' },
  footer: {
    padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  saveBtn: {
    backgroundColor: '#3498db', paddingVertical: 14, borderRadius: 4, alignItems: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
