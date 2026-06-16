/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  category: "hamburguesas" | "snacks" | "combos";
  description: string;
  image?: string;
  ingredients?: string[];
  isAvailable: boolean; // Managed by Admin Module
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string; // Ingredient customization notes
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes: string;
}

export type OrderStatus = "nuevo" | "preparando" | "listo" | "completado";

export interface Order {
  id?: string;
  folio: number;
  clientName: string;
  deliveryType: "recoger" | "domicilio";
  address?: string;
  phone?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: any; // Timestamp or date ISO string
  updatedAt: any;
}

export interface AppConfig {
  prices: { [productId: string]: number };
  activeStatus: { [productId: string]: boolean };
  forceMartesAlitas: "auto" | "active" | "inactive";
  nextFolio: number;
  inventory: { [ingredientName: string]: number };
}
