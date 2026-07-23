import type { Listing } from './listings'
import { listingBuyUrl } from './listings'

const STORAGE_KEY = 'jerseydeals.cart.v1'

export type CartLine = {
  id: string
  title: string
  price: number | null
  currency: string
  image: string
  quantity: number
  checkoutUrl: string
  productUrl?: string
  size?: string
  maxQuantity: number
}

export type CartState = {
  lines: CartLine[]
  updatedAt: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function emptyCart(): CartState {
  return { lines: [], updatedAt: Date.now() }
}

export function readCart(): CartState {
  if (!canUseStorage()) return emptyCart()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCart()
    const parsed = JSON.parse(raw) as CartState
    if (!parsed || !Array.isArray(parsed.lines)) return emptyCart()
    return {
      lines: parsed.lines.filter((line) => line?.id && line?.checkoutUrl),
      updatedAt: parsed.updatedAt || Date.now(),
    }
  } catch {
    return emptyCart()
  }
}

export function writeCart(cart: CartState) {
  if (!canUseStorage()) return
  const next = { ...cart, updatedAt: Date.now() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('jerseydeals:cart', { detail: next }))
}

export function cartCount(cart: CartState) {
  return cart.lines.reduce((sum, line) => sum + Math.max(1, line.quantity || 1), 0)
}

export function cartSubtotal(cart: CartState) {
  return cart.lines.reduce((sum, line) => {
    if (line.price == null) return sum
    return sum + line.price * Math.max(1, line.quantity || 1)
  }, 0)
}

export function listingToCartLine(item: Listing, productUrl?: string): CartLine | null {
  const checkoutUrl = listingBuyUrl(item)
  if (!checkoutUrl) return null
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    currency: item.currency || 'USD',
    image: item.image,
    quantity: 1,
    checkoutUrl,
    productUrl,
    size: item.size || item.note,
    maxQuantity: Math.max(1, item.quantity || 1),
  }
}

export function addListingToCart(item: Listing, productUrl?: string): CartState {
  const line = listingToCartLine(item, productUrl)
  if (!line) return readCart()
  const cart = readCart()
  const existing = cart.lines.find((row) => row.id === line.id)
  if (existing) {
    existing.quantity = Math.min(existing.maxQuantity, existing.quantity + 1)
  } else {
    cart.lines.push(line)
  }
  writeCart(cart)
  return cart
}

export function setCartLineQuantity(id: string, quantity: number): CartState {
  const cart = readCart()
  cart.lines = cart.lines
    .map((line) => {
      if (line.id !== id) return line
      const nextQty = Math.max(0, Math.min(line.maxQuantity, Math.floor(quantity)))
      return { ...line, quantity: nextQty }
    })
    .filter((line) => line.quantity > 0)
  writeCart(cart)
  return cart
}

export function removeCartLine(id: string): CartState {
  const cart = readCart()
  cart.lines = cart.lines.filter((line) => line.id !== id)
  writeCart(cart)
  return cart
}

export function clearCart(): CartState {
  const cart = emptyCart()
  writeCart(cart)
  return cart
}
