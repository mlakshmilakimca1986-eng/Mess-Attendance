import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { User, IdCard, Camera, CheckCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import PinModal from '../components/PinModal';
import LoadingTimer from '../components/LoadingTimer';

const Register = () => {
    const videoRef = useRef();
    const [name, setName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [captured, setCaptured] = useState(false);
    const [descriptor, setDescriptor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    // Generate or retrieve a unique device ID (Simulation of IMEI requirement)
    const [deviceId, setDeviceId] = useState(localStorage.getItem('mess_attendance_device_id') || '');
    const [showPinModal, setShowPinModal] = useState(false);
    const [pendingDeviceId, setPendingDeviceId] = useState('');

    useEffect(() => {
        if (!deviceId) {
            const newId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('mess_attendance_device_id', newId);
            setDeviceId(newId);
        }
    }, []);

    const handleEditDeviceId = () => {
        const newId = prompt('Enter Device Name (example: MOBILE-1):', deviceId);
        if (newId && newId.trim()) {
            const finalId = newId.trim().toUpperCase();

            // Security Check for Restricted IDs
            const RESTRICTED_PREFIXES = ['INCHARGE', 'MASTER', 'ADMIN', 'GOPI'];
            const isRestricted = RESTRICTED_PREFIXES.some(prefix => finalId.startsWith(prefix));

            if (isRestricted) {
                setPendingDeviceId(finalId);
                setShowPinModal(true);
                return;
            }

            localStorage.setItem('mess_attendance_device_id', finalId);
            setDeviceId(finalId);
            window.location.reload();
        }
    };

    const handlePinSuccess = () => {
        if (pendingDeviceId) {
            localStorage.setItem('mess_attendance_device_id', pendingDeviceId);
            setDeviceId(pendingDeviceId);
            window.location.reload();
        }
    };

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                console.log('Loading TinyFaceDetector...');
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

                console.log('Loading FaceLandmark68Net...');
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

                console.log('Loading FaceRecognitionNet...');
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

                console.log('All models loaded successfully');
                setModelsLoaded(true);
            } catch (err) {
                console.error('Detailed model loading error:', err);
                setMessage(`AI Error: ${err.message || 'Check connection'}`);
            }
        };
        loadModels();
    }, []);

    const startVideo = () => {
        setIsStreaming(false);
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user' } })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsStreaming(true);
                }
            })
            .catch((err) => {
                console.error(err);
                setMessage('Camera access denied. Please check permissions.');
            });
    };

    const captureFace = async () => {
        if (!videoRef.current) return;
        setLoading(true);
        try {
            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
                setDescriptor(Array.from(detections.descriptor));
                setCaptured(true);
                setMessage('Face captured successfully!');
            } else {
                setMessage('No face detected. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Error capturing face');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!descriptor || !name || !employeeId) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId,
                    name,
                    faceDescriptor: descriptor,
                    deviceId: deviceId
                })
            });

            if (response.ok) {
                setMessage('Employee registered with this mobile successfully!');
                setName('');
                setEmployeeId('');
                setCaptured(false);
                setDescriptor(null);
            } else {
                const data = await response.json();
                setMessage(data.error || 'Registration failed.');
            }
        } catch (err) {
            console.error(err);
            setMessage('Error connecting to server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center justify-center min-h-[80vh] p-4"
        >
            <LoadingTimer isLoading={loading || !modelsLoaded} />
            <div className="glass-card p-4 sm:p-8 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/5 -skew-x-12 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2 text-indigo-800">Register Employee</h2>
                    <p className="text-slate-700 font-semibold text-sm mb-1">Step 1: Details {'->'} Step 2: Capture {'->'} Step 3: Save</p>
                    <p className="text-[10px] text-indigo-700 font-bold uppercase mb-6 opacity-90">Tip: Use existing ID to update an employee</p>

                    <form onSubmit={handleRegister} className="space-y-5">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-2"
                        >
                            <label className="text-slate-700 text-sm flex items-center gap-2 font-bold">
                                <User size={16} /> Full Name
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                minLength={3}
                                required
                                autoFocus
                            />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-2"
                        >
                            <label className="text-slate-700 text-sm flex items-center gap-2 font-bold">
                                <IdCard size={16} /> Employee ID
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. EMP001"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                required
                            />
                        </motion.div>

                        <div className="flex flex-col gap-4">
                            {!captured && !isStreaming ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() => { setMessage(''); startVideo(); }}
                                    disabled={!modelsLoaded}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    <Camera size={20} /> Open Camera
                                </motion.button>
                            ) : !captured && isStreaming ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={captureFace}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <Camera size={20} /> Capture Face Photo
                                </motion.button>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg border border-green-500/20"
                                >
                                    <CheckCircle size={20} />
                                    <span>Face data captured</span>
                                    <button
                                        type="button"
                                        onClick={() => setCaptured(false)}
                                        className="ml-auto text-xs underline font-bold"
                                    >
                                        Retake
                                    </button>
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: (captured && name && employeeId) ? 1.02 : 1 }}
                                whileTap={{ scale: (captured && name && employeeId) ? 0.98 : 1 }}
                                type="submit"
                                disabled={loading || !captured || !name || !employeeId}
                                className={`btn-primary w-full shadow-xl transition-all ${(!captured || !name || !employeeId) ? 'opacity-30' : 'opacity-100'}`}
                                style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
                            >
                                {loading ? 'Saving to Database...' : 'Register Employee'}
                            </motion.button>
                            {!captured && (
                                <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest">
                                    Capture face photo to enable registration
                                </p>
                            )}
                        </div>

                        <AnimatePresence>
                            {message && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={`text-center pt-2 ${message.includes('success') ? 'text-green-400' : 'text-rose-400'}`}
                                >
                                    {message}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </form>
                </div>

                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200 border border-slate-200 shadow-inner group order-first md:order-last">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                    />

                    <AnimatePresence>
                        {!modelsLoaded && (
                            <motion.div
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-30"
                            >
                                <RefreshCcw className="animate-spin mr-2" />
                                <span>Loading AI...</span>
                            </motion.div>
                        )}

                        {captured && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md flex items-center justify-center z-40"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12 }}
                                >
                                    <CheckCircle size={80} className="text-white drop-shadow-lg" />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Decorative Frame */}
                    <div className="absolute inset-4 border-2 border-slate-200 pointer-events-none rounded-xl" />
                </div>
            </div>

            <button
                onClick={handleEditDeviceId}
                className="mt-6 text-[10px] text-indigo-700 font-mono tracking-widest uppercase bg-indigo-100 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-200 transition-all opacity-80 hover:opacity-100 font-bold"
            >
                Device ID: {deviceId} <span className="ml-1 underline">(Edit)</span>
            </button>
            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handlePinSuccess}
            />
        </motion.div >
    );
};

export default Register;
