import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DataDashboard from './components/DataDashboard';
import ControlDashboard from './components/ControlDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">🌊 IoT Web3 Water Quality Monitor</h1>
            <div className="nav-links">
              <Link to="/" className="nav-link">Data Dashboard</Link>
              <Link to="/control" className="nav-link">Control Panel</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<DataDashboard />} />
            <Route path="/control" element={<ControlDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

