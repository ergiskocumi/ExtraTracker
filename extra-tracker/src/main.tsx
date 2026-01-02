import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./features/auth/context/AuthContext.tsx";
import { ToastProvider } from "./shared/components/toast";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider config={{ 
        position: 'top-right',
        maxToasts: 5,
        defaultDuration: 5000,
      }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);