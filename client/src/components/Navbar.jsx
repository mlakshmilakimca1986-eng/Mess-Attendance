import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, LayoutDashboard, UserPlus, LogOut } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="glass-card m-4 p-4 flex justify-between items-center bg-opacity-10 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Sri Chaitanya" className="h-12 w-auto object-contain" />
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-white leading-tight">
                        Sri Chaitanya Educational Institutions
                    </span>
                    <span className="text-xs font-semibold text-indigo-400 tracking-wider">
                        ECITY BRANCH • MESS ATTENDANCE
                    </span>
                </div>
            </div>

            <div className="flex gap-6">
                <Link to="/" className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                    <Camera size={18} /> <span>Punch</span>
                </Link>
                <Link to="/admin" className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                    <LayoutDashboard size={18} /> <span>Admin</span>
                </Link>
                <Link to="/register" className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                    <UserPlus size={18} /> <span>Add User</span>
                </Link>
            </div>
        </nav>
    );
};

export default Navbar;
