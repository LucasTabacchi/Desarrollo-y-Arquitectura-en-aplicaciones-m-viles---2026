import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { BillingType } from '../data/models/types';

export default function AddAddressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addAddress, updateAddress, addresses } = useCartStore();

  const existingAddress = id ? addresses.find(a => a.id === id) : null;

  const [nameAndSurname, setNameAndSurname] = useState(existingAddress?.nameAndSurname || '');
  const [phoneNumber, setPhoneNumber] = useState(existingAddress?.phoneNumber || '');
  const [emailAddress, setEmailAddress] = useState(existingAddress?.emailAddress || '');
  const [addressTitle, setAddressTitle] = useState(existingAddress?.addressTitle || '');
  const [address, setAddress] = useState(existingAddress?.address || '');
  const [streetAddress2, setStreetAddress2] = useState(existingAddress?.streetAddress2 || '');
  const [showStreet2, setShowStreet2] = useState(!!existingAddress?.streetAddress2);
  const [city, setCity] = useState(existingAddress?.city || '');
  const [country, setCountry] = useState(existingAddress?.country || '');
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(existingAddress?.billingSameAsDelivery ?? true);
  const [billingType, setBillingType] = useState<BillingType>(existingAddress?.billingType || 'Personal');

  const handleSave = () => {
    if (!nameAndSurname || !phoneNumber || !emailAddress || !address || !city || !country) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (existingAddress) {
      updateAddress(existingAddress.id, {
        nameAndSurname,
        phoneNumber,
        emailAddress,
        addressTitle: addressTitle || 'Home',
        address,
        streetAddress2,
        city,
        country,
        billingSameAsDelivery,
        billingType,
      });
    } else {
      addAddress({
        id: Math.random().toString(36).substring(7),
        nameAndSurname,
        phoneNumber,
        emailAddress,
        addressTitle: addressTitle || 'Home',
        address,
        streetAddress2,
        city,
        country,
        billingSameAsDelivery,
        billingType,
        isDefault: false
      });
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
          <Text style={styles.headerTitle}>{existingAddress ? 'Edit Address' : 'Add Address'}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.requiredText}>*Required fields.</Text>

          {/* Section 1 */}
          <View style={styles.sectionHeader}>
            <View style={styles.numberCircle}><Text style={styles.numberText}>1</Text></View>
            <Text style={styles.sectionTitle}>Recipients Information</Text>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>Name and Surname*</Text>
            <TextInput style={styles.input} value={nameAndSurname} onChangeText={setNameAndSurname} placeholder="Banu Elson" />
          </View>

          <View style={styles.phoneRow}>
            <View style={styles.flagContainer}>
              <Text style={styles.flag}>🇩🇪 +49</Text>
            </View>
            <View style={[styles.inputBlock, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.label}>Phone Number*</Text>
              <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="179 111 1010" keyboardType="phone-pad" />
            </View>
          </View>
          <Text style={styles.helperText}>For shipping related questions only.</Text>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>E-mail Address*</Text>
            <TextInput style={styles.input} value={emailAddress} onChangeText={setEmailAddress} placeholder="orders@banuelson.com" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <Text style={styles.helperText}>This address will be used to send you order and bill details.</Text>

          {/* Section 2 */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.numberCircle}><Text style={styles.numberText}>2</Text></View>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>Address Title (Optional)</Text>
            <TextInput style={styles.input} value={addressTitle} onChangeText={setAddressTitle} placeholder="Home" />
          </View>
          <Text style={styles.helperText}>For estimating if the place is opened or closed on the weekends.</Text>

          <View style={[styles.inputBlock, { position: 'relative' }]}>
            <Text style={styles.label}>Adress*</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Leibnizstraße 16, Wohnheim 6, No: 8X" />
            <Text style={styles.targetIcon}>🎯</Text>
          </View>

          {!showStreet2 ? (
            <TouchableOpacity style={styles.addStreetBtn} onPress={() => setShowStreet2(true)}>
              <Text style={styles.addStreetText}>+ Street Address 2 (Optional)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inputBlock}>
              <Text style={styles.label}>Street Address 2</Text>
              <TextInput style={styles.input} value={streetAddress2} onChangeText={setStreetAddress2} placeholder="Apt, Suite, etc." />
            </View>
          )}

          <View style={[styles.inputBlock, { position: 'relative' }]}>
            <Text style={styles.label}>City*</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Clausthal-Zellerfeld" />
            <Text style={styles.dropdownIcon}>˅</Text>
          </View>

          <View style={[styles.inputBlock, { position: 'relative' }]}>
            <Text style={styles.label}>County*</Text>
            <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Germany" />
            <Text style={styles.dropdownIcon}>˅</Text>
          </View>

          {/* Section 3 */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.numberCircle}><Text style={styles.numberText}>3</Text></View>
            <Text style={styles.sectionTitle}>Billing Information</Text>
          </View>

          <Text style={styles.billingSectionTitle}>Billing Address*</Text>
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setBillingSameAsDelivery(!billingSameAsDelivery)}>
            <View style={[styles.checkbox, billingSameAsDelivery && styles.checkboxSelected]}>
              {billingSameAsDelivery && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Same as delivery address.</Text>
          </TouchableOpacity>

          <Text style={styles.billingSectionTitle}>Billing Type*</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity style={styles.radioOption} onPress={() => setBillingType('Personal')}>
              <View style={[styles.radio, billingType === 'Personal' && styles.radioSelected]}>
                {billingType === 'Personal' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Personal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioOption} onPress={() => setBillingType('Commercial')}>
              <View style={[styles.radio, billingType === 'Commercial' && styles.radioSelected]}>
                {billingType === 'Commercial' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Commercial</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
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
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  requiredText: { fontSize: 9, color: '#999', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  numberCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#3498db',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  numberText: { fontSize: 10, color: '#3498db', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  inputBlock: {
    borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8
  },
  label: { fontSize: 9, color: '#999', marginBottom: 2 },
  input: { fontSize: 12, color: '#1A1A1A', padding: 0 },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flagContainer: {
    borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 4, paddingHorizontal: 12,
    justifyContent: 'center', height: 44, marginRight: 8, marginTop: 0
  },
  flag: { fontSize: 12, color: '#1A1A1A' },
  helperText: { fontSize: 9, color: '#999', marginBottom: 16 },
  targetIcon: { position: 'absolute', right: 12, top: 12, fontSize: 16, color: '#3498db' },
  dropdownIcon: { position: 'absolute', right: 12, top: 12, fontSize: 16, color: '#3498db' },
  addStreetBtn: { marginBottom: 16 },
  addStreetText: { fontSize: 12, color: '#3498db' },
  billingSectionTitle: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, backgroundColor: '#3498db',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  checkboxSelected: { backgroundColor: '#3498db' },
  checkmark: { color: '#FFF', fontSize: 12 },
  checkboxLabel: { fontSize: 12, color: '#1A1A1A' },
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  radioOption: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  radio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  radioSelected: { borderColor: '#3498db' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3498db' },
  radioLabel: { fontSize: 12, color: '#1A1A1A' },
  footer: {
    flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#3498db', borderRadius: 4, paddingVertical: 12, alignItems: 'center', marginRight: 8
  },
  cancelBtnText: { color: '#3498db', fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#3498db', borderRadius: 4, paddingVertical: 12, alignItems: 'center', marginLeft: 8
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
