import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./shared/theme/ThemeProvider";
import { ToastProvider } from "./components/toast/useToast";
import { Toaster } from "./components/ui/sonner";
import "./styles/globals.css";
import "./styles/prototype.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <Toaster position="top-left" richColors closeButton />
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
