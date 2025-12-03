import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom"; //! Importa BrowserRouter appena installato per non essere piu' limitati a una singola pagina
import "./index.css";
import { ProjectsProvider } from "./context/ProjectsContext.tsx";
import { WorkLogProvider } from "./context/WorkLogContenxt.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProjectsProvider> 
        <WorkLogProvider>
          <App />
        </WorkLogProvider>
      </ProjectsProvider>
    </BrowserRouter>
  </React.StrictMode>
);