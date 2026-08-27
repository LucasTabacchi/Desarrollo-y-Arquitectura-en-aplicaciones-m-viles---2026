import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { CartItem as CartItemType } from '../data/models/types';
import { useCartStore } from '../store/useCartStore';
import { formatCurrency } from '../utils/format';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { removeItem, updateQuantity, updateColor, updateSize } = useCartStore();
  const [editingColor, setEditingColor] = React.useState(false);
  const [editingSize, setEditingSize] = React.useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{item.product.name}</Text>
        <Text style={styles.price}>
          ${formatCurrency(item.product.price * item.quantity)}
        </Text>
      </View>
      <Text style={styles.subtitle}>
        {item.product.name.includes('Nike') ? "Women's Hard Court Tennis Shoe" : "Adult Tennis Racket"}
      </Text>

      <View style={styles.contentRow}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.product.image }} style={styles.image} resizeMode="contain" />
        </View>
        
        <View style={styles.details}>
          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Color</Text>
            {editingColor ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {item.product.availableColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.optionBtn, item.selectedColor === color && styles.optionBtnSelected]}
                    onPress={() => {
                      updateColor(item.id, color);
                      setEditingColor(false);
                    }}
                  >
                    <Text style={[styles.optionText, item.selectedColor === color && styles.optionTextSelected]}>{color}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TouchableOpacity onPress={() => setEditingColor(true)} style={styles.dropdownSelector}>
                <Text style={styles.dropdownText}>{item.selectedColor || 'Select'}</Text>
                <Feather name="chevron-down" size={14} color="#3498db" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Size</Text>
            {editingSize ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {item.product.availableSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.optionBtn, item.selectedSize === size && styles.optionBtnSelected]}
                    onPress={() => {
                      updateSize(item.id, size);
                      setEditingSize(false);
                    }}
                  >
                    <Text style={[styles.optionText, item.selectedSize === size && styles.optionTextSelected]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TouchableOpacity onPress={() => setEditingSize(true)} style={styles.dropdownSelector}>
                <Text style={styles.dropdownText}>{item.selectedSize || 'Select'} {item.product.name.includes('Nike') ? 'EU' : ''}</Text>
                <Feather name="chevron-down" size={14} color="#3498db" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Qty</Text>
            <View style={styles.quantityControls}>
              {item.quantity === 1 ? (
                <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#e74c3c" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <Feather name="minus" size={16} color="#3498db" />
                </TouchableOpacity>
              )}
              <Text style={styles.quantity}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Text style={styles.plusIcon}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginRight: 16,
    padding: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  details: {
    flex: 1,
    justifyContent: 'center',
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attributeLabel: {
    width: 50,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  attributeValue: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: 90,
  },
  dropdownText: {
    fontSize: 13,
    color: '#1A1A1A',
  },
  optionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    marginRight: 8,
  },
  optionBtnSelected: {
    borderColor: '#3498db',
    backgroundColor: '#EBF5FB',
  },
  optionText: {
    fontSize: 12,
    color: '#1A1A1A',
  },
  optionTextSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 90,
    justifyContent: 'space-between',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  plusIcon: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  }
});
