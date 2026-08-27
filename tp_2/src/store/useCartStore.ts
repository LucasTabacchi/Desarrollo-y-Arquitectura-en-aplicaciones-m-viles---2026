import { create } from 'zustand';
import { CartItem, PaymentCard, Product, Address } from '../data/models/types';
import { getMockCards, getMockProducts, getMockAddresses } from '../data/services/mockService';

interface CartState {
  items: CartItem[];
  availableProducts: Product[];
  savedCards: PaymentCard[];
  selectedCardId: string | null;
  addresses: Address[];
  selectedAddressId: string | null;
  
  // Actions
  initializeStore: () => void;
  ensureMockData: () => void;
  clearCart: () => void;
  addItem: (product: Product, color: string, size: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateColor: (itemId: string, color: string) => void;
  updateSize: (itemId: string, size: string) => void;
  selectCard: (cardId: string) => void;
  addCard: (card: PaymentCard) => void;
  removeCard: (cardId: string) => void;
  addAddress: (address: Address) => void;
  updateAddress: (id: string, updatedAddress: Partial<Address>) => void;
  selectAddress: (addressId: string) => void;
  
  // Computed
  getTotalPrice: () => number;
  getSelectedAddress: () => Address | undefined;
  getSelectedCard: () => PaymentCard | undefined;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  availableProducts: [],
  savedCards: [],
  selectedCardId: null,
  addresses: [],
  selectedAddressId: null,

  initializeStore: () => {
    const products = getMockProducts();
    const cards = getMockCards();
    const mockAddresses = getMockAddresses();
    
    // Add two items by default to show the checkout flow matching Figma
    const defaultItem1: CartItem = {
      id: Math.random().toString(36).substring(7),
      product: products[0],
      selectedColor: products[0].availableColors[0],
      selectedSize: products[0].availableSizes[0],
      quantity: 1,
    };
    const defaultItem2: CartItem = {
      id: Math.random().toString(36).substring(7),
      product: products[1],
      selectedColor: products[1].availableColors[0],
      selectedSize: products[1].availableSizes[0],
      quantity: 1,
    };

    set({
      availableProducts: products,
      savedCards: cards,
      selectedCardId: cards.find(c => c.isDefault)?.id || cards[0]?.id || null,
      addresses: mockAddresses,
      selectedAddressId: mockAddresses.find(a => a.isDefault)?.id || mockAddresses[0]?.id || null,
      items: [defaultItem1, defaultItem2],
    });
  },

  ensureMockData: () => {
    const state = get();
    const updates: Partial<CartState> = {};
    
    if (state.availableProducts.length === 0) {
      updates.availableProducts = getMockProducts();
    }
    
    if (state.savedCards.length === 0) {
      const cards = getMockCards();
      updates.savedCards = cards;
      if (!state.selectedCardId) {
        updates.selectedCardId = cards.find(c => c.isDefault)?.id || cards[0]?.id || null;
      }
    }
    
    if (state.addresses.length === 0) {
      const addrs = getMockAddresses();
      updates.addresses = addrs;
      if (!state.selectedAddressId) {
        updates.selectedAddressId = addrs.find(a => a.isDefault)?.id || addrs[0]?.id || null;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      set(updates);
    }
  },

  clearCart: () => set({ items: [] }),

  addItem: (product, color, size, quantity) => set((state) => {
    const existingItem = state.items.find(
      (item) => item.product.id === product.id && item.selectedColor === color && item.selectedSize === size
    );

    if (existingItem) {
      return {
        items: state.items.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      };
    }

    const newItem: CartItem = {
      id: Math.random().toString(36).substring(7),
      product,
      selectedColor: color,
      selectedSize: size,
      quantity,
    };

    return { items: [...state.items, newItem] };
  }),

  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((item) => item.id !== itemId),
  })),

  updateQuantity: (itemId, quantity) => set((state) => ({
    items: state.items.map((item) =>
      item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
    ),
  })),

  updateColor: (itemId, color) => set((state) => ({
    items: state.items.map((item) =>
      item.id === itemId ? { ...item, selectedColor: color } : item
    ),
  })),

  updateSize: (itemId, size) => set((state) => ({
    items: state.items.map((item) =>
      item.id === itemId ? { ...item, selectedSize: size } : item
    ),
  })),

  selectCard: (cardId) => set({ selectedCardId: cardId }),
  addCard: (card) => set((state) => ({ savedCards: [...state.savedCards, card], selectedCardId: card.id })),
  removeCard: (cardId) => set((state) => ({
    savedCards: state.savedCards.filter((c) => c.id !== cardId),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId
  })),
  
  addAddress: (address) => set((state) => ({
    addresses: [...state.addresses, address],
    selectedAddressId: address.id
  })),

  updateAddress: (id, updatedAddress) => set((state) => ({
    addresses: state.addresses.map(addr => addr.id === id ? { ...addr, ...updatedAddress } : addr)
  })),
  
  selectAddress: (addressId) => set({ selectedAddressId: addressId }),

  getTotalPrice: () => {
    const { items } = get();
    console.log('getTotalPrice items:', items.length, items.map(i => ({price: i.product.price, qty: i.quantity})));
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  },
  
  getSelectedAddress: () => {
    const { addresses, selectedAddressId } = get();
    return addresses.find(a => a.id === selectedAddressId);
  },

  getSelectedCard: () => {
    const { savedCards, selectedCardId } = get();
    return savedCards.find(c => c.id === selectedCardId);
  }
}));
