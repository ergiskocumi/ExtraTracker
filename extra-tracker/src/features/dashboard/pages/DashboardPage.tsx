import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Brain, Flame, Sparkles, Timer } from 'lucide-react';

import { useAuth } from '../../auth/context/AuthContext';
import { ActivityFeed } from '../../analytics/components/ActivityFeed';
import { ProductivityChart } from '../../analytics/components/ProductivityChart';
import { analyticsService, type WeeklyAnalyticsResponse } from '../../analytics/services/analyticsService';

type AnalyticsRange = '7d' | '30d';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('7d');
  const [analyticsData, setAnalyticsData] = useState<WeeklyAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      try {
        const data = await analyticsService.getWeekly();
        if (isMounted) {
          setAnalyticsData(data);
        }
      } catch (err) {
        if (isMounted) {
          setAnalyticsError('Impossibile caricare le analytics.');
        }
      } finally {
        if (isMounted) {
          setAnalyticsLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, [analyticsRange]);

  const overview = analyticsData?.overview;
  const dailyActivity = analyticsData?.dailyActivity ?? [];

  const totals = useMemo(() => {
    return dailyActivity.reduce(
      (acc, entry) => {
        acc.study += entry.study;
        acc.work += entry.work;
        acc.xp += entry.xp;
        return acc;
      },
      { study: 0, work: 0, xp: 0 }
    );
  }, [dailyActivity]);

  const name = user?.displayName || user?.firstName || 'Benvenuto';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Analytics Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Ciao {name}, ecco la tua settimana
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Studio, produttivita e progressi in una vista unica.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <Sparkles className="text-amber-300" size={16} />
            <span className="text-sm text-white">Livello {overview?.level ?? 1}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={analyticsRange}
            onChange={(event) => setAnalyticsRange(event.target.value as AnalyticsRange)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
          >
            <option value="7d">Ultimi 7 giorni</option>
            <option value="30d" disabled>Ultimo mese (coming soon)</option>
          </select>
          {analyticsError && (
            <span className="text-xs text-rose-300">{analyticsError}</span>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Brain size={14} className="text-indigo-300" />
            XP Totali
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {analyticsLoading ? '...' : overview?.totalXP ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Flame size={14} className="text-rose-300" />
            Streak attuale
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {analyticsLoading ? '...' : overview?.currentStreak ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Timer size={14} className="text-emerald-300" />
            Studio (min)
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {analyticsLoading ? '...' : totals.study}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Timer size={14} className="text-sky-300" />
            Lavoro (min)
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {analyticsLoading ? '...' : totals.work}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Sparkles size={14} className="text-amber-300" />
            XP settimana
          </div>
          <p className="mt-2 text-2xl font-semibold text-white">
            {analyticsLoading ? '...' : totals.xp}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductivityChart data={dailyActivity} isLoading={analyticsLoading} />
        </div>
        <ActivityFeed items={analyticsData?.recentActivities ?? []} isLoading={analyticsLoading} />
      </div>
    </div>
  );
};
