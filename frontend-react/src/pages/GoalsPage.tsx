import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

type GoalStatus = 'In Progress' | 'Needs Attention';

interface GoalCard {
  id: string;
  title: string;
  status: GoalStatus;
  startedDate: string;
  progressPct: number;
  goalDetail?: string;
  nextUp?: string;
  nextUpEst?: string;
}

const CURRENT_GOAL_LABEL = 'I want to learn French';

const ACTIVE_GOAL: GoalCard & { goalDetail: string; nextUp: string; nextUpEst: string } = {
  id: 'active',
  title: 'Learn French for Travel',
  status: 'In Progress',
  startedDate: 'Feb 15',
  progressPct: 42,
  goalDetail: 'conversational French before summer trip',
  nextUp: 'Module 3 — Greetings & Common Phrases',
  nextUpEst: '15 min',
};

const ALL_GOALS: GoalCard[] = [
  { id: 'g1', title: 'Learn French for Travel', status: 'In Progress', startedDate: 'Feb 15', progressPct: 42 },
  { id: 'g2', title: 'Python for Data Analysis', status: 'In Progress', startedDate: 'Feb 15', progressPct: 68 },
  { id: 'g3', title: 'Public Speaking', status: 'Needs Attention', startedDate: 'Feb 15', progressPct: 25 },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function GoalsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <p className="text-base font-medium text-slate-800">
        Current Goal: <span className="text-slate-900">{CURRENT_GOAL_LABEL}</span>
      </p>

      {/* Currently active — dark card */}
      <section className="bg-slate-800 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold tracking-tight">{ACTIVE_GOAL.title}</h2>
        <p className="mt-1 text-sm text-slate-300">
          Started {ACTIVE_GOAL.startedDate} · Goal: {ACTIVE_GOAL.goalDetail}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-600 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${ACTIVE_GOAL.progressPct}%` }}
            />
          </div>
          <span className="text-sm font-semibold shrink-0 w-10 text-right">{ACTIVE_GOAL.progressPct}%</span>
        </div>
        <p className="mt-3 text-sm text-slate-300">
          Next up: {ACTIVE_GOAL.nextUp} · Est. {ACTIVE_GOAL.nextUpEst}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            size="md"
            className="!bg-white !text-slate-900 hover:!bg-slate-100"
            onClick={() => navigate('/learning-session')}
          >
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
            Continue Learning
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="!bg-slate-600 !text-white !border-0 hover:!bg-slate-500"
            onClick={() => navigate('/learning-path')}
          >
            View Full Path
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="!bg-slate-600 !text-white !border-0 hover:!bg-slate-500"
            onClick={() => navigate('/skill-gap')}
          >
            Update Skill Assessment
          </Button>
        </div>
      </section>

      {/* All goals grid */}
      <section>
        <h3 className="text-base font-semibold text-slate-800 mb-4">ALL GOALS ({ALL_GOALS.length + 1})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_GOALS.map((goal) => (
            <div
              key={goal.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-500 px-2 py-1 rounded-full bg-slate-100">
                  {goal.status}
                </span>
                <span className="text-xs text-slate-400">{goal.startedDate}</span>
              </div>
              <h4 className="font-semibold text-slate-900">{goal.title}</h4>
              <p className="text-sm text-slate-500 mt-1">{goal.progressPct}% complete</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${goal.progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-600 w-8 text-right">{goal.progressPct}%</span>
              </div>
              <Button
                size="sm"
                className="mt-4 w-full !bg-slate-800 hover:!bg-slate-700 !text-white"
                onClick={() => navigate('/learning-session')}
              >
                Continue Learning
              </Button>
            </div>
          ))}

          {/* Add new goal card */}
          <button
            type="button"
            className={cn(
              'relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6',
              'flex flex-col items-center justify-center gap-2 min-h-[200px]',
              'text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
            )}
          >
            <span className="absolute top-3 right-3 text-lg" aria-hidden>🍓</span>
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold text-slate-700">Add a new goal</span>
            <span className="text-sm">Start a new learning journey</span>
          </button>
        </div>
      </section>
    </div>
  );
}
