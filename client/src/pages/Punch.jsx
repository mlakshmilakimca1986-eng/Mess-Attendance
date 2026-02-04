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
    const [message, setMessage] = useState('Position your face in the camera');

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

    const handlePunch = async (type) => {
        if (!videoRef.current || employees.length === 0) {
            if (employees.length === 0) setMessage('No employees registered yet.');
            return;
        }
        setDetecting(true);
        setMessage(`Scanning for ${type.toUpperCase()}...`);

        try {
            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (detections) {
                const faceMatcher = new faceapi.FaceMatcher(
                    employees.map(emp => new faceapi.LabeledFaceDescriptors(emp.employee_id, [emp.descriptor])),
                    0.55 // slightly stricter threshold
                );

                const bestMatch = faceMatcher.findBestMatch(detections.descriptor);

                if (bestMatch.label !== 'unknown') {
                    const matchedEmp = employees.find(e => e.employee_id === bestMatch.label);

                    const response = await fetch(`${API_BASE_URL}/api/attendance`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: matchedEmp.employee_id,
                            type: type
                        })
                    });

                    if (response.ok) {
                        setStatus('success');
                        setMessage(`Welcome, ${matchedEmp.name}!`);
                    } else {
                        setStatus('error');
                        setMessage('Database error. Contact admin.');
                    }
                } else {
                    setStatus('error');
                    setMessage('Face not recognized. Please register.');
                }

                setTimeout(() => {
                    setStatus(null);
                    setMessage('Position your face in the camera');
                }, 3000);

            } else {
                setStatus('error');
                setMessage('No face detected. Try again.');
                setTimeout(() => setStatus(null), 2000);
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage('Scanning failed.');
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

                <div className="mb-8 min-h-[2rem]">
                    <p className={`text-lg font-medium transition-colors ${status === 'error' ? 'text-rose-400' : status === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {message}
                    </p>
                </div>

                <div className="flex gap-4 justify-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePunch('in')}
                        disabled={!modelsLoaded || detecting}
                        className="btn-primary flex-1 max-w-[200px] flex items-center justify-center gap-2 group disabled:opacity-50"
                        style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
                    >
                        <span>Punch IN</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePunch('out')}
                        disabled={!modelsLoaded || detecting}
                        className="btn-primary flex-1 max-w-[200px] flex items-center justify-center gap-2 group disabled:opacity-50"
                        style={{ background: 'linear-gradient(90deg, #f43f5e, #e11d48)' }}
                    >
                        <span>Punch OUT</span>
                    </motion.button>
                </div>
            </div>
        </motion.div >
    );
};

export default Punch;
