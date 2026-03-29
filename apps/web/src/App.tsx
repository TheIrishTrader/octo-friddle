import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import ListPage from "@/pages/ListPage";
import ScanPage from "@/pages/ScanPage";
import PricesPage from "@/pages/PricesPage";
import BudgetPage from "@/pages/BudgetPage";
import SettingsPage from "@/pages/SettingsPage";
import RoutePage from "@/pages/RoutePage";

function App() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/prices" element={<PricesPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="tab-bar">
        <NavLink to="/" end className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" className="tab-icon"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10v2h14V7H7z"/></svg>
          <span>List</span>
        </NavLink>
        <NavLink to="/scan" className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" className="tab-icon"><path d="M4 6h2V4H4c-1.1 0-2 .9-2 2v2h2V6zm2 12H4v-2H2v2c0 1.1.9 2 2 2h2v-2zm12-12h2v2h2V6c0-1.1-.9-2-2-2h-2v2zm2 12h-2v2h2c1.1 0 2-.9 2-2v-2h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z"/></svg>
          <span>Scan</span>
        </NavLink>
        <NavLink to="/prices" className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" className="tab-icon"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          <span>Prices</span>
        </NavLink>
        <NavLink to="/budget" className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" className="tab-icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
          <span>Budget</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `tab-item ${isActive ? "active" : ""}`}>
          <svg viewBox="0 0 24 24" className="tab-icon"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/></svg>
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default App;
