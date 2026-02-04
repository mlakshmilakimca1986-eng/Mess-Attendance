import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, ArrowDownAz, Download } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Admin = () => {
    const [attendance, setAttendance] = useState([]);
    const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, avgWorkHours: '0h 0m' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchAttendance();
    }, []);

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

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-4 rounded-xl text-indigo-400">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Total Employees</p>
                        <h3 className="text-2xl font-bold">{stats.totalEmployees}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
                    <div className="bg-emerald-500/20 p-4 rounded-xl text-emerald-400">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Present Today</p>
                        <h3 className="text-2xl font-bold">{stats.presentToday}</h3>
                    </div>
                </div>
                <div className="glass-card p-6 flex items-center gap-4">
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
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Recent Attendance</h2>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors border border-white/10 text-sm"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-slate-400 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Punch In</th>
                                <th className="px-6 py-4 font-semibold">Punch Out</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        Loading records...
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
                                            <div className="font-medium text-indigo-300">{record.name}</div>
                                            <div className="text-xs text-slate-500">{record.employee_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{formatDate(record.date)}</td>
                                        <td className="px-6 py-4 text-emerald-400 font-mono text-sm">{formatTime(record.punch_in)}</td>
                                        <td className="px-6 py-4 text-rose-400 font-mono text-sm">{formatTime(record.punch_out)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.punch_out ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
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

// Mock CheckCircle since it might not be imported from lucide-react if I missed it
const CheckCircle = ({ size, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

export default Admin;
