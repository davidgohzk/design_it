import { HashRouter, Navigate, Routes, Route } from "react-router-dom";
import DemoPage from "./pages/demo/DemoPage";
import LandingPage from "./pages/landing/LandingPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
