import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, LayoutDashboard, UserPlus, LogOut } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="glass-card m-4 p-4 flex justify-between items-center bg-opacity-10 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-lg">
                    <Camera className="text-white" size={24} />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    MessAttend
                </span>
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
