import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

// Phase IDs
export const PHASES = {
  REGISTRATION: 1,
  GROUP_PREFERENCES: 2,
  GROUP_SCORING: 3,
  KNOCKOUT_PREFERENCES: 4,
  KNOCKOUT_SCORING: 5,
  COMPLETE: 6,
};

const PhaseContext = createContext(null);

function determinePhase(config) {
  if (!config) return PHASES.REGISTRATION;
  const now = new Date();
  const parse = (s) => (s ? new Date(s) : null);

  const regClose = parse(config.registrationClose);
  const groupPrefClose = parse(config.groupPreferencesClose);
  const groupScoringClose = parse(config.groupScoringClose);
  const knockoutPrefClose = parse(config.knockoutPreferencesClose);
  const knockoutScoringClose = parse(config.knockoutScoringClose);

  if (!regClose || now <= regClose) return PHASES.REGISTRATION;
  if (!groupPrefClose || now <= groupPrefClose) return PHASES.GROUP_PREFERENCES;
  if (!groupScoringClose || now <= groupScoringClose) return PHASES.GROUP_SCORING;
  if (!knockoutPrefClose || now <= knockoutPrefClose) return PHASES.KNOCKOUT_PREFERENCES;
  if (!knockoutScoringClose || now <= knockoutScoringClose) return PHASES.KNOCKOUT_SCORING;
  return PHASES.COMPLETE;
}

export function PhaseProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getConfig()
      .then(setConfig)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const phase = determinePhase(config);

  return (
    <PhaseContext.Provider value={{ config, phase, loading, error }}>
      {children}
    </PhaseContext.Provider>
  );
}

export function usePhase() {
  return useContext(PhaseContext);
}
