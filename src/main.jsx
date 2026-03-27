import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/toast/useToast";
import ToastContainer from "./components/toast/ToastContainer";
import "./styles/globals.css";
import "./styles/shared.css";
import "./styles/toast.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <ToastContainer />
      <App />
    </ToastProvider>
  </React.StrictMode>
);
