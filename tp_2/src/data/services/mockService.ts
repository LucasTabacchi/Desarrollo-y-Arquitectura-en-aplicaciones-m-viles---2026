import { Product, PaymentCard, Address } from '../models/types';

export const getMockProducts = (): Product[] => {
  return [
    {
      id: 'p1',
      name: 'NikeCourt Lite 2',
      price: 67,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=500', // Sneaker
      availableColors: ['Blue', 'White'],
      availableSizes: ['37', '38', '39'],
    },
    {
      id: 'p2',
      name: 'Wilson Hammer 5.3',
      price: 80.45,
      image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=500', // Racket
      availableColors: ['Black'],
      availableSizes: ['2-1/4', '3'],
    }
  ];
};

export const getMockCards = (): PaymentCard[] => {
  return [
    {
      id: 'c1',
      type: 'MasterCard',
      last4: '0002',
      nameOnCard: 'Banu Elson',
      expiry: '12/25',
      isDefault: true,
    },
    {
      id: 'c2',
      type: 'Visa',
      last4: '4242',
      nameOnCard: 'Banu Elson',
      expiry: '12/28',
      isDefault: false,
    },
    {
      id: 'c3',
      type: 'Otra',
      last4: '1234',
      nameOnCard: 'Banu Elson',
      expiry: '11/30',
      isDefault: false,
    }
  ];
};

export const getMockAddresses = (): Address[] => {
  return [
    {
      id: 'a1',
      nameAndSurname: 'Banu Elson',
      phoneNumber: '+49 179 111 1010',
      emailAddress: 'orders@banuelson.com',
      addressTitle: 'My Office',
      address: 'Leibnizstraße 16, Wohnheim 6, No: 8X',
      streetAddress2: 'Altenauer Str., 35',
      city: 'Clausthal-Zellerfeld',
      country: 'Germany',
      billingSameAsDelivery: true,
      billingType: 'Personal',
      isDefault: true,
    },
    {
      id: 'a2',
      nameAndSurname: 'Alice Elson',
      phoneNumber: '+49 123 456 7890',
      emailAddress: 'alice@banuelson.com',
      addressTitle: "Mum's House",
      address: 'Erzstrasse Str., 9',
      city: 'Clausthal-Zellerfeld',
      country: 'Germany',
      billingSameAsDelivery: false,
      billingType: 'Personal',
      isDefault: false,
    }
  ];
};
