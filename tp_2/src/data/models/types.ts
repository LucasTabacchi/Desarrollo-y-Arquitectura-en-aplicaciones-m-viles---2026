export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  availableColors: string[];
  availableSizes: string[];
}

export interface CartItem {
  id: string; // Unique ID for the cart entry
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export type CardType = 'Visa' | 'MasterCard' | 'Amex' | 'Otra';

export interface PaymentCard {
  id: string;
  type: CardType;
  last4: string;
  nameOnCard: string;
  expiry: string;
  isDefault: boolean;
}

export type BillingType = 'Personal' | 'Commercial';

export interface Address {
  id: string;
  nameAndSurname: string;
  phoneNumber: string;
  emailAddress: string;
  addressTitle: string;
  address: string;
  streetAddress2?: string;
  city: string;
  country: string;
  billingSameAsDelivery: boolean;
  billingType: BillingType;
  isDefault: boolean;
}
