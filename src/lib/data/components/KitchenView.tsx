/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  History, 
  Home, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  ChevronLeft,
  Smartphone,
  Check,
  RotateCcw,
  RefreshCw,
  TrendingUp,
  MapPin,
  ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order, OrderStatus } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";

interface KitchenViewProps {
  onGoBack: () => void;
}

export default function KitchenView({ onGoBack }: KitchenViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"monitor" | "historial">("monitor");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  const isInitialLoadRef = useRef<boolean>(true);
  const audioContextGrantedRef = useRef<boolean>(false);

  // 1. Play synthesized double tone for incoming orders
  const playNotificationTone = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      
      // Tone 1 (High bell)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Tone 2 (Higher bell)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.5);
      
      audioContextGrantedRef.current = true;
    } catch (e) {
      console.warn("Audio Context playback prevented by browser autoplay policy.");
    }
  };

  // 2. Request user interaction for web audio API
  const grantAudioAccess = () => {
    playNotificationTone();
  };

  // 3. Real-time synchronizer for active and completed orders
  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef, 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Order[] = [];
      let playTone = false;

      snapshot.docs.forEach(doc => {
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

      // Detect if we have new orders added since first connection
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoadRef.current) {
          const ordStatus = change.doc.data().status;
          if (ordStatus === "nuevo") {
            playTone = true;
          }
        }
      });

      if (playTone) {
        playNotificationTone();
      }

      setOrders(list);
      isInitialLoadRef.current = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "orders");
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  // Split Orders
  const incomingAndCookingOrders = orders.filter(o => o.status !== "completado");
  const completedOrders = orders.filter(o => o.status === "completado");

  // Mutate Order Status
  const handleUpdateStatus = async (orderId: string, current: OrderStatus) => {
    const nextStatusMap: { [key in OrderStatus]: OrderStatus } = {
      nuevo: "preparando",
      preparando: "listo",
      listo: "completado",
      completado: "completado"
    };

    const nextStatus = nextStatusMap[current];
    try {
      const docRef = doc(db, "orders", orderId);
      await updateDoc(docRef, {
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleResetToNuevo = async (orderId: string) => {
    try {
      const docRef = doc(db, "orders", orderId);
      await updateDoc(docRef, {
        status: "nuevo",
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="min-h-screen grid-pattern text-slate-800 flex flex-col justify-between select-none">
      
      {/* 1. KITCHEN MAIN HEADER */}
      <header className="navy-bg border-b-4 border-yellow-400 px-4 py-4 shrink-0 shadow-md relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 yellow-bg text-navy-deep border-2 border-navy-deep rounded-none shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
              <ChefHat size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2 font-sans">
                ESTACIÓN DE COCINA
                <span className="text-[10px] bg-amber-400 text-navy-deep px-2 py-0.5 rounded-none border border-navy-deep font-black uppercase tracking-wider">La Gusguera</span>
              </h2>
              <p className="text-xs text-slate-300 font-mono">Monitor en tiempo real y flujo de platos</p>
            </div>
          </div>

          {/* Navigation Action tabs & Audio Control */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            
            <button
              id="btn-sound-toggle"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                grantAudioAccess();
              }}
              className={`p-2.5 rounded-none border-2 flex items-center gap-2 transition-all cursor-pointer ${
                soundEnabled 
                  ? "bg-white border-navy-deep text-navy-deep shadow-[2px_2px_0px_0px_rgba(26,43,75,1)] hover:bg-slate-50" 
                  : "bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-500 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              }`}
              title={soundEnabled ? "Silenciar Notificaciones" : "Activar Sonido"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="text-xs font-black uppercase hidden md:inline">
                {soundEnabled ? "SND: ON" : "SND: OFF"}
              </span>
            </button>

            <div className="h-6 w-0.5 bg-yellow-400/50" />

            <div className="flex bg-white p-1 rounded-none border-2 border-navy-deep shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
              <button
                id="btn-tab-monitor"
                onClick={() => setActiveTab("monitor")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-black transition-all cursor-pointer uppercase ${
                  activeTab === "monitor" 
                    ? "orange-bg text-white border border-navy-deep" 
                    : "text-slate-500 hover:text-navy-deep"
                }`}
              >
                <ClipboardList size={14} />
                Plancha ({incomingAndCookingOrders.length})
              </button>
              <button
                id="btn-tab-history"
                onClick={() => setActiveTab("historial")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-black transition-all cursor-pointer uppercase ${
                  activeTab === "historial" 
                    ? "orange-bg text-white border border-navy-deep" 
                    : "text-slate-500 hover:text-navy-deep"
                }`}
              >
                <History size={14} />
                Historial ({completedOrders.length})
              </button>
            </div>

            <button
              id="btn-kitchen-home"
              onClick={onGoBack}
              className="flex items-center gap-1.5 text-xs font-black text-navy-deep hover:bg-slate-50 bg-white border-2 border-navy-deep px-4 py-2.5 rounded-none shadow-[2px_2px_0px_0px_rgba(26,43,75,1)] cursor-pointer uppercase"
            >
              <Home size={14} />
              Regresar
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN TICKETS BODY */}
      <main className="flex-1 overflow-y-auto w-full p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          
          {activeTab === "monitor" && (
            <motion.div 
              key="monitor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="kitchen-active-grid"
              className="space-y-6"
            >
              {incomingAndCookingOrders.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500 bg-white border-4 border-dashed border-slate-300 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,43,75,0.05)]">
                  <ChefHat size={48} className="mb-3 text-slate-400 animate-pulse" />
                  <h4 className="text-lg font-black uppercase text-navy-deep">Todo limpio en plancha</h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">No hay tickets activos en este momento. ¡Buen trabajo!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {incomingAndCookingOrders.map(order => (
                    <ActiveOrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      onResetNuevo={handleResetToNuevo}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "historial" && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="kitchen-history-box"
              className="space-y-4 font-sans"
            >
              <div className="flex justify-between items-center bg-white border-2 border-navy-deep p-3 rounded-none shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
                <h3 className="text-sm font-black text-navy-deep flex items-center gap-2 uppercase font-mono">
                  <History size={18} className="text-orange-500" />
                  PEDIDOS COMPLETADOS (HOY)
                </h3>
              </div>

              {completedOrders.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500 bg-white border-4 border-dashed border-slate-300 p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(26,43,75,0.05)]">
                  <History size={48} className="mb-3 text-slate-400" />
                  <h4 className="text-lg font-black uppercase text-navy-deep">Sin historial registrado</h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-semibold">Los pedidos completados aparecerán aquí para control de arqueo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedOrders.map((ord) => (
                    <div 
                      key={ord.id}
                      className="bg-white border-2 border-slate-300 rounded-none p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-navy-deep transition-all shadow-[2px_2px_0px_0px_rgba(26,43,75,0.04)]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="yellow-bg border-2 border-navy-deep text-navy-deep font-mono font-black text-lg py-2 px-4 shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
                          #{ord.folio}
                        </div>
                        <div>
                          <h4 className="font-black text-navy-deep text-sm uppercase">{ord.clientName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 font-sans">
                            {ord.deliveryType === "domicilio" ? "🛵 Envío Domicilio" : "🥡 Recogido en Local"} • {ord.items.length} productos
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Completado: {ord.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Items summary */}
                      <div className="flex-1 max-w-md text-xs text-slate-600 bg-slate-50 p-2.5 border border-slate-200">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="font-sans leading-normal">
                            • <span className="font-extrabold">{it.quantity}x</span> {it.name} {it.notes && <span className="bg-orange-100 text-[#ea580c] px-1 font-bold">({it.notes})</span>}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        <span className="font-mono font-black text-sm text-[#f97316]">${ord.total} MXN</span>
                        <button
                          id={`btn-reopen-${ord.id}`}
                          onClick={() => handleResetToNuevo(ord.id!)}
                          className="p-2 text-xs font-black text-slate-600 hover:text-orange-accent hover:bg-slate-50 border-2 border-slate-300 rounded-none flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider font-mono shadow-[1px_1px_0px_0px_rgba(26,43,75,1)]"
                          title="Reabrir pedido a plancha"
                        >
                          <RotateCcw size={12} className="stroke-[2.5px]" />
                          Reabrir
                        </button>
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

/* SUBCOMPONENT: ACTIVE ORDER TICKET CARD WITH TIME TICKS */
interface ActiveOrderCardProps {
  key?: any;
  order: Order;
  onUpdateStatus: (id: string, current: OrderStatus) => any;
  onResetNuevo: (id: string) => any;
}

function ActiveOrderCard({ order, onUpdateStatus, onResetNuevo }: ActiveOrderCardProps) {
  const [elapsed, setElapsed] = useState<string>("0m 0s");
  const [isAlert, setIsAlert] = useState<boolean>(false);

  // Tick timer every second to compute elapsed minutes and seconds since order layout
  useEffect(() => {
    const start = order.createdAt instanceof Date ? order.createdAt.getTime() : Date.now();
    
    const updateTimer = () => {
      const now = Date.now();
      const diffMs = now - start;
      const totalSecs = Math.floor(diffMs / 1000);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      
      setElapsed(`${m}m ${s}s`);
      
      // If order exceeds 15 minutes, light flash alert to hustle kitchen
      setIsAlert(m >= 15);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const statusBadgeMap: { [key in OrderStatus]: { text: string; css: string } } = {
    nuevo: { text: "NUEVO", css: "bg-red-500 text-white border-2 border-navy-deep font-black" },
    preparando: { text: "PLANCHA", css: "bg-[#ea580c] text-white border-2 border-navy-deep font-black" },
    listo: { text: "LISTO", css: "bg-[#22c55e] text-white border-2 border-navy-deep font-black" },
    completado: { text: "COMPLETADO", css: "bg-slate-300 text-navy-deep border-2 border-slate-400 font-extrabold" },
  };

  const statusButtonLabel: { [key in OrderStatus]: string } = {
    nuevo: "🍳 Empezar Plancha",
    preparando: "📦 Empacar / Listo",
    listo: "✅ Cerrar Pedido",
    completado: "Completado"
  };

  const cardContainerStyle = () => {
    const base = "bg-white border-2 border-navy-deep rounded-none overflow-hidden flex flex-col justify-between h-full transition-all duration-300";
    if (isAlert && order.status !== "listo") {
      return `${base} border-red-600 border-4 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] bg-red-50/30`;
    }
    if (order.status === "nuevo") {
      return `${base} shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]`;
    }
    if (order.status === "preparando") {
      return `${base} shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]`;
    }
    if (order.status === "listo") {
      return `${base} shadow-[4px_4px_0px_0px_rgba(34,197,94,1)]`;
    }
    return `${base} shadow-[4px_4px_0px_0px_rgba(26,43,75,1)]`;
  };

  return (
    <div 
      id={`kitchen-card-${order.id}`}
      className={cardContainerStyle()}
    >
      {/* Card Header & Timer */}
      <div className="p-4 bg-slate-50 border-b-2 border-navy-deep flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="yellow-bg border-2 border-navy-deep text-navy-deep font-mono font-black text-xl py-1 px-3.5 shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
            #{order.folio}
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase px-2 py-1 tracking-wider ${statusBadgeMap[order.status].css}`}>
              {statusBadgeMap[order.status].text}
            </span>
          </div>
        </div>

        {/* Real-time Dynamic Clock */}
        <div className={`flex items-center gap-1.5 font-mono text-xs font-black py-1 px-2.5 rounded-none border-2 ${
          isAlert && order.status !== "listo"
            ? "text-red-600 bg-red-100 border-red-600 animate-pulse" 
            : "text-navy-deep bg-white border-navy-deep"
        }`}>
          <Clock size={12} className={isAlert && order.status !== "listo" ? "text-red-600" : "text-navy-deep"} />
          <span>{elapsed}</span>
        </div>
      </div>

      {/* Ticket Body Content */}
      <div className="p-4 flex-1 space-y-4">
        
        {/* Customer logistics */}
        <div className="border-b-2 border-dashed border-slate-200 pb-3">
          <h4 className="font-black text-navy-deep text-base uppercase leading-tight">{order.clientName}</h4>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500 font-mono">
            <span className="font-bold">
              {order.deliveryType === "domicilio" ? "📦 ENVIAR" : "🛍️ LLEVAR"}
            </span>
            {order.phone && (
              <span className="font-extrabold text-navy-deep">
                ☎️ {order.phone}
              </span>
            )}
          </div>

          {order.address && (
            <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-none border border-slate-300 flex gap-1.5 items-start font-sans">
              <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed font-medium">{order.address}</span>
            </div>
          )}
        </div>

        {/* List of ordered items */}
        <div className="space-y-3">
          <span className="text-[10px] tracking-wider uppercase font-black text-slate-400 block font-mono">DESGLOSE DEL PEDIDO:</span>
          
          <div className="space-y-2.5">
            {order.items.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-slate-55 shadow-[1px_1px_0px_0px_rgba(26,43,75,0.06)] border border-slate-200 rounded-none p-2.5 flex items-start gap-2.5 hover:bg-slate-50"
              >
                <div className="w-6 h-6 rounded-none yellow-bg border border-navy-deep text-navy-deep font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {item.quantity}
                </div>
                
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-navy-deep text-sm">{item.name}</span>
                  {item.notes && (
                    <div className="text-xs bg-red-50 text-red-700 font-black border-2 border-red-200 py-1 px-2.5 rounded-none mt-1.5 block leading-tight">
                      ⚠️ NOTA: "{item.notes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Price display inside ticket */}
        <div className="pt-3 border-t-2 border-dashed border-slate-200 flex justify-between items-center text-xs text-slate-500 font-mono">
          <span>TOTAL DEL PEDIDO:</span>
          <span className="font-mono font-black text-base text-navy-deep">${order.total} MXN</span>
        </div>

      </div>

      {/* Ticket Foot Action triggers */}
      <div className="p-4 bg-slate-50 border-t-2 border-navy-deep flex gap-2">
        {order.status !== "nuevo" && (
          <button
            id={`btn-ticket-back-${order.id}`}
            onClick={() => onResetNuevo(order.id!)}
            className="p-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-navy-deep rounded-none border-2 border-navy-deep transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]"
            title="Reabrir a nuevo"
          >
            <RotateCcw size={14} className="stroke-[2.5px]" />
          </button>
        )}
        
        <button
          id={`btn-ticket-next-${order.id}`}
          onClick={() => onUpdateStatus(order.id!, order.status)}
          className={`flex-1 text-center font-black text-xs py-3 rounded-none transition-all border-2 border-navy-deep shadow-[2px_2px_0px_0px_rgba(26,43,75,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(26,43,75,1)] flex items-center justify-center gap-1.5 cursor-pointer uppercase font-mono ${
            order.status === "nuevo"
              ? "bg-red-500 text-white hover:bg-red-400"
              : order.status === "preparando"
              ? "orange-bg text-white hover:opacity-90"
              : "bg-emerald-500 text-white hover:bg-emerald-400"
          }`}
        >
          {statusButtonLabel[order.status]}
          <ChevronRight size={14} className="stroke-[2.5px]" />
        </button>
      </div>

    </div>
  );
}
