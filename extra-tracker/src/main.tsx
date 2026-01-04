import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./features/auth/context/AuthContext.tsx";
import { ToastProvider } from "./shared/components/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

// Log performance metrics
window.addEventListener('load', () => {
  const loadTime = performance.now() - appStartTime;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d9d761ee-7675-435b-8f4d-f17fedf53ed6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:load',message:'App load time',data:{loadTime:Math.round(loadTime),navigationTiming:performance.timing ? {domContentLoaded:performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,loadComplete:performance.timing.loadEventEnd - performance.timing.navigationStart} : null},timestamp:Date.now(),sessionId:'perf-session',runId:'run1',hypothesisId:'PERF'})}).catch(()=>{});
  // #endregion
});