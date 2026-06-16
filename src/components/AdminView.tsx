/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  AppConfig, 
  Product, 
  Order 
} from "../types";
import { DEFAULT_PRODUCTS, MARTES_ALITAS_PROMO } from "../data/masterData";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { 
  TrendingUp, 
  Sliders, 
  Package, 
  Truck, 
  Settings, 
  Edit2, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Minus, 
  Search, 
  Check, 
  X, 
  DollarSign, 
  ShoppingBag, 
  Users,
  Copy,
  LayoutDashboard,
  CheckCircle2,
  AlertOctagon,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminViewProps {
  onGoBack: () => void;
}

export default function AdminView({ onGoBack }: AdminViewProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "menu" | "inventory" | "logistics">("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Price Editing States
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>("");

  // 1. Sync configuration settings in real time
  useEffect(() => {
    const configDocRef = doc(db, "config", "settings");
    const unsubscribe = onSnapshot(configDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data() as AppConfig);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "config/settings");
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync orders for analytical calculations
  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        list.push({
          id: doc.id,
          folio: d.folio,
          clientName: d.clientName,
          deliveryType: d.deliveryType,
          address: d.address,
          phone: d.phone,
          items: d.items,
          total: d.total,
          status: d.status,
          createdAt: d.createdAt ? d.createdAt.toDate() : new Date(),
          updatedAt: d.updatedAt ? d.updatedAt.toDate() : new Date(),
        } as Order);
      });
      setOrders(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
    });

    return () => unsubscribe();
  }, []);

  // Helper properties
  const productsList = DEFAULT_PRODUCTS.map(defaultProd => {
    const overridePrice = config?.prices?.[defaultProd.id];
    const overrideAvailability = config?.activeStatus?.[defaultProd.id];
    
    return {
      ...defaultProd,
      price: typeof overridePrice === "number" ? overridePrice : defaultProd.price,
      isAvailable: overrideAvailability !== undefined ? overrideAvailability : defaultProd.isAvailable
    };
  });

  const filteredProducts = productsList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Administrative mutations
  const handleToggleProductAvailability = async (productId: string, current: boolean) => {
    if (!config) return;
    try {
      const configDocRef = doc(db, "config", "settings");
      const nextStatus = { ...config.activeStatus, [productId]: !current };
      await updateDoc(configDocRef, {
        activeStatus: nextStatus
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "config/settings");
    }
  };

  const handleStartEditingPrice = (productId: string, currentPrice: number) => {
    setEditingProductId(productId);
    setNewPriceValue(currentPrice.toString());
  };

  const handleSavePrice = async (productId: string) => {
    if (!config) return;
    const priceNum = parseFloat(newPriceValue);
    if (isNaN(priceNum) || priceNum < 0) return;

    try {
      const configDocRef = doc(db, "config", "settings");
      const nextPrices = { ...config.prices, [productId]: priceNum };
      await updateDoc(configDocRef, {
        prices: nextPrices
      });
      setEditingProductId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "config/settings");
    }
  };

  const handleSetPromoMode = async (mode: "auto" | "active" | "inactive") => {
    if (!config) return;
    try {
      const configDocRef = doc(db, "config", "settings");
      await updateDoc(configDocRef, {
        forceMartesAlitas: mode
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "config/settings");
    }
  };

  // Inventory Stock tracker mutations
  const handleUpdateStock = async (ingredient: string, delta: number) => {
    if (!config || !config.inventory) return;
    const currentQty = config.inventory[ingredient] || 0;
    const nextQty = Math.max(0, currentQty + delta);

    try {
      const configDocRef = doc(db, "config", "settings");
      const nextInventory = { ...config.inventory, [ingredient]: nextQty };
      await updateDoc(configDocRef, {
        inventory: nextInventory
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "config/settings");
    }
  };

  // Financial Analytics Calculations
  const getTodaySalesTotal = () => {
    return orders.reduce((sum, o) => sum + o.total, 0);
  };

  const getOrderStatusCount = (status: string) => {
    return orders.filter(o => o.status === status).length;
  };

  const activeDeliveriesList = orders.filter(o => o.deliveryType === "domicilio" && o.status !== "completado");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Dirección copiada para el repartidor");
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col justify-between">
      
      {/* 1. ADMINISTRATION BRAND HEADER */}
      <header className="bg-slate-900 border-b border-yellow-500/10 px-4 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-beer">
              <Settings className="text-amber-500 animate-spin-slow" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                PANEL DÚO ADMINISTRATIVO
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase">Gerencia</span>
              </h2>
              <p className="text-xs text-slate-400">Control de menú, inventario y logística</p>
            </div>
          </div>

          {/* Action Hub & Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="admin-tab-dash"
              onClick={() => setActiveSubTab("dashboard")}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeSubTab === "dashboard"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              Analítica
            </button>
            <button
              id="admin-tab-menu"
              onClick={() => setActiveSubTab("menu")}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeSubTab === "menu"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <Sliders size={14} />
              Carta de Precios
            </button>
            <button
              id="admin-tab-inv"
              onClick={() => setActiveSubTab("inventory")}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeSubTab === "inventory"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <Package size={14} />
              Inventario
            </button>
            <button
              id="admin-tab-log"
              onClick={() => setActiveSubTab("logistics")}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeSubTab === "logistics"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              <Truck size={14} />
              Despacho ({activeDeliveriesList.length})
            </button>

            <div className="h-6 w-px bg-slate-800" />

            <button
              id="btn-admin-exit"
              onClick={onGoBack}
              className="px-3.5 py-2 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white border border-slate-850 rounded-xl transition-colors cursor-pointer"
            >
              Atrás
            </button>
          </div>
        </div>
      </header>

      {/* 2. TABULAR SECTIONS IMPLEMENTATION */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: ANALYTICAL DASHBOARD OVERVIEW */}
          {activeSubTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Economical Accumulation */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 relative z-10">
                    <span className="text-xs text-slate-400 font-bold block">VENTAS MONETARIAS</span>
                    <h3 className="text-2xl font-black text-amber-500 font-mono">${getTodaySalesTotal()} MXN</h3>
                    <span className="text-[10px] text-emerald-400 font-medium">Acumulado total de caja</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <DollarSign size={20} />
                  </div>
                </div>

                {/* 2. Total active tickets */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 relative z-10">
                    <span className="text-xs text-slate-400 font-bold block">PEDIDOS EN TOTAL</span>
                    <h3 className="text-2xl font-black text-white font-mono">{orders.length} órdenes</h3>
                    <span className="text-[10px] text-slate-500 font-medium">Tickets globales del local</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <ShoppingBag size={20} />
                  </div>
                </div>

                {/* 3. Prep Work queue status */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 relative z-10">
                    <span className="text-xs text-slate-400 font-bold block">EN PLANCHA</span>
                    <h3 className="text-2xl font-black text-orange-500 font-mono">{getOrderStatusCount("preparando")}</h3>
                    <span className="text-[10px] text-orange-400">En preparación activa</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                    <LayoutDashboard size={20} />
                  </div>
                </div>

                {/* 4. Delivery dispatch stats */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 relative z-10">
                    <span className="text-xs text-slate-400 font-bold block">POR DESPACHAR</span>
                    <h3 className="text-2xl font-black text-rose-500 font-mono">{getOrderStatusCount("nuevo")}</h3>
                    <span className="text-[10px] text-rose-400">Nuevos pedidos por iniciar</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                    <Truck size={20} />
                  </div>
                </div>

              </div>

              {/* Central Box for Promo overrules */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-amber-500" size={18} />
                  <h4 className="text-base font-bold text-white">Promoción Martes de Alitas (2x$100)</h4>
                </div>
                <p className="text-xs text-slate-400 select-none">
                  Por defecto, la promoción de Alitas 2x$100 se activa de forma completamente autónoma los días martes según la fecha del sistema, pero si por alguna razón comercial prefieres forzar su encendido o apagarla manualmente, puedes instruirlo a continuación:
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  {[
                    { id: "auto", label: "⏱️ Modo Automático (Solo Martes)", desc: "Se programa solo los martes" },
                    { id: "active", label: "🔥 Forzar Encendido (Siempre Visible)", desc: "Promo activa hoy" },
                    { id: "inactive", label: "🔒 Apagado Permanente", desc: "No mostrar la promo" }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      id={`promo-mode-btn-${mode.id}`}
                      onClick={() => handleSetPromoMode(mode.id as any)}
                      className={`flex-1 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        config?.forceMartesAlitas === mode.id || (mode.id === "auto" && !config?.forceMartesAlitas)
                          ? "bg-amber-500/10 border-amber-500 text-amber-400"
                          : "bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      <h5 className="font-bold text-xs">{mode.label}</h5>
                      <span className="text-[10px] opacity-70 block mt-0.5">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status bar representation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="font-extrabold text-white text-xs tracking-wider uppercase">Estado de Pedidos Hoy</h4>
                  
                  <div className="space-y-3 pt-2">
                    {[
                      { l: "Nuevos", count: getOrderStatusCount("nuevo"), pct: orders.length ? (getOrderStatusCount("nuevo") / orders.length) * 100 : 0, color: "bg-red-500" },
                      { l: "En Preparación", count: getOrderStatusCount("preparando"), pct: orders.length ? (getOrderStatusCount("preparando") / orders.length) * 100 : 0, color: "bg-orange-500" },
                      { l: "Listo para Entregar", count: getOrderStatusCount("listo"), pct: orders.length ? (getOrderStatusCount("listo") / orders.length) * 100 : 0, color: "bg-emerald-500" },
                      { l: "Completados", count: getOrderStatusCount("completado"), pct: orders.length ? (getOrderStatusCount("completado") / orders.length) * 100 : 0, color: "bg-slate-600" }
                    ].map((bar, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-300">{bar.l}</span>
                          <span className="text-white font-mono">{bar.count} ({Math.round(bar.pct)}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h4 className="font-extrabold text-white text-xs tracking-wider uppercase">Ventas por Tipo de Servicios</h4>
                  
                  {/* Delivery vs Pick up proportion bars */}
                  <div className="pt-4 flex flex-col justify-center items-center h-full space-y-6">
                    <div className="flex gap-12 text-center">
                      <div>
                        <span className="text-4xl">🥡</span>
                        <h4 className="text-lg font-black text-white mt-1">
                          {orders.filter(o => o.deliveryType === "recoger").length}
                        </h4>
                        <span className="text-[10px] text-slate-400">Para Recoger</span>
                      </div>
                      <div className="w-px h-16 bg-slate-800" />
                      <div>
                        <span className="text-4xl">🛵</span>
                        <h4 className="text-lg font-black text-white mt-1">
                          {orders.filter(o => o.deliveryType === "domicilio").length}
                        </h4>
                        <span className="text-[10px] text-slate-400">A Domicilio</span>
                      </div>
                    </div>
                    
                    <p className="text-center text-[11px] text-slate-500 leading-normal max-w-xs">
                      Los despachos a domicilio conllevan mayor seguimiento. Verifica la tabla de despachos para coordinar tus repartidores externos.
                    </p>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: MENU & PRICES OVERRIDE EDITORS */}
          {activeSubTab === "menu" && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              {/* Search header */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <h4 className="font-bold text-slate-400 text-sm">CARTA DE PRODUCTOS Y PRECIOS</h4>
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar platillo de la carta..."
                    value={searchQuery}
                    id="admin-search-menu"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-amber-500 text-white"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>
                  )}
                </div>
              </div>

              {/* Menu items table / grid list */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 bg-slate-950/60 border-b border-slate-800 font-bold text-xs text-slate-400 grid grid-cols-12 gap-2 select-none">
                  <div className="col-span-6 md:col-span-5">PRODUCTO</div>
                  <div className="col-span-3">PRECIO MXN</div>
                  <div className="col-span-3 text-center">ESTADO DIARIO</div>
                  <div className="hidden md:block md:col-span-1 text-right">EDITAR</div>
                </div>

                <div className="divide-y divide-slate-850">
                  {filteredProducts.map(prod => (
                    <div 
                      key={prod.id}
                      id={`row-prod-${prod.id}`}
                      className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Name / Description */}
                      <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-white text-xs truncate">{prod.name}</h5>
                          <span className="text-[10px] text-amber-500 font-semibold uppercase">{prod.category}</span>
                        </div>
                      </div>

                      {/* Dynamic Price Editor */}
                      <div className="col-span-3">
                        {editingProductId === prod.id ? (
                          <div className="flex items-center gap-1.5 w-full max-w-[120px]">
                            <span className="text-slate-400 font-mono font-bold">$</span>
                            <input
                              type="number"
                              value={newPriceValue}
                              id={`input-edit-price-${prod.id}`}
                              onChange={(e) => setNewPriceValue(e.target.value)}
                              className="w-full bg-slate-950 border border-amber-500 rounded-lg p-1 text-xs font-mono font-bold text-amber-400 focus:outline-none"
                            />
                            <button
                              id={`btn-save-price-${prod.id}`}
                              onClick={() => handleSavePrice(prod.id)}
                              className="p-1 px-1.5 bg-amber-500 rounded text-slate-950 hover:bg-amber-400 shrink-0 transition-colors cursor-pointer"
                              title="Guardar Precio"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              id={`btn-cancel-price-${prod.id}`}
                              onClick={() => setEditingProductId(null)}
                              className="p-1 px-1.5 bg-slate-800 rounded text-slate-400 hover:text-white shrink-0 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-mono font-black text-sm text-yellow-400">${prod.price}</span>
                            <button
                              id={`btn-edit-price-${prod.id}`}
                              onClick={() => handleStartEditingPrice(prod.id, prod.price)}
                              className="text-slate-500 hover:text-amber-500 p-1 rounded hover:bg-slate-950 transition-all cursor-pointer"
                              title="Cambiar Precio"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Stock availability switch toggle */}
                      <div className="col-span-3 text-center">
                        <button
                          id={`toggle-avl-${prod.id}`}
                          onClick={() => handleToggleProductAvailability(prod.id, prod.isAvailable)}
                          className={`inline-flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            prod.isAvailable
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                          }`}
                        >
                          {prod.isAvailable ? "● DISPONIBLE" : "○ AGOTADO"}
                        </button>
                      </div>

                      {/* Desktop action icon */}
                      <div className="hidden md:block col-span-1 text-right">
                        <button
                          id={`btn-edit-row-inline-${prod.id}`}
                          onClick={() => handleStartEditingPrice(prod.id, prod.price)}
                          className="p-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-white transition-all cursor-pointer"
                        >
                          <Sliders size={12} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: INVENTORY TRACKER */}
          {activeSubTab === "inventory" && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center select-none">
                <h4 className="font-bold text-slate-400 text-sm uppercase">NIVEL DE INSUMOS BÁSICOS</h4>
                <span className="text-xs text-slate-500">Materia prima de la cocina</span>
              </div>

              {config?.inventory ? (
                <div id="inventory-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(config.inventory).map(([ing, qty]) => {
                    const isLow = (qty as number) <= 25;
                    return (
                      <div 
                        key={ing}
                        id={`inv-ing-${ing.replace(/\s+/g, '-').toLowerCase()}`}
                        className={`p-4 rounded-2xl bg-slate-900 border flex flex-col justify-between ${
                          isLow ? "border-amber-500/30 shadow-lg shadow-amber-500/5 bg-slate-900/80" : "border-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-white text-sm">{ing}</h5>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Ingrediente Receta</span>
                          </div>
                          {isLow ? (
                            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 select-none">
                              <AlertOctagon size={10} />
                              STOCK BAJO
                            </span>
                          ) : (
                            <span className="bg-slate-950 text-slate-500 border border-slate-800 rounded-full px-2 py-0.5 text-[10px] font-bold">
                              Estable
                            </span>
                          )}
                        </div>

                        {/* Interactive stock level controls */}
                        <div className="mt-5 flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-850">
                          <div className="flex gap-1">
                            <button
                              id={`id-sub-inv-${ing}`}
                              onClick={() => handleUpdateStock(ing, -10)}
                              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95"
                              title="Reducir 10"
                            >
                              -10
                            </button>
                            <button
                              id={`id-sub-inv-1-${ing}`}
                              onClick={() => handleUpdateStock(ing, -1)}
                              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 text-xs font-bold"
                              title="Reducir 1"
                            >
                              -1
                            </button>
                          </div>

                          <div className="text-center font-mono select-all">
                            <span className={`text-xl font-black ${isLow ? "text-amber-400" : "text-white"}`}>{qty}</span>
                            <span className="text-[10px] text-slate-500 block">unidades</span>
                          </div>

                          <div className="flex gap-1">
                            <button
                              id={`id-add-inv-1-${ing}`}
                              onClick={() => handleUpdateStock(ing, 1)}
                              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95 text-xs font-bold"
                              title="Fijar 1"
                            >
                              +1
                            </button>
                            <button
                              id={`id-add-inv-${ing}`}
                              onClick={() => handleUpdateStock(ing, 10)}
                              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95"
                              title="Incrementar 10"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-12">No hay información de insumos disponible.</div>
              )}
            </motion.div>
          )}

          {/* TAB 4: DELIVERY LOGISTICS DISPATCH TRACKER */}
          {activeSubTab === "logistics" && (
            <motion.div 
              key="logistics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4 animate-fade-in"
            >
              <div className="flex justify-between items-center select-none">
                <h4 className="font-bold text-slate-400 text-sm uppercase">LOGÍSTICA DE ENVÍOS</h4>
                <span className="bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded-xl border border-orange-500/20 font-bold">
                  {activeDeliveriesList.length} despachos activos
                </span>
              </div>

              {activeDeliveriesList.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-center text-slate-600 bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl p-8">
                  <Truck size={48} className="mb-3 text-slate-700" />
                  <h4 className="text-lg font-bold text-slate-400">Sin despachos a domicilio hoy</h4>
                  <p className="text-xs text-slate-500 mt-1">Los pedidos de tipo "A Domicilio" aparecerán listados aquí con su dirección de forma visible.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDeliveriesList.map(ord => (
                    <div 
                      key={ord.id}
                      className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-950 border border-slate-850 text-amber-500 font-mono font-black text-sm px-2.5 py-1 rounded-lg">
                            #{ord.folio}
                          </span>
                          <h5 className="font-bold text-white text-sm">{ord.clientName}</h5>
                          <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/20 uppercase font-black tracking-wider">
                            {ord.status}
                          </span>
                        </div>

                        {/* Customer Address with dynamic copy clicker */}
                        <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 relative flex justify-between items-center gap-4">
                          <div className="text-xs text-slate-300 leading-relaxed pr-10">
                            <strong>Dirección: </strong>
                            <span>{ord.address}</span>
                          </div>
                          
                          <button
                            id={`btn-copy-addr-${ord.id}`}
                            onClick={() => copyToClipboard(ord.address || "")}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-2.5 rounded-xl border border-slate-800/80 transition-all cursor-pointer hover:border-slate-700 shrink-0 absolute right-3 top-1/2 -translate-y-1/2"
                            title="Copiar dirección completa"
                          >
                            <Copy size={14} />
                          </button>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-3 font-semibold">
                          <span>📱 Teléfono: <b className="text-amber-500 font-mono select-all">{ord.phone || "Sin Registrar"}</b></span>
                          <span>🛒 Total: <b>${ord.total} MXN</b></span>
                        </div>
                      </div>

                      {/* Items breakdown display */}
                      <div className="w-full md:w-64 bg-slate-950 border border-slate-850 p-3 rounded-2xl text-xs space-y-1 select-none">
                        <strong className="text-[10px] uppercase text-slate-500 block mb-1">Detalle:</strong>
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="truncate text-slate-400">
                            • {it.quantity}x {it.name}
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

    </div>
  );
}
