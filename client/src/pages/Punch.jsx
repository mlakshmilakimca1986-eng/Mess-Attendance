import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const Punch = () => {
    const videoRef = useRef();
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [status, setStatus] = useState(null); // 'success', 'error', null
    const [message, setMessage] = useState('Hands-free scanning active');
    const [lastPunchTime, setLastPunchTime] = useState(0);

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
                console.error('Error loading models:', err);
                setMessage('Error loading AI models');
            }
        };
        loadModels();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 640, height: 480 } })
            .then((stream) => {
                videoRef.current.srcObject = stream;
            })
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        if (modelsLoaded) {
            startVideo();
        }
    }, [modelsLoaded]);

    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/employees`);
                const data = await response.json();
                const processed = data.map(emp => ({
                    ...emp,
                    descriptor: new Float32Array(JSON.parse(emp.face_descriptor))
                }));
                setEmployees(processed);
            } catch (err) {
                console.error('Error fetching employees:', err);
            }
        };
        fetchEmployees();
    }, []);

    // Continuous Auto-Detection Loop
    useEffect(() => {
        let interval;
        if (modelsLoaded && employees.length > 0 && !status) {
            interval = setInterval(async () => {
                if (detecting || Date.now() - lastPunchTime < 10000) return; // 10s cooldown

                if (videoRef.current && videoRef.current.readyState === 4) {
                    await handleAutoScan();
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [modelsLoaded, employees, detecting, status, lastPunchTime]);

    // Helper to get current location
    const getLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (err) => {
                        reject(err);
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                );
            }
        });
    };

    const handleAutoScan = async () => {
        setDetecting(true);
        try {
            // Get location first (Geofencing requirement)
            let location = null;
            try {
                location = await getLocation();
            } catch (locErr) {
                setStatus('error');
                setMessage('Please enable GPS/Location to punch attendance.');
                setDetecting(false);
                return;
            }

            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
                const faceMatcher = new faceapi.FaceMatcher(
                    employees.map(emp => new faceapi.LabeledFaceDescriptors(emp.employee_id, [emp.descriptor])),
                    0.55
                );

                const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

                if (bestMatch.label !== 'unknown') {
                    const matchedEmp = employees.find(e => e.employee_id === bestMatch.label);

                    // Call backend with Auto-Logic and Geolocation
                    const response = await fetch(`${API_BASE_URL}/api/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: matchedEmp.employee_id,
                            deviceId: getDeviceId(),
                            latitude: location.lat,
                            longitude: location.lng
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        setStatus('success');
                        setMessage(`${result.message}. Have a nice day, ${matchedEmp.name}!`);
                        setLastPunchTime(Date.now());
                        setTimeout(() => setStatus(null), 5000);
                    } else {
                        setStatus('error');
                        setMessage(result.error || 'System error. Contact admin.');
                        setTimeout(() => setStatus(null), 3000);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDetecting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[80vh] p-4"
        >
            <div className="glass-card p-6 w-full max-w-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

                <h2 className="text-3xl font-bold mb-6 text-indigo-400">Punch Attendance</h2>

                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/20 mb-8 border border-white/10 group shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Scanning Animation */}
                    {detecting && (
                        <motion.div
                            initial={{ top: '0%' }}
                            animate={{ top: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1 bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] z-10"
                        />
                    )}

                    <AnimatePresence>
                        {!modelsLoaded && (
                            <motion.div
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20"
                            >
                                <RefreshCcw className="animate-spin mr-2" />
                                <span>Initializing AI...</span>
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/20 backdrop-blur-md z-30"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 10 }}
                                >
                                    <CheckCircle size={100} className="text-emerald-400 mb-2" />
                                </motion.div>
                                <span className="text-3xl font-bold text-white">SUCCESS</span>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/20 backdrop-blur-md z-30"
                            >
                                <XCircle size={100} className="text-rose-400 mb-2" />
                                <span className="text-3xl font-bold text-white">FAILED</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mb-0 min-h-[4rem] flex items-center justify-center">
                    <p className={`text-xl font-semibold transition-all duration-300 ${status === 'error' ? 'text-rose-400 scale-110' : status === 'success' ? 'text-emerald-400 scale-110' : 'text-slate-400'}`}>
                        {message}
                    </p>
                </div>

                <div className="mt-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Live Biometric Tracking Enabled
                    </div>
                </div>
            </div>
        </motion.div >
    );
};

export default Punch;
