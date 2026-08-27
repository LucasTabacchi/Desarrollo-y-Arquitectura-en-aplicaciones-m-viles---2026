import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { CardType } from '../data/models/types';

export default function AddCardScreen() {
  const router = useRouter();
  const { addCard } = useCartStore();

  const [cardType, setCardType] = useState<CardType>('MasterCard');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [rememberCard, setRememberCard] = useState(false);

  const handleSave = () => {
    if (!cardNumber || !cardHolderName || !expMonth || !expYear || !securityCode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    const newCard = {
      id: Math.random().toString(36).substring(7),
      type: cardType,
      last4: cardNumber.slice(-4) || '0000',
      nameOnCard: cardHolderName || 'New User',
      expiry: `${expMonth}/${expYear}`,
      isDefault: rememberCard
    };
    
    addCard(newCard);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Card</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.cardFormBlock}>
            <View style={styles.cardFormHeader}>
              <Text style={styles.cardIcon}>💳</Text>
              <Text style={styles.cardFormTitle}>Add Credit / Debit Card</Text>
            </View>

            <Text style={[styles.inputLabel, { marginBottom: 8 }]}>Card Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {(['Visa', 'MasterCard', 'Amex', 'Otra'] as CardType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, cardType === type && styles.typeOptionSelected]}
                  onPress={() => setCardType(type)}
                >
                  <Text style={[styles.typeOptionText, cardType === type && styles.typeOptionTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Card Holder's Name</Text>
              <TextInput 
                style={styles.input} 
                value={cardHolderName}
                onChangeText={setCardHolderName}
                placeholder="Banu Elson"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <TextInput 
                style={styles.input} 
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="5470 0004 0003 0002"
                keyboardType="numeric"
              />
              <View style={styles.mcLogo}>
                {cardType === 'MasterCard' ? (
                  <>
                    <View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
                    <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', marginLeft: -8 }]} />
                  </>
                ) : cardType === 'Visa' ? (
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1F71', fontStyle: 'italic' }}>VISA</Text>
                ) : cardType === 'Amex' ? (
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#002663' }}>AMEX</Text>
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#666' }}>CARD</Text>
                )}
              </View>
            </View>

            <Text style={styles.inputLabel}>Expire Date</Text>
            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Month</Text>
                <TextInput 
                  style={styles.input} 
                  value={expMonth}
                  onChangeText={setExpMonth}
                  placeholder="12"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Year</Text>
                <TextInput 
                  style={styles.input} 
                  value={expYear}
                  onChangeText={setExpYear}
                  placeholder="25"
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={[styles.inputContainer, { width: '50%' }]}>
              <Text style={styles.inputLabel}>Security Code</Text>
              <TextInput 
                style={styles.input} 
                value={securityCode}
                onChangeText={setSecurityCode}
                placeholder="574"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
              <Text style={styles.infoIcon}>ⓘ</Text>
            </View>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberCard(!rememberCard)}>
              <View style={[styles.checkbox, rememberCard && styles.checkboxSelected]}>
                {rememberCard && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Remember my card for next purchases.</Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
  
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
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    marginRight: 8,
  },
  typeOptionSelected: {
    borderColor: '#3498db',
    backgroundColor: '#EBF5FB',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#1A1A1A',
  },
  typeOptionTextSelected: {
    color: '#3498db',
    fontWeight: '600',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, backgroundColor: '#3498db',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  checkboxSelected: { backgroundColor: '#3498db' },
  checkmark: { color: '#FFF', fontSize: 12 },
  checkboxLabel: { fontSize: 12, color: '#1A1A1A' },
  
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
