import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Punch from './pages/Punch';
import Admin from './pages/Admin';
import Register from './pages/Register';
import { API_BASE_URL } from './config';
import './App.css';

function App() {
  // --- BACKGROUND WAKE-UP SERVICE ---
  // Pings the backend every 10 minutes to prevent Render free-tier sleep
  useEffect(() => {
    const wakeUp = async () => {
      try {
        console.log("Background ping sent to keep server awake...");
        await fetch(`${API_BASE_URL}/api/health`);
      } catch (e) {
        console.warn("Wake-up ping failed:", e.message);
      }
    };
    
    // Ping immediately on load
    wakeUp();

    // Set interval for every 10 minutes (600,000ms)
    const interval = setInterval(wakeUp, 10 * 60 * 1000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Punch />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
