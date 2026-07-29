import { Routes, Route, Navigate } from "react-router-dom";
import { CopilotProvider } from "./context/CopilotContext.jsx";
import { Layout } from "./components/layout/Layout.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { Leave } from "./pages/Leave.jsx";
import { Benefits } from "./pages/Benefits.jsx";
import { Payroll } from "./pages/Payroll.jsx";
import { Training } from "./pages/Training.jsx";
import { Directory } from "./pages/Directory.jsx";

export default function App() {
  return (
    <CopilotProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="leave" element={<Leave />} />
          <Route path="benefits" element={<Benefits />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="training" element={<Training />} />
          <Route path="directory" element={<Directory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </CopilotProvider>
  );
}
