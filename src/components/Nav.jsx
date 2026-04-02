import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePhase, PHASES } from '../context/PhaseContext';

export default function Nav() {
  const { player, logout } = useAuth();
  const { phase } = usePhase();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-gray-900 hover:text-blue-600">
          <span>🏆</span>
          <span>World Cup 2026 Sweepstake</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Leaderboard</Link>
          <Link to="/matches" className="text-sm text-gray-600 hover:text-gray-900">Matches</Link>

          {player ? (
            <>
              {phase === PHASES.GROUP_PREFERENCES && (
                <Link to="/group-preferences" className="text-sm text-gray-600 hover:text-gray-900">
                  My Picks
                </Link>
              )}
              {phase === PHASES.KNOCKOUT_PREFERENCES && (
                <Link to="/knockout-preferences" className="text-sm text-gray-600 hover:text-gray-900">
                  Auction
                </Link>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-medium">{player.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-700 underline"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <Link
              to={phase === PHASES.REGISTRATION ? '/register' : '/login'}
              className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700"
            >
              {phase === PHASES.REGISTRATION ? 'Sign up' : 'Log in'}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
