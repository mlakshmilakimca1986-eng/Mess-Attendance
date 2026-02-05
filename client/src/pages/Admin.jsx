import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ArrowDownAz, Download, Lock, Mail, Key, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const Admin = () => {
    const [attendance, setAttendance] = useState([]);
    const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, avgWorkHours: '0h 0m' });
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Login Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken === 'authorized') {
            setIsLoggedIn(true);
            fetchAttendance();
        }
    }, []);

    const fetchAttendance = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/analytics`);
            const result = await response.json();
            setAttendance(result.attendance || []);
            setStats(result.stats || { totalEmployees: 0, presentToday: 0, avgWorkHours: '0h 0m' });
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('adminToken', 'authorized');
                setIsLoggedIn(true);
                fetchAttendance();
            } else {
                setLoginError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            setLoginError('Server error. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setIsLoggedIn(false);
        setAttendance([]);
    };

    const exportToCSV = () => {
        if (attendance.length === 0) return;
        const headers = ['Name', 'Employee ID', 'Date', 'Punch In', 'Punch Out', 'Status'];
        const rows = attendance.map(rec => [
            rec.name,
            rec.employee_id,
            new Date(rec.date).toLocaleDateString(),
            rec.punch_in ? new Date(rec.punch_in).toLocaleTimeString() : '-',
            rec.punch_out ? new Date(rec.punch_out).toLocaleTimeString() : '-',
            rec.punch_out ? 'Completed' : 'On Shift'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatTime = (timeString) => {
        if (!timeString) return '-';
        return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 w-full max-w-md relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-indigo-600/20 p-4 rounded-2xl text-indigo-400 mb-4">
                            <Lock size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-white">Admin Portal</h2>
                        <p className="text-slate-400 text-sm mt-2">Please login to access records</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-slate-400 text-xs flex items-center gap-2 uppercase tracking-wider font-semibold">
                                <Mail size={14} /> Email Address
                            </label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-slate-400 text-xs flex items-center gap-2 uppercase tracking-wider font-semibold">
                                <Key size={14} /> Password
                            </label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {loginError && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-rose-400 text-sm text-center"
                            >
                                {loginError}
                            </motion.p>
                        )}

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loginLoading ? 'Authenticating...' : 'Login to Dashboard'}
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade">
            <div className="flex justify-between items-center bg-indigo-500/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">S</div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Admin</p>
                        <p className="text-sm font-semibold text-slate-300 truncate max-w-[150px] md:max-w-none">Srinivas Naidu</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all font-semibold text-sm"
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-indigo-500">
                    <div className="bg-indigo-500/20 p-4 rounded-xl text-indigo-400">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Total Employees</p>
                        <h3 className="text-2xl font-bold">{stats.totalEmployees}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="bg-emerald-500/20 p-4 rounded-xl text-emerald-400">
                        <CheckCircleIcon size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Present Today</p>
                        <h3 className="text-2xl font-bold">{stats.presentToday}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-rose-500">
                    <div className="bg-rose-500/20 p-4 rounded-xl text-rose-400">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Average Work Hours</p>
                        <h3 className="text-2xl font-bold">{stats.avgWorkHours}</h3>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold">Recent Attendance</h2>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl transition-all shadow-lg text-sm font-bold"
                    >
                        <Download size={16} /> Export CSV Report
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 font-bold">Employee</th>
                                <th className="px-6 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold">Punch In</th>
                                <th className="px-6 py-4 font-bold">Punch Out</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.3s]" />
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-.5s]" />
                                        </div>
                                    </td>
                                </tr>
                            ) : attendance.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No attendance records found
                                    </td>
                                </tr>
                            ) : (
                                attendance.map((record) => (
                                    <tr key={record.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-indigo-300">{record.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{record.employee_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 text-sm font-semibold">{formatDate(record.date)}</td>
                                        <td className="px-6 py-4 text-emerald-400 font-mono text-xs font-bold">{formatTime(record.punch_in)}</td>
                                        <td className="px-6 py-4 text-rose-400 font-mono text-xs font-bold">{formatTime(record.punch_out)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${record.punch_out ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'}`}>
                                                {record.punch_out ? 'Completed' : 'On Shift'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const CheckCircleIcon = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

export default Admin;
