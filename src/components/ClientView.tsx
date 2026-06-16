/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Clock, 
  ShoppingBag as CartIcon,
  X,
  MapPin,
  Phone,
  User,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem, AppConfig } from "../types";
import { DEFAULT_PRODUCTS, MARTES_ALITAS_PROMO } from "../data/masterData";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  doc, 
  runTransaction, 
  serverTimestamp, 
  getDoc,
  setDoc,
  onSnapshot 
} from "firebase/firestore";

interface ClientViewProps {
  onGoToStaff: () => void;
}

export default function ClientView({ onGoToStaff }: ClientViewProps) {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"todos" | "hamburguesas" | "antojos" | "papas" | "combos">("todos");
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  
  // Checkout Form State
  const [clientName, setClientName] = useState<string>("");
  const [deliveryType, setDeliveryType] = useState<"recoger" | "domicilio">("recoger");
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Real-time configuration / prices
  const [dbConfig, setDbConfig] = useState<AppConfig | null>(null);
  const [isMartes, setIsMartes] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [successFolio, setSuccessFolio] = useState<number | null>(null);
  const [generatedWaUrl, setGeneratedWaUrl] = useState<string>("");

  // Product Detail Modal State
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [detailNotes, setDetailNotes] = useState<string>("");
  const [detailQty, setDetailQty] = useState<number>(1);

  // Open detail helper
  const openProductDetail = (prod: Product) => {
    setSelectedDetailProduct(prod);
    const existing = cart.find(item => item.product.id === prod.id);
    if (existing) {
      setDetailNotes(existing.notes);
      setDetailQty(existing.quantity);
    } else {
      setDetailNotes("");
      setDetailQty(1);
    }
  };

  // Save changes from detail modal helper
  const handleSaveDetailProduct = () => {
    if (!selectedDetailProduct) return;
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === selectedDetailProduct.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === selectedDetailProduct.id 
            ? { ...item, quantity: detailQty, notes: detailNotes } 
            : item
        );
      } else {
        return [...prevCart, { product: selectedDetailProduct, quantity: detailQty, notes: detailNotes }];
      }
    });
    
    setSelectedDetailProduct(null);
  };

  // Toggle ingredient in notes string helper
  const handleToggleIngredientInNotes = (ing: string) => {
    const term = `Sin ${ing}`;
    const regex = new RegExp(`Sin ${ing}(,\\s*)?|(\\s*,\\s*)?Sin ${ing}`, "gi");
    
    // Check if term is already there
    const isPresent = detailNotes.toLowerCase().includes(term.toLowerCase());
    
    if (isPresent) {
      // Remove it
      let updated = detailNotes.replace(regex, "");
      // Trim and clean trailing/leading commas or whitespace
      updated = updated.trim().replace(/^,|,$/g, "").trim();
      setDetailNotes(updated);
    } else {
      // Append it
      const comma = detailNotes.trim() ? ", " : "";
      setDetailNotes(`${detailNotes.trim()}${comma}${term}`);
    }
  };

  // 1. Detect if it's Tuesday or if Promo is turned on active in database
  useEffect(() => {
    const today = new Date();
    // 2 is Tuesday (0=Sunday, 1=Monday, 2=Tuesday)
    setIsMartes(today.getDay() === 2);
  }, []);

  // 2. Sync Configuration & Custom Prices from Firestore
  useEffect(() => {
    const configDocRef = doc(db, "config", "settings");
    
    const unsubscribe = onSnapshot(configDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppConfig;
        setDbConfig(data);

        // Update product list based on fetched prices and stock availability
        setProducts(prevProducts => {
          return DEFAULT_PRODUCTS.map(defaultProd => {
            const overridePrice = data.prices?.[defaultProd.id];
            const overrideAvailability = data.activeStatus?.[defaultProd.id];
            
            return {
              ...defaultProd,
              price: typeof overridePrice === "number" ? overridePrice : defaultProd.price,
              isAvailable: overrideAvailability !== undefined ? overrideAvailability : defaultProd.isAvailable
            };
          });
        });
      } else {
        // Bootstrap default config if not existing in Firestore
        const defaultPrices: { [key: string]: number } = {};
        const defaultStatus: { [key: string]: boolean } = {};
        DEFAULT_PRODUCTS.forEach(p => {
          defaultPrices[p.id] = p.price;
          defaultStatus[p.id] = true;
        });

        const initialConfig: AppConfig = {
          prices: defaultPrices,
          activeStatus: defaultStatus,
          forceMartesAlitas: "auto",
          nextFolio: 1001,
          inventory: {
            "Carne de Res": 150,
            "Queso Oaxaca": 180,
            "Alitas": 200,
            "Papas Francesas": 220,
            "Pan de Hamburguesa": 120,
            "Piña": 80
          }
        };

        setDoc(configDocRef, initialConfig)
          .then(() => setDbConfig(initialConfig))
          .catch(err => console.error("Error bootstrapping settingsConfig:", err));
      }
    }, (error) => {
      // Graceful error handle to standard logging
      console.warn("Using default client configuration. Firestore was unreadable or offline.");
      handleFirestoreError(error, OperationType.GET, "config/settings");
    });

    return () => unsubscribe();
  }, []);

  // Check if Martes Alitas Promo should be rendered and is available
  const isMartesPromoActive = () => {
    if (!dbConfig) return isMartes; // Fallback to date check
    if (dbConfig.forceMartesAlitas === "active") return true;
    if (dbConfig.forceMartesAlitas === "inactive") return false;
    return isMartes; // "auto"
  };

  // Add Alitas Promo directly to Menu if active
  const activeProducts = products.filter(p => {
    if (selectedCategory === "todos") return true;
    return p.category === selectedCategory;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prevCart, { product, quantity: 1, notes: "" }];
    });
    
    // Auto feedback
    setIsCartOpen(true);
  };

  const updateCartItemQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === id) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      });
    });
  };

  const updateCartItemNotes = (id: string, notes: string) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === id) {
          return { ...item, notes };
        }
        return item;
      });
    });
  };

  const removeCartItem = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== id));
  };

  // Tuesday Wing custom direct logic add 
  const addTuesdayPromoToCart = () => {
    const promoProduct: Product = {
      id: MARTES_ALITAS_PROMO.id,
      name: MARTES_ALITAS_PROMO.name,
      price: MARTES_ALITAS_PROMO.price,
      category: "antojos",
      description: MARTES_ALITAS_PROMO.description,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&q=80&w=600"
    };
    addToCart(promoProduct);
  };

  const getCartTotal = () => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  };

  // Submit flow
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!clientName.trim()) errors.clientName = "Escribe tu nombre para identificar el pedido";
    if (deliveryType === "domicilio") {
      if (!address.trim()) errors.address = "Especifica tu dirección completa de entrega";
      if (!phone.trim()) errors.phone = "Brinda un teléfono de contacto de 10 dígitos";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsPlacingOrder(true);

    try {
      // 1. Transaction to generate Folio consecutively
      const configDocRef = doc(db, "config", "settings");
      
      const orderId = `ord_${Date.now()}`;
      const orderDocRef = doc(db, "orders", orderId);
      const itemsForDb = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        notes: item.notes
      }));
      const cartTotal = getCartTotal();

      let createdFolio = 1001;

      await runTransaction(db, async (transaction) => {
        const configSnapshot = await transaction.get(configDocRef);
        if (configSnapshot.exists()) {
          const cfgData = configSnapshot.data();
          if (typeof cfgData.nextFolio === "number") {
            createdFolio = cfgData.nextFolio;
          }
        }
        
        // Write dynamic order setting
        transaction.set(orderDocRef, {
          folio: createdFolio,
          clientName: clientName.trim(),
          deliveryType,
          address: deliveryType === "domicilio" ? address.trim() : "",
          phone: deliveryType === "domicilio" ? phone.trim() : "",
          items: itemsForDb,
          total: cartTotal,
          status: "nuevo",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Increase counter
        transaction.update(configDocRef, { nextFolio: createdFolio + 1 });
      });

      // 2. Order successfully stored! Let's generate and open the WhatsApp link
      // Trigger user success screen
      setSuccessFolio(createdFolio);

      // WhatsApp Message Formatting:
      // Folio NO debe incluirse en el mensaje de WhatsApp del cliente para evitar confusiones.
      let waMessage = `🔥 NUEVO PEDIDO \n\n`;
      waMessage += `*Cliente:* ${clientName.trim()}\n`;
      waMessage += `*Modo:* ${deliveryType === "domicilio" ? "🛵 Servicio a Domicilio" : "🥡 Para Recoger en Local"}\n`;
      
      if (deliveryType === "domicilio") {
        waMessage += `*Dirección:* ${address.trim()}\n`;
        waMessage += `*Teléfono:* ${phone.trim()}\n`;
      }
      
      waMessage += `\n*DETALLE DE LA ORDEN:*\n`;
      cart.forEach(item => {
        waMessage += ` *${item.quantity}x* ${item.product.name}`;
        if (item.notes && item.notes.trim()) {
          waMessage += ` (${item.notes.trim()})`;
        }
        waMessage += `\n`;
      });

      const encodedMessage = encodeURIComponent(waMessage);
      // Hardcoded business WhatsApp number
      const businessPhone = "525613109983"; 
      const waUrl = `https://wa.me/${businessPhone}?text=${encodedMessage}`;

      // Save generated URL to state so Success Modal can allow direct user-triggered clicking!
      setGeneratedWaUrl(waUrl);

      // Reset cart and modal
      setCart([]);
      setShowCheckoutModal(false);
      setClientName("");
      setAddress("");
      setPhone("");

      // Attempt best-effort window-open
      try {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        console.warn("Direct window.open blocked by browser/iframe restrictions:", e);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "orders");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="grid-pattern min-h-screen text-navy-deep flex flex-col justify-between">
      
      {/* 1. BRAND HERO HEADER */}
      <header className="navy-bg border-b-4 border-yellow-accent px-4 pt-6 pb-4 relative overflow-hidden shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-yellow-accent border-2 border-navy-deep flex items-center justify-center shadow-[3px_3px_0px_0px_#f97316]">
              <span className="font-mono font-black text-navy-deep text-lg tracking-tighter">LG</span>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-1.5 leading-none font-sans uppercase">
                LA GUSGUERA
                <span className="inline-block w-2.5 h-2.5 bg-yellow-accent animate-pulse" />
              </h1>
              <p className="text-[10px] text-yellow-accent font-mono font-bold tracking-wider uppercase mt-1">Sabor que pega fuerte</p>
            </div>
          </div>

          <button 
            id="btn-staff-access"
            onClick={onGoToStaff} 
            className="text-xs font-mono font-bold yellow-bg navy-text hover:bg-white border-2 border-navy-deep px-3 py-1.5 transition-all active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]"
          >
            Acceso Personal
          </button>
        </div>
      </header>

      {/* 2. BODY MAIN CONTENT */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        
        {/* Tuesday Promo Alert (Martes de Alitas) */}
        {isMartesPromoActive() && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="promo-top-banner"
            className="mb-6 orange-bg border-4 border-navy-deep p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_#1a2b4b]"
          >
            <div className="flex items-start gap-3 relative z-10 text-white">
              <div className="w-10 h-10 yellow-bg text-navy-deep border-2 border-navy-deep flex items-center justify-center shrink-0">
                <Sparkles size={22} className="animate-spin-slow" />
              </div>
              <div>
                <span className="yellow-bg navy-text text-[9px] font-black uppercase px-2 py-0.5 tracking-wider border border-navy-deep">PROMO ESPECIAL</span>
                <h4 className="text-lg font-black text-white mt-1 uppercase tracking-tight">Martes de Alitas: 2x$100</h4>
                <p className="text-xs text-orange-500/10 mt-0.5 leading-relaxed font-sans text-orange-50 flex items-center">
                  Disfruta de dos órdenes espectaculares de 7 piezas c/u por solo $100 pesitos. (No incluye papas).
                </p>
              </div>
            </div>
            <button
              id="btn-add-martes-promo"
              onClick={addTuesdayPromoToCart}
              className="yellow-bg hover:bg-yellow-300 active:scale-95 transition-all text-navy-deep border-2 border-navy-deep font-black text-xs px-4 py-2.5 self-start md:self-auto cursor-pointer uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-sans"
            >
              Agregar Promo
            </button>
          </motion.div>
        )}

        {/* Categories Section */}
        <section id="categories-section" className="mb-6">
          <div className="flex bg-white p-1.5 border-2 border-slate-300 overflow-x-auto gap-2 pb-2 scrollbar-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.06)]">
            {[
              { id: "todos", label: "✨ Todo el Menú" },
              { id: "hamburguesas", label: "🍔 Hamburguesas" },
              { id: "antojos", label: "😋 Antojos" },
              { id: "papas", label: "🍟 Papas" },
              { id: "combos", label: "📦 Combos" }
            ].map(cat => (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`py-2 px-4 text-xs font-black shrink-0 transition-all cursor-pointer border-2 uppercase ${
                  selectedCategory === cat.id
                    ? "orange-bg text-white border-navy-deep shadow-[2px_2px_0px_0px_#1a2b4b]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Success Modal screen */}
        <AnimatePresence>
          {successFolio && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white border-4 border-navy-deep max-w-sm w-full p-6 text-center shadow-[6px_6px_0px_0px_#1a2b4b]">
                <div className="w-16 h-16 yellow-bg navy-text border-2 border-navy-deep flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle size={36} className="text-navy-deep" />
                </div>
                <h3 className="text-xl font-black text-navy-deep uppercase tracking-tight">¡Pedido Recibido!</h3>
                <p className="text-xs text-slate-600 mt-2 font-semibold uppercase">
                  Hemos enviado tu orden a la plancha. Tu folio es:
                </p>
                <div className="bg-slate-50 border-2 border-navy-deep my-3 py-3 font-mono text-3xl font-extrabold text-orange-accent shadow-[2px_2px_0px_0px_rgba(26,43,75,0.15)]">
                  #{successFolio}
                </div>
                
                <div className="mb-4 bg-yellow-50 border-2 border-dashed border-amber-400 p-3">
                  <p className="text-[11px] font-black uppercase text-amber-800 tracking-wider">
                    ⚠️ ACCIÓN REQUERIDA
                  </p>
                  <p className="text-[11px] text-amber-900 font-medium leading-normal mt-1">
                    Si no se abrió automáticamente, presiona el botón verde de abajo para enviar los detalles por WhatsApp y recibir confirmación.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <a
                    id="btn-send-wa-manual"
                    href={generatedWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#22c55e] border-2 border-navy-deep hover:bg-[#1ebd5d] active:translate-x-[1px] active:translate-y-[1px] transition-all text-white font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1a2b4b]"
                  >
                    💬 ENVIAR POR WHATSAPP
                  </a>

                  <button
                    id="btn-close-success"
                    onClick={() => {
                      setSuccessFolio(null);
                      setGeneratedWaUrl("");
                    }}
                    className="w-full py-2.5 bg-slate-100 border-2 border-navy-deep hover:bg-slate-200 active:translate-x-[1px] active:translate-y-[1px] transition-all text-navy-deep font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(26,43,75,0.7)]"
                  >
                    Regresar al Menú
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail Modal Screen */}
        <AnimatePresence>
          {selectedDetailProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id="product-detail-modal-overlay"
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              {/* Click outside to close */}
              <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedDetailProduct(null)} />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                id="product-detail-modal"
                className="bg-white border-4 border-navy-deep w-full max-w-lg rounded-none overflow-hidden shadow-[8px_8px_0px_0px_#1a2b4b] relative text-navy-deep z-10 flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-4 border-b-2 border-navy-deep flex items-center justify-between navy-bg text-white shrink-0">
                  <h3 className="text-sm font-black flex items-center gap-1.5 uppercase font-sans tracking-tight">
                    <Info size={18} className="text-yellow-accent" />
                    Detalle del Antojo
                  </h3>
                  <button
                    id="detail-modal-close"
                    onClick={() => setSelectedDetailProduct(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-none text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto">
                  {/* High quality Image */}
                  <div className="relative h-56 w-full bg-slate-100 border-b-2 border-navy-deep overflow-hidden">
                    <img
                      src={selectedDetailProduct.image}
                      alt={selectedDetailProduct.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.55">
                      <span className="yellow-bg navy-text text-[10px] font-black uppercase px-2 py-1 border border-navy-deep shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
                        ⭐ {selectedDetailProduct.category === "hamburguesas" ? "Hamburguesas" : selectedDetailProduct.category === "combos" ? "Combos" : selectedDetailProduct.category === "papas" ? "Papas" : "Antojos"}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5">
                    {/* Title and Price */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h2 className="text-xl font-black text-navy-deep uppercase tracking-tight font-sans">{selectedDetailProduct.name}</h2>
                        <p className="text-xs text-slate-500 font-bold font-mono mt-1 uppercase">Código de cocina: {selectedDetailProduct.id}</p>
                      </div>
                      <div className="yellow-bg px-4 py-1.5 border-2 border-navy-deep shadow-[3px_3px_0px_0px_#1a2b4b] shrink-0">
                        <span className="font-mono font-black text-xl text-navy-deep">${selectedDetailProduct.price} MXN</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">🍗 Descripción de La Casa:</h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 p-3 border-2 border-dashed border-slate-300">
                        {selectedDetailProduct.description}
                      </p>
                    </div>

                    {/* Ingredients Section ("De qué está hecho") */}
                    {selectedDetailProduct.ingredients && selectedDetailProduct.ingredients.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">🥩 ¿De qué está hecho? (Ingredientes):</h4>
                          <span className="text-[10px] font-bold text-orange-accent uppercase font-mono">Toca para Quitar 🚫</span>
                        </div>
                        
                        <div className="bg-yellow-50/50 p-3 border-2 border-yellow-105 space-y-2">
                          <p className="text-[10px] uppercase font-black text-amber-800 leading-normal">
                            💡 TIP: Toca cualquier ingrediente para pedirlo SIN él en tu comentario de cocina de forma automática.
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            {selectedDetailProduct.ingredients.map((ing, idx) => {
                              const isExcluded = detailNotes.toLowerCase().includes(`sin ${ing.toLowerCase()}`);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleToggleIngredientInNotes(ing)}
                                  className={`text-xs font-bold px-3 py-1.5 transition-all cursor-pointer border-2 uppercase flex items-center gap-1 ${
                                    isExcluded
                                      ? "bg-red-50 text-red-600 border-red-500 line-through decoration-red-500/85"
                                      : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300"
                                  }`}
                                  title={isExcluded ? `Pedir CON ${ing}` : `Pedir SIN ${ing}`}
                                >
                                  {isExcluded ? "❌" : "✓"} {ing}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom comments/notes form */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-navy-deep font-black block uppercase tracking-tight">
                        ✏️ Instrucciones Especiales para Cocina:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ej. 'Cebolla muy asadita', 'Sin salsa catsup', 'Salsa BBQ aparte'..."
                        value={detailNotes}
                        onChange={(e) => setDetailNotes(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-300 text-xs rounded-none p-3 text-navy-deep placeholder-slate-400 focus:outline-none focus:border-navy-deep font-sans"
                      />
                      <p className="text-[10px] text-slate-500 font-medium">Estas notas se enviarán a cocina junto con tu pedido.</p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t-2 border-navy-deep flex items-center justify-between gap-4 shrink-0">
                  {/* Quantity controls */}
                  <div className="flex items-center bg-white border-2 border-navy-deep p-1 shadow-[2px_2px_0px_0px_rgba(26,43,75,0.15)]">
                    <button
                      type="button"
                      onClick={() => setDetailQty(q => Math.max(1, q - 1))}
                      className="w-8 h-8 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-95 cursor-pointer font-bold border border-slate-200"
                    >
                      <Minus size={14} className="stroke-[3.5px]" />
                    </button>
                    <span className="font-mono font-black text-sm text-navy-deep w-12 text-center">
                      {detailQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailQty(q => q + 1)}
                      className="w-8 h-8 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-95 cursor-pointer font-bold border border-slate-200"
                    >
                      <Plus size={14} className="stroke-[3.5px]" />
                    </button>
                  </div>

                  {/* Add action button */}
                  <button
                    type="button"
                    onClick={handleSaveDetailProduct}
                    className="flex-1 py-3 bg-[#facc15] border-2 border-navy-deep hover:bg-yellow-400 text-navy-deep font-black text-xs uppercase tracking-wider transition-all shadow-[3px_3px_0px_0px_rgba(26,43,75,1)] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Guardar e Ir a Canasta (${selectedDetailProduct.price * detailQty} MXN)
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Grid */}
        <div id="product-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeProducts.map(prod => {
            const isItemInCart = cart.find(item => item.product.id === prod.id);
            const inCartQty = isItemInCart ? isItemInCart.quantity : 0;

            return (
              <motion.div
                key={prod.id}
                id={`product-card-${prod.id}`}
                layout
                className={`bg-white border-2 overflow-hidden flex flex-col justify-between transition-all group p-4 shadow-[4px_4px_0px_0px_rgba(26,43,75,0.06)] ${
                  !prod.isAvailable 
                    ? "opacity-50 border-slate-300 pointer-events-none" 
                    : inCartQty > 0
                    ? "border-orange-accent shadow-[4px_4px_0px_0px_#f97316]" 
                    : "border-slate-350 hover:border-navy-deep/60 hover:shadow-[4px_4px_0px_0px_#1a2b4b]"
                }`}
              >
                {/* Clickable Card Body wrapper */}
                <div 
                  onClick={() => openProductDetail(prod)}
                  className="cursor-pointer group/card flex-1 flex flex-col justify-between mb-3"
                  title="Ver de qué está hecho y detalles del ingrediente"
                >
                  {/* Image Section */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {!prod.isAvailable && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <span className="text-xs uppercase bg-[#ef4444] text-white font-bold px-3 py-1.5 border-2 border-navy-deep">Agotado Temporalmente</span>
                      </div>
                    )}
                    {prod.category === "combos" && (
                      <div className="absolute top-2 left-2 yellow-bg navy-text text-[9px] font-black uppercase px-2 py-0.5 border border-navy-deep shadow-[1px_1px_0px_0px_#1a2b4b]">
                        Combo Ahorro
                      </div>
                    )}
                    {prod.category === "hamburguesas" && (
                      <div className="absolute top-2 left-2 orange-bg text-white text-[9px] font-black uppercase px-2 py-0.5 border border-navy-deep shadow-[1px_1px_0px_0px_#1a2b4b]">
                        Lleva papas 🍟
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="pt-4 flex-1 flex flex-col justify-between gap-2.5 text-navy-deep">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-extrabold text-[#1a2b4b] text-base group-hover/card:text-orange-accent uppercase transition-colors leading-tight font-sans">{prod.name}</h4>
                        <span className="font-black text-orange-accent hover:text-[#f97316] font-mono text-lg shrink-0">${prod.price}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 md:line-clamp-3 leading-normal">{prod.description}</p>
                      
                      <span className="text-[10px] font-black uppercase text-orange-accent group-hover/card:underline mt-2 inline-flex items-center gap-1">
                        🔍 Ver ingredientes / detalles
                      </span>

                      {prod.ingredients && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {prod.ingredients.slice(0, 5).map((ing, i) => (
                            <span key={i} className="text-[10px] bg-slate-150 text-slate-600 border border-slate-250 px-2 py-0.5 font-bold uppercase">
                              {ing}
                            </span>
                          ))}
                          {prod.ingredients.length > 5 && (
                            <span className="text-[10px] text-slate-500 px-1">+{prod.ingredients.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Order Selector Buttons (Kept separate from clickable detail) */}
                <div className="pt-3 border-t-2 border-slate-100">
                  {inCartQty > 0 ? (
                    <div className="flex items-center justify-between bg-slate-50 rounded-none p-1 border-2 border-navy-deep">
                      <button
                        id={`btn-minus-${prod.id}`}
                        type="button"
                        onClick={() => updateCartItemQuantity(prod.id, -1)}
                        className="w-8 h-8 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-90 cursor-pointer border border-slate-350"
                      >
                        <Minus size={14} className="stroke-[3px]" />
                      </button>
                      <span className="font-black text-xs text-navy-deep font-mono px-3 uppercase tracking-tighter">
                        {inCartQty} agregados
                      </span>
                      <button
                        id={`btn-plus-${prod.id}`}
                        type="button"
                        onClick={() => updateCartItemQuantity(prod.id, 1)}
                        className="w-8 h-8 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-90 cursor-pointer border border-slate-350"
                      >
                        <Plus size={14} className="stroke-[3px]" />
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`btn-add-${prod.id}`}
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="w-full bg-slate-100 hover:bg-[#facc15] hover:text-navy-deep text-slate-700 font-extrabold text-xs py-2.5 rounded-none transition-all active:scale-95 border-2 border-slate-350 hover:border-navy-deep flex items-center justify-center gap-1.5 cursor-pointer uppercase shadow-[2px_2px_0px_0px_rgba(26,43,75,0.06)] hover:shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]"
                    >
                      <Plus size={14} className="stroke-[3px]" />
                      Agregar al Carrito
                    </button>
                  )}
                </div>

              </motion.div>
            );
          })}
        </div>
      </main>

      {/* 3. FLOAT FLOATING CART BUTTON */}
      <AnimatePresence>
        {getCartCount() > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40"
          >
            <button
              id="floating-cart-bar"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-orange-accent hover:opacity-[0.98] text-white font-black p-4 rounded-none flex items-center justify-between border-2 border-navy-deep shadow-[4px_4px_0px_0px_rgba(26,43,75,1)] active:scale-[0.98] transition-all cursor-pointer uppercase"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-none bg-yellow-accent text-navy-deep border border-navy-deep flex items-center justify-center font-mono text-xs font-black">
                  {getCartCount()}
                </span>
                <span className="text-xs uppercase tracking-wider font-extrabold">Ver Mi Canasta</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-black font-mono">
                Total: ${getCartTotal()} MXN
                <ChevronRight size={18} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CART SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div id="cart-drawer-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
            {/* Click outside to close */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsCartOpen(false)} />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              id="cart-drawer"
              className="bg-white border-l-4 border-yellow-accent w-full max-w-md h-full shadow-2xl relative z-10 flex flex-col justify-between"
            >
              {/* Drawer Header */}
               <div className="p-4 border-b-2 border-slate-150 flex items-center justify-between text-navy-deep">
                <div className="flex items-center gap-2">
                  <CartIcon size={20} className="text-orange-accent" />
                  <h3 className="text-md font-black uppercase text-navy-deep">Canasta de antojos</h3>
                  <span className="bg-navy-deep text-yellow-accent font-mono text-xs font-bold px-2 py-0.5 rounded-none border border-navy-deep">
                    {getCartCount()}
                  </span>
                </div>
                <button
                  id="btn-close-cart"
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-none text-slate-500 hover:text-navy-deep cursor-pointer animate-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Item List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
                    <ShoppingBag size={48} className="mb-2 stroke-[1px] text-slate-350" />
                    <p className="text-sm font-bold uppercase tracking-tight">Tu carrito está vacío</p>
                    <p className="text-xs text-slate-500 mt-1">¡Elige un combo o hamburguesa!</p>
                  </div>
                ) : (
                  cart.map(item => {
                    const subprice = item.product.price * item.quantity;
                    return (
                      <div 
                        key={item.product.id} 
                        id={`cart-item-${item.product.id}`}
                        className="bg-slate-50 p-3 border-2 border-slate-200 flex flex-col gap-2.5"
                      >
                        <div className="flex gap-3">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name} 
                            onClick={() => openProductDetail(item.product)}
                            className="w-14 h-14 rounded-none object-cover bg-slate-200 border border-slate-300 cursor-pointer hover:opacity-85"
                            referrerPolicy="no-referrer"
                            title="Toca para ver ingredientes y detalles"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 
                                onClick={() => openProductDetail(item.product)}
                                className="font-extrabold text-navy-deep text-sm truncate uppercase font-sans cursor-pointer hover:text-orange-accent hover:underline"
                                title="Toca para ver ingredientes y detalles"
                              >
                                {item.product.name}
                              </h4>
                              <button
                                id={`btn-remove-item-${item.product.id}`}
                                onClick={() => removeCartItem(item.product.id)}
                                className="text-slate-450 hover:text-red-500 p-1 rounded-none hover:bg-slate-200 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 mt-0.5">
                              <p className="text-xs font-mono font-bold text-orange-accent">${item.product.price} c/u</p>
                              <button
                                type="button"
                                id={`btn-view-ing-${item.product.id}`}
                                onClick={() => openProductDetail(item.product)}
                                className="text-[10px] font-extrabold text-orange-accent uppercase hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                🔍 Ver ingredientes
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quantity controls and Custom Kitchen Notes (Sin cebolla etc) */}
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 mt-1">
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-305">
                            <button
                              id={`cart-minus-${item.product.id}`}
                              onClick={() => updateCartItemQuantity(item.product.id, -1)}
                              className="text-[#1a2b4b] hover:opacity-80 p-1 rounded-none cursor-pointer"
                            >
                              <Minus size={12} className="stroke-[2.5px]" />
                            </button>
                            <span className="text-xs font-mono font-bold text-navy-deep min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              id={`cart-plus-${item.product.id}`}
                              onClick={() => updateCartItemQuantity(item.product.id, 1)}
                              className="text-[#1a2b4b] hover:opacity-80 p-1 rounded-none cursor-pointer"
                            >
                              <Plus size={12} className="stroke-[2.5px]" />
                            </button>
                          </div>
                          
                          <span className="font-mono font-black text-xs text-navy-deep">
                            Subt: ${subprice}
                          </span>
                        </div>

                        {/* Kitchen feedback instruction */}
                        <div className="mt-1">
                          <input
                            type="text"
                            placeholder="Ej. 'Sin cebolla', 'Doble aderezo'..."
                            value={item.notes}
                            id={`notes-input-${item.product.id}`}
                            onChange={(e) => updateCartItemNotes(item.product.id, e.target.value)}
                            className="w-full bg-white border border-slate-300 text-[11px] text-navy-deep py-1.5 px-2.5 placeholder-slate-400 focus:outline-none focus:border-navy-deep"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer Summary */}
              {cart.length > 0 && (
                <div className="p-4 bg-slate-50 border-t-2 border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-navy-deep text-xs font-black uppercase">Total del Pedido:</span>
                    <span className="font-mono font-black text-xl text-[#f97316]">${getCartTotal()} MXN</span>
                  </div>

                  <button
                    id="btn-trigger-checkout"
                    onClick={() => setShowCheckoutModal(true)}
                    className="w-full py-3.5 orange-bg text-white font-black text-xs uppercase tracking-wider border-2 border-[#1a2b4b] shadow-[3px_3px_0px_0px_rgba(26,43,75,1)] active:scale-[0.97] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95"
                  >
                    Finalizar Pedido
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. FORM ORDER VERIFICATION MODAL */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div id="checkout-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              id="checkout-modal"
              className="bg-white border-4 border-navy-deep w-full max-w-md rounded-none overflow-hidden shadow-[8px_8px_0px_0px_#1a2b4b] relative text-navy-deep"
            >
              {/* Header */}
              <div className="p-4 border-b-2 border-navy-deep flex items-center justify-between navy-bg text-white">
                <h3 className="text-md font-black flex items-center gap-1.5 uppercase font-sans tracking-tight">
                  <ShoppingBag size={18} className="text-yellow-accent" />
                  Datos de Entrega
                </h3>
                <button
                  id="checkout-modal-close"
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-none text-slate-300 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
                
                {/* 1. Client Name */}
                <div className="space-y-1">
                  <label id="lbl-client-name" className="text-xs text-navy-deep font-black block uppercase tracking-tight">Tu Nombre (Completo)</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={clientName}
                      id="input-client-name"
                      onChange={(e) => setClientName(e.target.value)}
                      className={`w-full bg-slate-50 border-2 text-sm rounded-none pl-10 pr-4 py-2.5 text-navy-deep placeholder-slate-405 focus:outline-none focus:border-navy-deep ${
                        formErrors.clientName ? "border-red-500" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {formErrors.clientName && (
                    <p className="text-red-500 text-[10px] font-bold uppercase">{formErrors.clientName}</p>
                  )}
                </div>

                {/* 2. Delivery Type Toggle Slider */}
                <div className="space-y-1">
                  <label id="lbl-delivery-type" className="text-xs text-navy-deep font-black block uppercase tracking-tight">¿Cómo deseas tu pedido?</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 border-2 border-slate-300">
                    <button
                      type="button"
                      id="toggle-delivery-pickup"
                      onClick={() => setDeliveryType("recoger")}
                      className={`py-2 rounded-none text-xs font-black transition-all cursor-pointer uppercase ${
                        deliveryType === "recoger"
                          ? "yellow-bg navy-text border-2 border-navy-deep shadow-[2px_2px_0px_0px_#1a2b4b]"
                          : "text-slate-500 hover:text-navy-deep"
                      }`}
                    >
                      🥡 Para Recoger
                    </button>
                    <button
                      type="button"
                      id="toggle-delivery-home"
                      onClick={() => setDeliveryType("domicilio")}
                      className={`py-2 rounded-none text-xs font-black transition-all cursor-pointer uppercase ${
                        deliveryType === "domicilio"
                          ? "orange-bg text-white border-2 border-navy-deep shadow-[2px_2px_0px_0px_#1a2b4b]"
                          : "text-slate-500 hover:text-[#1a2b4b]"
                      }`}
                    >
                      🛵 A Domicilio
                    </button>
                  </div>
                </div>

                {/* Conditional Fields block */}
                {deliveryType === "domicilio" ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    id="delivery-fields-box"
                    className="space-y-4 pt-2"
                  >
                    {/* Address input */}
                    <div className="space-y-1">
                      <label id="lbl-address" className="text-xs text-navy-deep font-black block uppercase tracking-tight">Dirección de Envío</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                        <textarea
                          placeholder="Calle, número, colonia, referencias (Ej. Fachada azul)"
                          value={address}
                          id="input-address"
                          onChange={(e) => setAddress(e.target.value)}
                          rows={2}
                          className={`w-full bg-slate-50 border-2 text-sm rounded-none pl-10 pr-4 py-2 text-navy-deep placeholder-slate-405 focus:outline-none focus:border-navy-deep ${
                            formErrors.address ? "border-red-500" : "border-slate-300"
                          }`}
                        />
                      </div>
                      {formErrors.address && (
                        <p className="text-red-500 text-[10px] font-bold uppercase">{formErrors.address}</p>
                      )}
                    </div>

                    {/* Phone input */}
                    <div className="space-y-1">
                      <label id="lbl-phone" className="text-xs text-navy-deep font-black block uppercase tracking-tight">WhatsApp de Contacto</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="Ej. 5512345678"
                          value={phone}
                          id="input-phone"
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full bg-slate-50 border-2 text-sm rounded-none pl-10 pr-4 py-2.5 text-navy-deep placeholder-slate-405 focus:outline-none focus:border-navy-deep ${
                            formErrors.phone ? "border-red-500" : "border-slate-300"
                          }`}
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="text-red-500 text-[10px] font-bold uppercase">{formErrors.phone}</p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-none border-2 border-slate-205 text-xs text-slate-650 leading-relaxed font-sans">
                    📍 Recogerás tu pedido directamente en nuestro local:
                    <div className="text-navy-deep font-extrabold mt-1 uppercase">LA GUSGUERA Local Centro.</div>
                    Te contactaremos en tu chat de confirmación cuando tu comida esté empacada y lista.
                  </div>
                )}

                {/* Submit Panel */}
                <div className="pt-4 border-t-2 border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[#1a2b4b] text-xs font-black uppercase">Total a Entregar:</span>
                    <span className="font-mono font-black text-lg text-[#f97316]">${getCartTotal()} MXN</span>
                  </div>

                  <button
                    type="submit"
                    id="btn-confirm-order"
                    disabled={isPlacingOrder}
                    className="w-full py-3.5 bg-yellow-accent border-2 border-navy-deep hover:bg-yellow-400 text-navy-deep font-black text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isPlacingOrder ? (
                      <span className="inline-block w-4 h-4 border-2 border-navy-deep border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Enviar Orden y Abrir WhatsApp
                        <CartIcon size={14} className="stroke-[2px]" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
