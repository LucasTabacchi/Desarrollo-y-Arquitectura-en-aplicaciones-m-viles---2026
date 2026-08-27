import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PaymentCard } from '../data/models/types';
import { useCartStore } from '../store/useCartStore';

interface PaymentMethodSelectorProps {
  card: PaymentCard;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ card }) => {
  const { selectedCardId, selectCard } = useCartStore();
  const isSelected = selectedCardId === card.id;

  // Simple visual cue for card types
  const getCardColor = (type: string) => {
    if (type.toLowerCase() === 'visa') return '#1A1F71';
    if (type.toLowerCase() === 'mastercard') return '#EB001B';
    return '#666666';
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={() => selectCard(card.id)}
      activeOpacity={0.8}
    >
      <View style={styles.cardInfo}>
        <View style={styles.typeIconPlaceholder}>
          <View style={[styles.cardBrandColor, { backgroundColor: getCardColor(card.type) }]} />
          <Text style={styles.typeText}>{card.type}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardNumber}>•••• {card.last4}</Text>
          <Text style={styles.cardName}>{card.nameOnCard}</Text>
        </View>
      </View>
      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },
  containerSelected: {
    borderColor: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconPlaceholder: {
    width: 48,
    height: 32,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  cardBrandColor: {
    width: '100%',
    height: 4,
    position: 'absolute',
    top: 0,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  textContainer: {
    justifyContent: 'center',
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cardName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#1A1A1A',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
  }
});
