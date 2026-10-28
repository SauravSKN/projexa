import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';

/**
 * Root Application Component
 *
 * Configured for Member 2 (Frontend B) with role-gated routing.
 * Note: Member 1 (Frontend A) will provide the outer AuthProvider / SessionProvider
 * once authentication is delivered.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
