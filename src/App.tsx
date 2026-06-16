/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import ClientView from "./components/ClientView";
import KitchenView from "./components/KitchenView";
import AdminView from "./components/AdminView";
import PinModal from "./components/PinModal";
import { ChefHat, Settings, ArrowLeft, Home } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type AppViewState = "client" | "kitchen" | "admin";

export default function App() {
  const [view, setView] = useState<AppViewState>("client");
  
  // Security PIN validation states
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinTargetView, setPinTargetView] = useState<"kitchen" | "admin" | null>(null);
  
  // Custom Staff chooser intermediate panel
  const [showStaffSelector, setShowStaffSelector] = useState<boolean>(false);

  // 1. Sync React State with browser URL path OR hash for maximum iframe compatibility
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path === "/cocina" || hash === "#/cocina") {
        setView("kitchen");
      } else if (path === "/admin" || hash === "#/admin") {
        setView("admin");
      } else {
        setView("client");
      }
    };

    // Load initial route
    handleUrlRouting();

    // Listen to hash/history changes
    window.addEventListener("hashchange", handleUrlRouting);
    window.addEventListener("popstate", handleUrlRouting);
    return () => {
      window.removeEventListener("hashchange", handleUrlRouting);
      window.removeEventListener("popstate", handleUrlRouting);
    };
  }, []);

  // Update browser address state reactively
  const navigateTo = (nextView: AppViewState) => {
    setView(nextView);
    const hashValue = nextView === "client" ? "" : `#/${nextView === "kitchen" ? "cocina" : "admin"}`;
    window.location.hash = hashValue;
  };

  const handleStaffChoice = (target: "kitchen" | "admin") => {
    setPinTargetView(target);
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setShowStaffSelector(false);
    if (pinTargetView === "kitchen") {
      navigateTo("kitchen");
    } else if (pinTargetView === "admin") {
      navigateTo("admin");
    }
    setPinTargetView(null);
  };

  const handleBackToClient = () => {
    setShowStaffSelector(false);
    navigateTo("client");
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans">
      
      {/* Primary view orchestration switcher */}
      <AnimatePresence mode="wait">
        
        {/* VIEW A: CUSTOMER CATALOGUE VIEW */}
        {view === "client" && !showStaffSelector && (
          <motion.div
            key="client-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ClientView onGoToStaff={() => setShowStaffSelector(true)} />
          </motion.div>
        )}

        {/* VIEW B: STAFF ROUTE SELECTOR PANEL (INTERMEDIATE ACCORDION) */}
        {showStaffSelector && (
          <motion.div
            key="staff-selector"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 select-none relative"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Selector Header */}
            <div className="max-w-md w-full mx-auto text-center pt-12">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-500 mb-4 shadow-xl">
                <ChefHat size={28} className="animate-bounce" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">ACCESO INTERNO</h2>
              <p className="text-xs text-slate-400 mt-2">Bienvenido al control operativo de LA GUSGUERA</p>
            </div>

            {/* Core Action Choice Cards */}
            <div className="max-w-md w-full mx-auto space-y-4 my-8">
              
              {/* Option 1: Kitchen Monitor */}
              <button
                id="btn-choice-kitchen"
                onClick={() => handleStaffChoice("kitchen")}
                className="w-full text-left p-6 bg-slate-900 hover:bg-slate-900/85 hover:border-orange-500/30 rounded-2xl border border-slate-850 transition-all flex items-center justify-between group active:scale-[0.98] cursor-pointer"
              >
                <div className="space-y-1">
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                    OPERACIÓN PLANCHA
                  </span>
                  <h4 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Estación de Cocina</h4>
                  <p className="text-xs text-slate-500">Monitor de salida de comida, tiempos e historial del día.</p>
                </div>
                <ChefHat size={28} className="text-slate-600 group-hover:text-orange-400 transition-colors ml-4 shrink-0" />
              </button>

              {/* Option 2: General Admin Manager */}
              <button
                id="btn-choice-admin"
                onClick={() => handleStaffChoice("admin")}
                className="w-full text-left p-6 bg-slate-900 hover:bg-slate-900/85 hover:border-amber-500/30 rounded-2xl border border-slate-850 transition-all flex items-center justify-between group active:scale-[0.98] cursor-pointer"
              >
                <div className="space-y-1">
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                    GERENCIA Y COSTOS
                  </span>
                  <h4 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Panel de Administración</h4>
                  <p className="text-xs text-slate-500">Ajuste de carta, inventario básico, estadísticas y logística.</p>
                </div>
                <Settings size={28} className="text-slate-600 group-hover:text-amber-500 transition-colors ml-4 shrink-0 animate-spin-slow" />
              </button>

            </div>

            {/* Choice Card Footer */}
            <div className="max-w-md w-full mx-auto text-center pb-8">
              <button
                id="btn-return-customer"
                onClick={handleBackToClient}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft size={12} />
                Regresar al Catálogo
              </button>
            </div>

          </motion.div>
        )}

        {/* VIEW C: COOK MONITOR VIEW */}
        {view === "kitchen" && !showStaffSelector && (
          <motion.div
            key="kitchen-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <KitchenView onGoBack={handleBackToClient} />
          </motion.div>
        )}

        {/* VIEW D: GENERAL ADMINISTRATION VIEW */}
        {view === "admin" && !showStaffSelector && (
          <motion.div
            key="admin-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminView onGoBack={handleBackToClient} />
          </motion.div>
        )}

      </AnimatePresence>

      {/* Floating PIN security authenticators */}
      <AnimatePresence>
        {showPinModal && (
          <PinModal
            title={pinTargetView === "kitchen" ? "Acceso Estación Cocina" : "Acceso Panel Gerencia"}
            onClose={() => setShowPinModal(false)}
            onSuccess={handlePinSuccess}
            correctPin="2580"
          />
        )}
      </AnimatePresence>

    </div>
  );
}
