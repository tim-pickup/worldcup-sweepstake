import { useState } from 'react';
import { register } from '../api.js';

export default function RegistrationForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [regCode, setRegCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError('PIN must be between 4 and 8 characters.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      return;
    }
    if (!regCode.trim()) {
      setError('Please enter the registration code.');
      return;
    }

    setSubmitting(true);
    const result = await register(name.trim(), pin, regCode.trim());
    setSubmitting(false);

    if (result.ok) {
      setSuccess(result.data?.message ?? 'Registration successful!');
      onSuccess({
        pin,
        name: result.data?.name ?? name.trim(),
        playerID: result.data?.playerID,
      });
    } else {
      setError(result.error ?? 'Registration failed. Please try again.');
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2 className="card-title">📋 Register</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="reg-name">Your Name</label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Smith"
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-pin">PIN</label>
          <input
            id="reg-pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4–8 characters"
            minLength={4}
            maxLength={8}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-confirm-pin">Confirm PIN</label>
          <input
            id="reg-confirm-pin"
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Re-enter your PIN"
            minLength={4}
            maxLength={8}
            required
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-code">Registration Code</label>
          <input
            id="reg-code"
            type="text"
            value={regCode}
            onChange={(e) => setRegCode(e.target.value)}
            placeholder="Code provided by the organiser"
            required
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          {submitting ? 'Registering…' : 'Register'}
        </button>
      </form>
    </div>
  );
}
