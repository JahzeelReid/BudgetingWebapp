import { useState, useEffect } from "react";

import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Old from "./old_front_page";
import Login from "./login";
import TellerSetup from "./tellersetup";
import SyncLoading from "./loadingPage";
import Dashboard from "./dashboard";

function App() {
  // const API_BASE_URL =
  //   process.env.NODE_ENV === "development"
  //     ? "http://127.0.0.1:5000" // Development
  //     : "https://placeholder.com"; // Production
  const API_BASE_URL = import.meta.env.DEV
    ? // ? "http://127.0.0.1:5000"
      "http://localhost:5000"
    : "https://placeholder.com";

  return (
    <>
      <Routes>
        <Route path="/" element={<Login url={API_BASE_URL} />} />
        <Route path="/setup" element={<TellerSetup url={API_BASE_URL} />} />
        <Route path="/loading" element={<SyncLoading url={API_BASE_URL} />} />
        <Route path="/dashboard" element={<Dashboard url={API_BASE_URL} />} />
      </Routes>
    </>
  );
}

export default App;
