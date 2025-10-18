import { useEffect, useState } from 'react';
import { apiClient, type ReviewerStats } from '../api/client';

export const Statistics = () => {
  const [stats, setStats] = useState<ReviewerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          label: '🥇',
          containerClass:
            'text-[#191724]',
        };
      case 2:
        return {
          label: '🥈',
          containerClass:
            'text-[#191724]',
        };
      case 3:
        return {
          label: '🥉',
          containerClass:
            'text-[#191724]',
        };
      default:
        return {
          label: `#${rank}`,
          containerClass:
            'text-[var(--rp-base05)]',
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl p-6 md:p-10 bg-[#1f1d2e] border border-[#26233a] shadow-xl text-[var(--rp-base05)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-[var(--rp-base05)]">
            Reviewer Statistics
          </h1>
          <p className="text-[var(--rp-base04)] leading-relaxed">
            This page shows how many images each reviewer has classified, sorted from most to least.
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="bg-[var(--rp-base0D)] hover:bg-[var(--rp-base0C)] text-[#191724] font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--rp-base0D)] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span className="flex items-center gap-2">
              <span>{loading ? '⏳' : '🔄'}</span>
              <span>{loading ? 'Loading...' : 'Refresh Statistics'}</span>
            </span>
          </button>
        </div>

        <div id="stats-content">
          {loading && (
            <div className="text-center py-10 text-[var(--rp-base04)]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--rp-base0D)] mb-3"></div>
              <p>Loading statistics...</p>
            </div>
          )}

          {error && (
            <div className="bg-[var(--rp-base02)] border border-[var(--rp-base08)] rounded-lg p-4 text-[var(--rp-base08)]">
              {error}
            </div>
          )}

          {!loading && !error && stats.length === 0 && (
            <div className="text-center py-10 text-[var(--rp-base04)]">
              <p>No statistics available yet.</p>
            </div>
          )}

          {!loading && !error && stats.length > 0 && (
            <div className="space-y-3">
              {stats.map((stat, index) => {
                const rank = index + 1;
                const { label, containerClass } = getRankStyles(rank);
                return (
                  <div
                    key={stat.reviewer}
                    className="flex items-center justify-between rounded-xl p-4 bg-[#26233a] border border-[#2e2a44] hover:bg-[#2e2a44] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex items-center justify-center px-4 py-1.5 min-w-[3.25rem] rounded-lg font-semibold uppercase tracking-wide shadow ${containerClass}`}
                      >
                        {label}
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--rp-base05)]">{stat.reviewer}</p>
                        <p className="text-sm text-[var(--rp-base04)]">
                          {stat.count} image{stat.count !== 1 ? 's' : ''} classified
                        </p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[var(--rp-base0D)]">
                      {stat.count}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
