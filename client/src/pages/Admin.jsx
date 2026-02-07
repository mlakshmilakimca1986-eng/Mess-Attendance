import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ArrowDownAz, Download, Lock, Mail, Key, LogOut, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';
import LoadingTimer from '../components/LoadingTimer';

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

    // Security PIN State
    // Security PIN State
    const [securityPin, setSecurityPin] = useState('');
    const [pinUpdateStatus, setPinUpdateStatus] = useState('');

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [filteredAttendance, setFilteredAttendance] = useState([]);

    useEffect(() => {
        let result = attendance;

        // Filter by Search Term
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(rec =>
                (rec.name && rec.name.toLowerCase().includes(lowerTerm)) ||
                (rec.employee_id && rec.employee_id.toLowerCase().includes(lowerTerm))
            );
        }

        // Filter by Date Range
        if (dateRange.start) {
            const startDate = new Date(dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            result = result.filter(rec => new Date(rec.date) >= startDate);
        }
        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999); // Include the whole day
            result = result.filter(rec => new Date(rec.date) <= endDate);
        }

        setFilteredAttendance(result);
    }, [attendance, searchTerm, dateRange]);

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
        if (filteredAttendance.length === 0) return;
        const headers = ['Name', 'Employee ID', 'Date', 'Punch In', 'Punch Out', 'Status'];
        const rows = filteredAttendance.map(rec => [
            rec.name,
            rec.employee_id,
            new Date(rec.date).toLocaleDateString('en-GB'),
            rec.punch_in ? new Date(rec.punch_in).toLocaleTimeString() : '-',
            rec.punch_out ? new Date(rec.punch_out).toLocaleTimeString() : '-',
            rec.punch_out ? 'Completed' : 'On Shift'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `attendance_report_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdatePin = async (e) => {
        e.preventDefault();
        if (securityPin.length !== 4) {
            setPinUpdateStatus('Error: PIN must be 4 digits');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/update-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPin: securityPin })
            });
            const data = await response.json();
            if (response.ok) {
                setPinUpdateStatus('Success: PIN updated! All devices will use this new PIN.');
                setSecurityPin('');
                setTimeout(() => setPinUpdateStatus(''), 5000);
            } else {
                setPinUpdateStatus('Error: ' + (data.error || 'Failed'));
            }
        } catch (err) {
            setPinUpdateStatus('Error: Server connection failed');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB');
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
                        <h2 className="text-3xl font-bold text-slate-900">Admin Portal</h2>
                        <p className="text-slate-500 text-sm mt-2">Please login to access records</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-slate-500 text-xs flex items-center gap-2 uppercase tracking-wider font-semibold">
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
                            <label className="text-slate-500 text-xs flex items-center gap-2 uppercase tracking-wider font-semibold">
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
            <LoadingTimer isLoading={loading || loginLoading} />
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">S</div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Admin</p>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[150px] md:max-w-none">Srinivas Naidu</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all font-bold text-sm"
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-indigo-500 bg-white/60">
                    <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-slate-600 text-sm font-bold">Total Employees</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.totalEmployees}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-emerald-500 bg-white/60">
                    <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600">
                        <CheckCircleIcon size={32} />
                    </div>
                    <div>
                        <p className="text-slate-600 text-sm font-bold">Present Today</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.presentToday}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-rose-500 bg-white/60">
                    <div className="bg-rose-100 p-4 rounded-xl text-rose-600">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-slate-600 text-sm font-bold">Average Work Hours</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.avgWorkHours}</h3>
                    </div>
                </div>
            </div>

            {/* Security Settings Section */}
            <div className="glass-card p-6 border-l-4 border-l-purple-500">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-purple-500/20 p-3 rounded-xl text-purple-400">
                        <Lock size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Security Settings</h3>
                        <p className="text-slate-500 text-xs">Update the master PIN used for device authorization</p>
                    </div>
                </div>

                <form onSubmit={handleUpdatePin} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                    <div className="w-full sm:max-w-xs">
                        <label className="text-xs uppercase font-bold text-slate-500 mb-1 block">New 4-Digit PIN</label>
                        <input
                            type="text"
                            maxLength={4}
                            pattern="\d{4}"
                            className="input-field py-2 text-center tracking-[0.5em] font-mono font-bold"
                            placeholder="••••"
                            value={securityPin}
                            onChange={(e) => {
                                if (/^\d*$/.test(e.target.value)) setSecurityPin(e.target.value);
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!securityPin || securityPin.length !== 4}
                        className="btn-primary whitespace-nowrap px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Update Global PIN
                    </button>

                    {pinUpdateStatus && (
                        <span className={`text-sm font-bold ${pinUpdateStatus.includes('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {pinUpdateStatus}
                        </span>
                    )}
                </form>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold">Recent Attendance</h2>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl transition-all shadow-lg text-sm font-bold text-white whitespace-nowrap"
                        >
                            <Download size={16} /> Export CSV Report
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        {/* Search Input */}
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Name or ID..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Date Filters */}
                        <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">From:</span>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">To:</span>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-200 text-slate-800 text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 font-bold border-b border-slate-300">Employee</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-300">Date</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-300">Punch In</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-300">Punch Out</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
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
                            ) : filteredAttendance.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No attendance records found matching filters
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendance.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-100 transition-colors border-b border-slate-200 last:border-0">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-indigo-800">{record.name}</div>
                                            <div className="text-xs text-slate-600 font-mono font-bold">{record.employee_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-800 text-sm font-bold">{formatDate(record.date)}</td>
                                        <td className="px-6 py-4 text-emerald-700 font-mono text-sm font-bold">{formatTime(record.punch_in)}</td>
                                        <td className="px-6 py-4 text-rose-700 font-mono text-sm font-bold">{formatTime(record.punch_out)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${record.punch_out ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
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
