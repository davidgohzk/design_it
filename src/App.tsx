import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { InfoSite } from "./components/InfoSite";
import DemoPage from "./pages/DemoPage";

function LandingPage() {
  const navigate = useNavigate();
  return <InfoSite onDemoClick={() => navigate("/demo")} />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </HashRouter>
  );
}
