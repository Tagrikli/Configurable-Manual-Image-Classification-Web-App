import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const UsernameSetup: React.FC = () => {
  const navigate = useNavigate();
  const { username, setUsername } = useAppContext();
  const [inputValue, setInputValue] = useState(username);

  const handleSave = () => {
    if (inputValue.trim()) {
      setUsername(inputValue.trim());
      navigate('/');
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl shadow-xl p-8 md:p-10 bg-[#1f1d2e] border border-[#26233a] text-[var(--rp-base05)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-[var(--rp-base05)]">
            Change Username
          </h1>
          <p className="text-[var(--rp-base04)] leading-relaxed">
            Your username will be recorded with each image classification you make.
            This helps track who reviewed each image.
          </p>
        </div>

        <div className="bg-[#26233a] border-l-4 border-[var(--rp-base0D)] rounded-lg p-4 mb-6">
          <p className="text-[var(--rp-base04)]">
            <strong className="text-[var(--rp-base0D)]">Current Username:</strong>
            <span className="font-medium ml-2">{username || 'Not Set'}</span>
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="username-input" className="block text-sm font-semibold text-[var(--rp-base04)] mb-2">
              New Username:
            </label>
            <input
              type="text"
              id="username-input"
              placeholder="Enter your username"
              maxLength={50}
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-4 py-3 text-base rounded-lg transition-all text-[var(--rp-base05)] bg-[#26233a] border border-[#312f44] focus:outline-none focus:ring-2 focus:ring-[var(--rp-base0D)]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-[var(--rp-base0D)] hover:bg-[var(--rp-base0C)] text-[#191724] font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--rp-base0D)]"
            >
              Save Username
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-[var(--rp-base08)] hover:bg-[#f284a6] text-[#191724] font-semibold py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--rp-base08)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
