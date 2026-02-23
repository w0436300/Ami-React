import { Button } from '@/components/ui';

const placeholderGaps = [
  { skill: 'Recursion', level: 'Low', color: 'bg-danger-500' },
  { skill: 'Object-Oriented Design', level: 'Medium', color: 'bg-warning-500' },
  { skill: 'List Comprehensions', level: 'High', color: 'bg-success-500' },
];

export function SkillGapPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Skill Gap Analysis</h2>
          <p className="mt-1 text-sm text-slate-500">
            Identify where you need to focus to reach your learning goals.
          </p>
        </div>
        <Button variant="secondary" size="sm">Refresh Analysis</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {placeholderGaps.map(({ skill, level, color }) => (
          <div key={skill} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="font-medium text-slate-700">{skill}</span>
            </div>
            <span className="text-sm text-slate-500">Mastery: {level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
