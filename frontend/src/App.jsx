import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import DataDashboard from './components/DataDashboard';
import ControlDashboard from './components/ControlDashboard';
import Web3Process from './components/Web3Process';
import DroneFlightDashboard from './components/DroneFlightDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-title-link">
              <h1 className="nav-title">🌊 IoT Web3 Water Quality Monitor</h1>
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/dashboard" className="nav-link">IoT Dashboard</Link>
              <Link to="/drones" className="nav-link">Drone Flights</Link>
              <Link to="/web3" className="nav-link">Web3 Process</Link>
              <Link to="/control" className="nav-link">Control Panel</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DataDashboard />} />
            <Route path="/drones" element={<DroneFlightDashboard />} />
            <Route path="/web3" element={<Web3Process />} />
            <Route path="/control" element={<ControlDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

