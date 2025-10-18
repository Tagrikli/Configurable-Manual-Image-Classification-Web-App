import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { ImageClassification } from './pages/ImageClassification';
import { UsernameSetup } from './pages/UsernameSetup';
import { Statistics } from './pages/Statistics';
import { Help } from './pages/Help';
import { Celebration } from './pages/Celebration';
import './App.css';

const AppLayout = () => {
  const location = useLocation();
  const isCelebrationRoute = location.pathname === '/complete';

  const mainClasses = isCelebrationRoute
    ? 'flex-1 p-0 sm:p-0 pb-0 mb-0 overflow-hidden'
    : 'flex-1 p-6 sm:p-10 pb-16 mb-16 space-y-8';

  return (
    <div className="min-h-screen flex flex-col bg-[#191724] text-[var(--rp-base05)] transition-colors">
      <Header />
      <main className={`transition-colors ${mainClasses}`}>
        <Routes>
          <Route path="/" element={<ImageClassification />} />
          <Route path="/username" element={<UsernameSetup />} />
          <Route path="/stats" element={<Statistics />} />
          <Route path="/complete" element={<Celebration />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isCelebrationRoute && <ProgressBar />}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout />
      </Router>
    </AppProvider>
  );
}

export default App;
