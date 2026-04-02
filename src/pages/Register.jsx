import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', pin: '', confirmPin: '', registrationCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (form.pin.length < 4) { setError('PIN must be at least 4 characters.'); return; }
    if (form.pin !== form.confirmPin) { setError('PINs do not match.'); return; }
    if (!form.registrationCode.trim()) { setError('Please enter the registration code.'); return; }

    setSubmitting(true);
    try {
      const res = await api.register(form.name.trim(), form.pin, form.registrationCode.trim());
      if (res.success) {
        login(form.name.trim(), form.pin);
        navigate('/');
      } else {
        setError(res.error || 'Registration failed. Please check your details and try again.');
      }
    } catch {
      setError('Could not connect. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign up</h1>
      <p className="text-gray-500 text-sm mb-8">
        You&apos;ll need the registration code shared by the organiser.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Alex Smith"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Choose a PIN</label>
          <input
            type="password"
            value={form.pin}
            onChange={set('pin')}
            placeholder="At least 4 characters"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
          <input
            type="password"
            value={form.confirmPin}
            onChange={set('confirmPin')}
            placeholder="Re-enter your PIN"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Registration code</label>
          <input
            type="text"
            value={form.registrationCode}
            onChange={set('registrationCode')}
            placeholder="Shared by the organiser"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Signing up…' : 'Sign up'}
        </button>
      </form>
    </div>
  );
}
