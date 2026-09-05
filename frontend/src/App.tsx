import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Overview from './pages/Overview';
import Transactions from './pages/Transactions';
import TransactionDetail from './pages/TransactionDetail';
import Chargebacks from './pages/Chargebacks';
import EvidenceCenter from './pages/EvidenceCenter';
import ModelPerformance from './pages/ModelPerformance';
import Analytics from './pages/Analytics';
import AuditLog from './pages/AuditLog';
import RiskPrediction from './pages/RiskPrediction';
import SettingsPage from './pages/Settings';

import Header from './components/Header';

import AIRobotAssistant from './components/AIRobotAssistant';

// Protected Route Wrapper
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <AIRobotAssistant />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes Layout */}
          <Route 
            path="/" 
            element={
              <ProtectedLayout>
                <Overview />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <ProtectedLayout>
                <Transactions />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/transactions/:id" 
            element={
              <ProtectedLayout>
                <TransactionDetail />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/chargebacks" 
            element={
              <ProtectedLayout>
                <Chargebacks />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/chargebacks/:id" 
            element={
              <ProtectedLayout>
                <EvidenceCenter />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/predict" 
            element={
              <ProtectedLayout>
                <RiskPrediction />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/model-performance" 
            element={
              <ProtectedLayout>
                <ModelPerformance />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedLayout>
                <Analytics />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/audit-log" 
            element={
              <ProtectedLayout>
                <AuditLog />
              </ProtectedLayout>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedLayout>
                <SettingsPage />
              </ProtectedLayout>
            } 
          />

          {/* Catch-all Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
