import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';

const PinModal = ({ isOpen, onClose, onSuccess }) => {
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '']);
            setError('');
            // Focus first input after animation
            setTimeout(() => inputRefs[0].current?.focus(), 100);
        }
    }, [isOpen]);

    const handleChange = (index, value) => {
        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto move to next input if value is entered
        if (value !== '' && index < 3) {
            inputRefs[index + 1].current.focus();
        }

        // Check if complete
        const fullPin = newPin.join('');
        if (fullPin.length === 4 && !newPin.includes('')) {
            handleSubmit(fullPin);
        }
    };

    const handleKeyDown = (index, e) => {
        // Move to previous input on Backspace if current is empty
        if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
            inputRefs[index - 1].current.focus();
        }

        // Also allow moving back if you just deleted the value
        if (e.key === 'Backspace' && pin[index] !== '') {
            const newPin = [...pin];
            newPin[index] = '';
            setPin(newPin);
            // Stay on current or move back? Standard behavior varies, 
            // but staying is usually safer to avoid deleting multiple accidentally. 
            // If they hit backspace again (when empty), the first rule handles it.
        }
    };

    const handleSubmit = (enteredPin) => {
        // HARDCODED PIN: 1234
        if (enteredPin === '1234') {
            onSuccess();
            onClose();
        } else {
            setError('Incorrect PIN');
            setPin(['', '', '', '']);
            inputRefs[0].current.focus();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-slate-800 border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 flex flex-col items-center">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-400">
                                <Lock size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">Restricted Access</h3>
                            <p className="text-slate-400 text-sm text-center mb-6">
                                Enter the 4-digit security PIN to authorize this device change.
                            </p>

                            <div className="flex gap-3 mb-6">
                                {pin.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={inputRefs[index]}
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-12 h-14 bg-slate-900/50 border border-slate-600 rounded-lg text-center text-2xl font-bold text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-transparent"
                                        autoComplete="off" // Disable autocomplete
                                    />
                                ))}
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-rose-400 text-sm font-semibold mb-2"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PinModal;
