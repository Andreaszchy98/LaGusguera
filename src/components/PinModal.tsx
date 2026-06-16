/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, X, Delete } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PinModalProps {
  onClose: () => void;
  onSuccess: () => void;
  correctPin?: string;
  title: string;
}

export default function PinModal({ onClose, onSuccess, correctPin = "2580", title }: PinModalProps) {
  const [pin, setPin] = useState<string>("");
  const [errorCount, setErrorCount] = useState<number>(0);
  const [showError, setShowError] = useState<boolean>(false);

  const handleKeyPress = (value: string) => {
    if (pin.length < 4) {
      const nextPin = pin + value;
      setPin(nextPin);
      
      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          onSuccess();
        } else {
          // Trigger shake or error
          setShowError(true);
          setErrorCount(prev => prev + 1);
          setTimeout(() => {
            setPin("");
            setShowError(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  return (
    <div id="pin-modal-overlay" className="fixed inset-0 bg-navy-deep/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        id="pin-modal-container" 
        className="bg-white border-4 border-navy-deep rounded-none w-full max-w-sm overflow-hidden flex flex-col shadow-[8px_8px_0px_0px_rgba(26,43,75,1)] relative"
      >
        {/* Header */}
        <div className="p-6 pb-2 text-center relative border-b-2 border-slate-100">
          <button 
            id="pin-modal-close"
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-none text-slate-400 hover:text-navy-deep hover:bg-slate-50 border-2 border-transparent hover:border-navy-deep transition-all"
          >
            <X size={20} />
          </button>
          
          <div className="mx-auto w-12 h-12 rounded-none yellow-bg border-2 border-navy-deep flex items-center justify-center text-navy-deep mb-3 shadow-[2px_2px_0px_0px_rgba(26,43,75,1)]">
            <Lock size={22} className={showError ? "animate-bounce" : ""} />
          </div>
          
          <h3 className="text-xl font-black text-navy-deep tracking-tight uppercase font-sans">{title}</h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Ingresa el código numérico de seguridad</p>
        </div>

        {/* Display Dots */}
        <div className="py-6 px-4 flex flex-col items-center">
          <div 
            id="pin-dots-container"
            className={`flex justify-center gap-4 transition-transform duration-100 ${showError ? "animate-shake border-red-500" : ""}`}
          >
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index}
                className={`w-4 h-4 rounded-none border-2 transition-all duration-150 ${
                  index < pin.length 
                    ? "orange-bg border-navy-deep shadow-[1px_1px_0px_0px_rgba(26,43,75,1)] scale-110" 
                    : showError 
                    ? "border-red-500 bg-red-100"
                    : "border-slate-300 bg-transparent"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {showError && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-red-600 text-xs font-black mt-4 uppercase font-mono"
              >
                PIN incorrecto ({errorCount} {errorCount === 1 ? "intento" : "intentos"})
              </motion.p>
            )}
            {!showError && (
              <p className="text-slate-500 text-xs mt-4 select-none font-mono">Tip: PIN por defecto es 2580</p>
            )}
          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div id="pin-keypad" className="grid grid-cols-3 gap-4 p-6 pt-4 bg-slate-50 border-t-2 border-navy-deep">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              id={`pin-btn-${num}`}
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={showError}
              className="h-14 rounded-none bg-white hover:bg-slate-100 border-2 border-navy-deep flex items-center justify-center text-xl font-black text-navy-deep active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(26,43,75,1)] disabled:opacity-50 transition-all font-mono"
            >
              {num}
            </button>
          ))}
          
          {/* Action C */}
          <button
            id="pin-btn-clear"
            onClick={handleClear}
            disabled={showError || pin.length === 0}
            className="h-14 rounded-none bg-slate-100 hover:bg-slate-200 border-2 border-navy-deep flex items-center justify-center text-sm font-black text-navy-deep shadow-[2px_2px_0px_0px_rgba(26,43,75,0.7)] disabled:opacity-40 transition-all font-mono"
          >
            C
          </button>

          {/* Key 0 */}
          <button
            id="pin-btn-0"
            onClick={() => handleKeyPress("0")}
            disabled={showError}
            className="h-14 rounded-none bg-white hover:bg-slate-100 border-2 border-navy-deep flex items-center justify-center text-xl font-black text-navy-deep active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(26,43,75,1)] disabled:opacity-50 transition-all font-mono"
          >
            0
          </button>

          {/* Action Del */}
          <button
            id="pin-btn-del"
            onClick={handleDelete}
            disabled={showError || pin.length === 0}
            className="h-14 rounded-none bg-slate-100 hover:bg-slate-200 border-2 border-navy-deep flex items-center justify-center text-navy-deep shadow-[2px_2px_0px_0px_rgba(26,43,75,0.7)] disabled:opacity-40 transition-all font-mono"
          >
            <Delete size={20} className="stroke-[2.5px]" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
