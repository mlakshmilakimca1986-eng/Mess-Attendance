import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, LayoutDashboard, UserPlus, LogOut } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="glass-card m-2 p-3 sm:m-4 sm:p-4 flex flex-col sm:flex-row justify-between items-center bg-opacity-10 backdrop-blur-md gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <img src="/logo.png" alt="Sri Chaitanya" className="h-10 sm:h-12 w-auto object-contain" />
                <div className="flex flex-col">
                    <span className="text-sm sm:text-lg font-bold text-slate-900 leading-tight">
                        Sri Chaitanya Educational Institutions
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold text-indigo-600 tracking-wider">
                        ECITY BRANCH • MESS ATTENDANCE
                    </span>
                </div>
            </div>

            <div className="flex gap-4 sm:gap-6 justify-center w-full sm:w-auto border-t border-slate-200 pt-2 sm:border-0 sm:pt-0">
                <Link to="/" className="flex items-center gap-2 text-sm sm:text-base hover:text-indigo-600 transition-colors">
                    <Camera size={18} /> <span>Punch</span>
                </Link>
                <Link to="/admin" className="flex items-center gap-2 text-sm sm:text-base hover:text-indigo-600 transition-colors">
                    <LayoutDashboard size={18} /> <span>Admin</span>
                </Link>
                <Link to="/register" className="flex items-center gap-2 text-sm sm:text-base hover:text-indigo-600 transition-colors">
                    <UserPlus size={18} /> <span>Add User</span>
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
