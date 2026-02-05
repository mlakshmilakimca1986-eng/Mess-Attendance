import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { User, IdentificationCard, Camera, CheckCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const Register = () => {
    const videoRef = useRef();
    const [name, setName] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [captured, setCaptured] = useState(false);
    const [descriptor, setDescriptor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [message, setMessage] = useState('');

    // Generate or retrieve a unique device ID (Simulation of IMEI requirement)
    const getDeviceId = () => {
        let deviceId = localStorage.getItem('mess_attendance_device_id');
        if (!deviceId) {
            deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('mess_attendance_device_id', deviceId);
        }
        return deviceId;
    };

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error(err);
                setMessage('Error loading AI models');
            }
        };
        loadModels();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: {} })
            .then((stream) => {
                videoRef.current.srcObject = stream;
            })
            .catch((err) => console.error(err));
    };

    const captureFace = async () => {
        if (!videoRef.current) return;
        setLoading(true);
        try {
            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
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
        const deviceId = getDeviceId();

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
            <div className="glass-card p-8 w-full max-w-4xl grid md:grid-cols-2 gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/5 -skew-x-12 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-6 text-indigo-400">Register Employee</h2>
                    <form onSubmit={handleRegister} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-2"
                        >
                            <label className="text-slate-400 text-sm flex items-center gap-2">
                                <User size={16} /> Full Name
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-2"
                        >
                            <label className="text-slate-400 text-sm flex items-center gap-2">
                                <IdentificationCard size={16} /> Employee ID
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
                            {!captured ? (
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
                                        className="ml-auto text-xs underline"
                                    >
                                        Retake
                                    </button>
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: captured ? 1.02 : 1 }}
                                whileTap={{ scale: captured ? 0.98 : 1 }}
                                type="submit"
                                disabled={loading || !captured || !name || !employeeId}
                                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7)' }}
                            >
                                {loading ? 'Processing...' : 'Register Employee'}
                            </motion.button>
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

                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/20 border border-white/10 shadow-inner group">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                    />

                    <AnimatePresence>
                        {!captured && modelsLoaded && videoRef.current?.srcObject && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                onClick={captureFace}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-xl p-5 rounded-full transition-all border border-white/20 z-20 shadow-2xl"
                            >
                                <Camera size={28} className="text-white" />
                            </motion.button>
                        )}

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
                    <div className="absolute inset-4 border-2 border-white/5 pointer-events-none rounded-xl" />
                </div>
            </div>
        </motion.div >
    );
};

export default Register;
