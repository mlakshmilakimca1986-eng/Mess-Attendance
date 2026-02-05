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
    const [punchData, setPunchData] = useState(null);

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
                // Clearer error for the UI
                const errMsg = err.message || 'Unknown error';
                setMessage(`AI Error: ${errMsg.substring(0, 100)}...`);
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


    const handleAutoScan = async () => {
        setDetecting(true);
        try {
            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
                setMessage('Face found! Verifying...');
                const faceMatcher = new faceapi.FaceMatcher(
                    employees.map(emp => new faceapi.LabeledFaceDescriptors(emp.employee_id, [emp.descriptor])),
                    0.6 // Slightly looser for easier daily recognition
                );

                const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

                if (bestMatch.label !== 'unknown') {
                    setMessage('Identity confirmed. Punching...');

                    const matchedEmp = employees.find(e => e.employee_id === bestMatch.label);

                    // Call backend with Auto-Logic
                    const response = await fetch(`${API_BASE_URL}/api/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: matchedEmp.employee_id,
                            deviceId: getDeviceId()
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        setStatus('success');
                        setPunchData(result);
                        setMessage(`${result.message}. Have a nice day, ${matchedEmp.name}!`);
                        setLastPunchTime(Date.now());
                        setTimeout(() => {
                            setStatus(null);
                            setPunchData(null);
                        }, 8000);
                    } else {
                        setStatus('error');
                        setMessage(result.error || 'System error. Contact admin.');
                        setTimeout(() => setStatus(null), 3000);
                    }
                } else {
                    setMessage('Unknown face. Please use the registered face.');
                    setTimeout(() => setMessage('Hands-free scanning active'), 2000);
                }
            } else {
                setMessage('Hands-free scanning active');
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

                <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-black/20 mb-8 border border-white/10 group shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
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
                                <span className="text-3xl font-bold text-white uppercase tracking-widest">SUCCESS</span>

                                {punchData && (
                                    <div className="mt-4 bg-white/20 p-4 rounded-xl backdrop-blur-lg border border-white/30 text-white min-w-[250px]">
                                        <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-2">
                                            <span className="text-xs font-bold uppercase opacity-70">Punch In</span>
                                            <span className="font-mono font-bold text-emerald-300">
                                                {new Date(punchData.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold uppercase opacity-70">Punch Out</span>
                                            <span className="font-mono font-bold text-rose-300">
                                                {punchData.punchOut ? new Date(punchData.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'PENDING'}
                                            </span>
                                        </div>
                                    </div>
                                )}
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

                <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Live Biometric Tracking Enabled
                    </div>

                    <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase opacity-50 hover:opacity-100 transition-opacity">
                        Device ID: {getDeviceId()}
                    </div>
                </div>
            </div>
        </motion.div >
    );
};

export default Punch;
