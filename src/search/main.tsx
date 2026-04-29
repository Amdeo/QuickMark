import React from "react";
import { createRoot } from "react-dom/client";
import { SearchApp } from "./SearchApp";
import "../styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SearchApp />
  </React.StrictMode>
);
