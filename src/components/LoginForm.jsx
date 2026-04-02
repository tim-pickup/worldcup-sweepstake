import { useState } from 'react';
import { getAllocations } from '../api.js';

export default function LoginForm({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!pin.trim()) {
      setError('Please enter your PIN.');
      return;
    }

    setSubmitting(true);
    const result = await getAllocations(pin.trim());
    setSubmitting(false);

    if (result.ok) {
      const playerName = result.data?.player?.Name;
      const playerID = result.data?.player?.['Player ID'];
      onSuccess({ pin: pin.trim(), name: playerName, playerID });
    } else {
      setError('Invalid PIN. Please try again.');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2 className="card-title">🔑 Log In</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="login-pin">PIN</label>
          <input
            id="login-pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter your PIN"
            required
            disabled={submitting}
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {submitting ? 'Checking…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
