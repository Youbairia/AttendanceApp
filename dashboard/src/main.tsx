import React from 'react';
import { createRoot } from 'react-dom/client';
import { NavLink, Navigate, Route, Routes, BrowserRouter } from 'react-router-dom';
import { BarChart3, CalendarCheck, ClipboardList, FileText, UserPlus, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import MarkAttendance from './pages/MarkAttendance';
import TodaysAttendance from './pages/TodaysAttendance';
import Reports from './pages/Reports';
import './styles.css';

function App() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <BrowserRouter>
      <div className="shell">
        <aside className="sidebar">
          <div className="brandBlock">
            <div className="brandMark">📊</div>
            <div>
              <h1>Attendance</h1>
              <span>Face Recognition System</span>
            </div>
          </div>
          <nav>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'navLink active' : 'navLink'}>
              <BarChart3 size={20} /> 
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => isActive ? 'navLink active' : 'navLink'}>
              <UserPlus size={20} /> 
              <span>Register</span>
            </NavLink>
            <NavLink to="/mark-attendance" className={({ isActive }) => isActive ? 'navLink active' : 'navLink'}>
              <CalendarCheck size={20} /> 
              <span>Mark Attendance</span>
            </NavLink>
            <NavLink to="/today" className={({ isActive }) => isActive ? 'navLink active' : 'navLink'}>
              <ClipboardList size={20} /> 
              <span>Today&apos;s List</span>
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'navLink active' : 'navLink'}>
              <FileText size={20} /> 
              <span>Reports</span>
            </NavLink>
          </nav>
          <div className="sidebarFooter">
            <button className="logoutBtn"><LogOut size={18} /> Logout</button>
            <p>Attendance App<br />v1.0</p>
          </div>
        </aside>
        <div className="appFrame">
          <header className="topbar">
            <div className="topbarContent">
              <div className="topbarBrand">
                <div>
                  <h2>Attendance System</h2>
                  <p>{today}</p>
                </div>
              </div>
              <div className="topbarMeta">
                <div className="avatar">👤</div>
              </div>
            </div>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/register" element={<Register />} />
              <Route path="/live" element={<Navigate to="/mark-attendance" replace />} />
              <Route path="/mark-attendance" element={<MarkAttendance />} />
              <Route path="/today" element={<TodaysAttendance />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
