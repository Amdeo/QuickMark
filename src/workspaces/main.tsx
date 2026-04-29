import React from "react";
import { createRoot } from "react-dom/client";
import { WorkspacesApp } from "./WorkspacesApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WorkspacesApp />
  </React.StrictMode>
);
