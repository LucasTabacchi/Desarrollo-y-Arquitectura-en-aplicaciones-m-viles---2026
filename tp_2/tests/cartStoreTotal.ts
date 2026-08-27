
import { useCartStore } from '../src/store/useCartStore';

const store = useCartStore.getState();
store.initializeStore();
let currentStore = useCartStore.getState();
console.log('Total initial:', currentStore.getTotalPrice());

currentStore.updateQuantity(currentStore.items[0].id, 5);
currentStore = useCartStore.getState();
console.log('Total after +:', currentStore.getTotalPrice());

