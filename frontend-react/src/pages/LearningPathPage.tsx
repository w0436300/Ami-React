import { Button } from '@/components/ui';

const placeholderUnits = [
  { id: 1, title: 'Introduction to Variables', status: 'completed' },
  { id: 2, title: 'Control Flow', status: 'current' },
  { id: 3, title: 'Functions & Scope', status: 'upcoming' },
  { id: 4, title: 'Data Structures', status: 'upcoming' },
];

const statusBadge: Record<string, string> = {
  completed: 'bg-success-50 text-success-700',
  current: 'bg-primary-50 text-primary-700',
  upcoming: 'bg-slate-100 text-slate-500',
};

export function LearningPathPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Learning Path</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your personalized curriculum — adapts as you progress.
          </p>
        </div>
        <Button variant="secondary" size="sm">Reschedule</Button>
      </div>

      <div className="space-y-3">
        {placeholderUnits.map((unit) => (
          <div
            key={unit.id}
            className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                unit.status === 'completed' ? 'bg-success-500' :
                unit.status === 'current' ? 'bg-primary-500' :
                'bg-slate-300'
              }`} />
              <span className="font-medium text-slate-700">{unit.title}</span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusBadge[unit.status]}`}>
              {unit.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
