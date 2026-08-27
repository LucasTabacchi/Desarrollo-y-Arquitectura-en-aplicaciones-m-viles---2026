import { useCartStore } from './src/store/useCartStore';

const store = useCartStore.getState();
store.initializeStore();

console.log("Items length:", useCartStore.getState().items.length);
console.log("Total price:", useCartStore.getState().getTotalPrice());
