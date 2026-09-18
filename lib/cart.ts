export const VARIANTS = ['Black', 'Silver', 'Invisible'] as const;
export type Variant = typeof VARIANTS[number];
export type CartItem = { variant: Variant; quantity: number };
export const PRICE = 89;
export const CART_KEY = 'ova.cart.v1';
export const money = (value: number) => `RM${value.toLocaleString('en-MY')}`;
export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return VARIANTS.flatMap(variant => {
    const quantity = value.filter(x => x && x.variant === variant && Number.isInteger(x.quantity) && x.quantity > 0).reduce((sum, x) => sum + x.quantity, 0);
    return quantity ? [{ variant, quantity: Math.min(quantity, 10) }] : [];
  });
}
export function cartTotal(cart: CartItem[]) { return cart.reduce((sum, x) => sum + x.quantity * PRICE, 0); }
export function cartProperties(cart: CartItem[]) {
  return { product_id: 'ova-everyday', currency: 'MYR', unit_price: PRICE, value: cartTotal(cart), quantity: cart.reduce((s,x)=>s+x.quantity,0), items: cart.map(x=>({...x,product_id:'ova-everyday',unit_price:PRICE})) };
}
