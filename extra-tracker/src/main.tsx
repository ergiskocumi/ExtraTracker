import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./features/auth/context/AuthContext.tsx";
import { ToastProvider } from "./shared/components/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScrollToTop } from "./shared/components/ScrollToTop";
// Silenzia tutti i log nel browser - i log devono essere gestiti solo dal backend
import "./shared/utils/logger";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * 🏗️ APPLICATION BOOTSTRAP
 * 
 * 🎓 ORDINE DEI PROVIDER (importante!):
 * 
 * 1. BrowserRouter - Deve essere il più esterno per permettere routing ovunque
 * 2. ToastProvider - Deve avvolgere AuthProvider così anche gli errori di auth
 *                    possono mostrare toast
 * 3. AuthProvider  - Gestisce lo stato di autenticazione
 * 
 * 🎓 PRINCIPIO: Provider Hierarchy
 * I provider esterni possono essere usati da quelli interni, ma non viceversa.
 * Quindi ToastProvider (esterno) non può usare AuthProvider (interno),
 * ma AuthProvider PUÒ usare i toast.
 */

// OTTIMIZZATO: Performance monitoring
const appStartTime = performance.now();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <QueryClientProvider client={queryClient}>
        <ToastProvider config={{ 
          position: 'top-right',
          maxToasts: 5,
          defaultDuration: 5000,
        }}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Performance monitoring rimosso - i log devono essere gestiti solo dal backend