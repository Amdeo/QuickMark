import React from "react";
import { createRoot } from "react-dom/client";
import { SettingsApp } from "./SettingsApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsApp />
  </React.StrictMode>
);
