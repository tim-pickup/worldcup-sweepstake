import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PhaseProvider } from './context/PhaseContext';
import Nav from './components/Nav';
import PhaseBanner from './components/PhaseBanner';
import Leaderboard from './pages/Leaderboard';
import Matches from './pages/Matches';
import Register from './pages/Register';
import Login from './pages/Login';
import GroupPreferences from './pages/GroupPreferences';
import KnockoutPreferences from './pages/KnockoutPreferences';
import './index.css';

export default function App() {
  return (
    <BrowserRouter basename="/worldcup-sweepstake/">
      <AuthProvider>
        <PhaseProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <PhaseBanner />
            <Nav />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Leaderboard />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/group-preferences" element={<GroupPreferences />} />
                <Route path="/knockout-preferences" element={<KnockoutPreferences />} />
              </Routes>
            </main>
            <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
              World Cup 2026 Sweepstake
            </footer>
          </div>
        </PhaseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
