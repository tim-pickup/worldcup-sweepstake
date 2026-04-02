import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [player, setPlayer] = useState(() => {
    try {
      const stored = sessionStorage.getItem('wc_player');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  function login(name, pin) {
    const p = { name, pin };
    sessionStorage.setItem('wc_player', JSON.stringify(p));
    setPlayer(p);
  }

  function logout() {
    sessionStorage.removeItem('wc_player');
    setPlayer(null);
  }

  return (
    <AuthContext.Provider value={{ player, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
