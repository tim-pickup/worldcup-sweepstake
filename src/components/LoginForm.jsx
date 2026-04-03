import { useState, useEffect, useRef } from 'react';
import { getPlayerNames, getAllocations } from '../api.js';

export default function LoginForm({ onSuccess }) {
  const [names, setNames] = useState([]);
  const [filter, setFilter] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingNames, setLoadingNames] = useState(true);
  const [showList, setShowList] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    getPlayerNames().then(result => {
      if (result.ok) setNames(result.data ?? []);
      setLoadingNames(false);
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowList(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = names.filter(n =>
    n.toLowerCase().includes(filter.toLowerCase())
  );

  function handleSelectName(name) {
    setSelectedName(name);
    setFilter(name);
    setShowList(false);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!selectedName) {
      setError('Please select your name from the list.');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter your PIN.');
      return;
    }

    setSubmitting(true);
    const result = await getAllocations(selectedName, pin.trim());
    setSubmitting(false);

    if (result.ok) {
      const playerID = result.data?.player?.['Player ID'];
      onSuccess({ pin: pin.trim(), name: selectedName, playerID });
    } else {
      setError('Incorrect name or PIN. Please try again.');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
      <h2 className="card-title">🔑 Log In</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {/* Name search */}
        <div className="form-group" ref={wrapRef} style={{ position: 'relative' }}>
          <label htmlFor="login-name">Your Name</label>
          <input
            id="login-name"
            type="text"
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              setSelectedName('');
              setShowList(true);
            }}
            onFocus={() => setShowList(true)}
            placeholder={loadingNames ? 'Loading players…' : 'Type to search…'}
            disabled={loadingNames || submitting}
            autoComplete="off"
            autoFocus
          />

          {showList && filtered.length > 0 && (
            <div className="name-list" style={{ position: 'absolute', left: 0, right: 0, zIndex: 20 }}>
              {filtered.map(name => (
                <div
                  key={name}
                  className={`name-list-item${selectedName === name ? ' selected' : ''}`}
                  onMouseDown={() => handleSelectName(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}

          {showList && filter.length > 0 && filtered.length === 0 && (
            <div className="name-list" style={{ position: 'absolute', left: 0, right: 0, zIndex: 20 }}>
              <div className="name-list-item" style={{ cursor: 'default', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No players found
              </div>
            </div>
          )}
        </div>

        {/* PIN */}
        {selectedName && (
          <div className="form-group">
            <label htmlFor="login-pin">PIN</label>
            <input
              id="login-pin"
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter your PIN"
              required
              disabled={submitting}
              autoFocus
            />
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || !selectedName}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {submitting ? 'Checking…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
