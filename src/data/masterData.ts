/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from "../types";

export const DEFAULT_PRODUCTS: Product[] = [
  // A. HAMBURGUESAS (llevan papas)
  {
    id: "hamb_sencilla",
    name: "Hamburguesa Sencilla",
    price: 75,
    category: "hamburguesas",
    description: "Carne selecta de res, queso amarillo fundido, tocino crujiente, jitomate, cebolla, catsup, mostaza y jalapeño. ¡Incluye papas a la francesa!",
    ingredients: ["Carne res", "Queso amarillo", "Tocino", "Jitomate", "Cebolla", "Catsup", "Mostaza", "Jalapeño", "Papas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "hamb_hawaiana",
    name: "Hamburguesa Hawaiana",
    price: 90,
    category: "hamburguesas",
    description: "La combinación perfecta agridulce: Carne, tocino, queso amarillo, piña dulce, jamón, delicioso queso Oaxaca asado, jitomate, cebolla, mostaza, catsup y jalapeño. ¡Incluye papas!",
    ingredients: ["Carne res", "Tocino", "Queso amarillo", "Piña", "Jamón", "Queso Oaxaca", "Jitomate", "Cebolla", "Mostaza", "Catsup", "Jalapeño", "Papas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "hamb_especial",
    name: "Hamburguesa Especial",
    price: 110,
    category: "hamburguesas",
    description: "¡La campeona de la casa! Doble carne, tocino, queso amarillo, piña dulce, doble porción de jamón, queso Oaxaca, jitomate, cebolla, mostaza, catsup, jalapeño y salchicha asada. ¡Con papas listas!",
    ingredients: ["Doble carne res", "Tocino", "Queso amarillo", "Piña", "Doble jamón", "Queso Oaxaca", "Jitomate", "Cebolla", "Mostaza", "Catsup", "Jalapeño", "Salchicha", "Papas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=600"
  },

  // B. SNACKS Y MÁS
  {
    id: "snack_papas",
    name: "Orden de Papas a la Francesa",
    price: 45,
    category: "snacks",
    description: "Clásicas, doraditas y crujientes papas preparadas en su punto óptimo de sal. Con aderezos a elegir.",
    ingredients: ["Papas a la francesa", "Sal"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_alitas",
    name: "Alitas c/Papas (7 pzas)",
    price: 90,
    category: "snacks",
    description: "7 jugosas piezas bañadas en tu salsa preferida, acompañadas de una guarnición generosa de papas a la francesa.",
    ingredients: ["7 Alitas", "Salsa Buffalo/BBQ", "Papas francesas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_nachos",
    name: "Nachos c/Carne y Queso",
    price: 65,
    category: "snacks",
    description: "Totopos de maíz crujientes, bañados en rica salsa untuosa de queso amarillo caliente, coronados con carne jugosa y chiles jalapeños.",
    ingredients: ["Totopos", "Salsa de queso amarillo", "Carne picada", "Jalapeños"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_salchipapas",
    name: "Salchipapas La Gusguera",
    price: 65,
    category: "snacks",
    description: "Delicioso match instantáneo: tiritas de salchichas freídas a la perfección mezcladas con abundantes papas crujientes y aderezos.",
    ingredients: ["Salchichas picadas", "Papas francesas", "Catsup", "Mayonesa"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_banderilla",
    name: "Banderilla c/Papas",
    price: 50,
    category: "snacks",
    description: "Banderilla empanizada súper crujiente (puedes elegir relleno de Salchicha o Queso Oaxaca hilado), acompañada de papas.",
    ingredients: ["Banderilla Salchicha/Queso", "Papas francesas", "Llovizna de aderezo"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_nuggets",
    name: "Nuggets de Pollo c/Papas (7 pzas)",
    price: 60,
    category: "snacks",
    description: "7 crujientes y tiernos nuggets de pollo fritos, servidos sobre una cama generosa de papas crujientes.",
    ingredients: ["7 Nuggets de pollo", "Papas francesas", "Aderezos"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_papas_carne",
    name: "Papas Fritas c/Carne",
    price: 70,
    category: "snacks",
    description: "Una de nuestras especialidades de snack: papas fritas coronadas con carne sazonada a la plancha y un toque exquisito de aderezo.",
    ingredients: ["Papas francesas", "Carne asada a la plancha", "Queso derretido"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_fajitas",
    name: "Fajitas de Pollo c/Papas",
    price: 100,
    category: "snacks",
    description: "Deliciosas fajitas marinadas, asadas con cebollita y pimiento, acompañadas de papas fritas doradas.",
    ingredients: ["Fajitas de pollo", "Pimientos y cebolla asada", "Papas francesas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "snack_hotdog",
    name: "Hot Dog c/Tocino",
    price: 30,
    category: "snacks",
    description: "Hot dog clásico envuelto en tocino ahumado crujiente, jitomate picado, cebollita dulce y aderezos tradicionales.",
    ingredients: ["Salchicha", "Envoltura de tocino", "Pan de hotdog", "Jitomate", "Cebolla", "Aderezos"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&q=80&w=600"
  },

  // C. COMBOS "PA' QUE TE LLENES"
  {
    id: "combo_sencillito",
    name: "Combo 1: Sencillito",
    price: 110,
    category: "combos",
    description: "Perfecto para domar el antojo individual: Una riquísima Hamburguesa sencilla con papas + 4 jugosas Alitas bañadas.",
    ingredients: ["Hamburguesa sencilla", "4 Alitas de pollo", "Papas francesas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "combo_hawaiano",
    name: "Combo 2: Hawaiano",
    price: 130,
    category: "combos",
    description: "¡Fusión tropical imparable! Una sabrosa Hamburguesa Hawaiana con piña, jamón y queso oaxaca + 5 ricas Alitas + papas.",
    ingredients: ["Hamburguesa Hawaiana", "5 Alitas de pollo", "Papas francesas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "combo_special",
    name: "Combo 3: Special",
    price: 150,
    category: "combos",
    description: "Para los estómagos más valientes de todos: Una tremenda Hamburguesa Especial de doble carne, salchicha y tocino + 5 ricas Alitas + papas.",
    ingredients: ["Hamburguesa Especial", "5 Alitas", "Papas francesas"],
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?auto=format&fit=crop&q=80&w=600"
  }
];

// Special Promotion Structure info
export const MARTES_ALITAS_PROMO = {
  id: "promo_martes_alitas",
  name: "Martes de Alitas 2x$100",
  description: "¡Dos órdenes completas de 7 piezas de alitas bañadas por solo $100! (No incluye papas).",
  price: 100
};
