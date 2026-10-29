import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

/**
 * Root Application Component
 *
 * Provides central authentication context and routing for all user portals:
 * - Student Portal
 * - Faculty Guide Portal
 * - Administrator Portal
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
