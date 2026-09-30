import { HashRouter, Routes, Route } from "react-router-dom";
import DemoPage from "./pages/demo/DemoPage";
import LandingPage from "./pages/landing/LandingPage";
import SimplePage from "./pages/simple/SimplePage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/simple" element={<SimplePage />} />
      </Routes>
    </HashRouter>
  );
}
