import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardApp } from "./DashboardApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
