import { Button, InputField, TextArea } from '@/components/ui';

export function GoalsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Learning Goals</h2>
        <p className="mt-1 text-sm text-slate-500">
          Define what you want to achieve. Ami will refine and structure your goals.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <InputField
          label="Learning goal"
          placeholder="e.g. Master Python for data science"
        />
        <TextArea
          label="Additional context"
          placeholder="e.g. I already know basic programming"
          hint="Optional — helps Ami personalize your path."
        />
        <div className="flex gap-3">
          <Button>Refine Goal</Button>
          <Button variant="secondary">Save as Draft</Button>
        </div>
      </div>

      {/* Saved goals list placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-700 mb-3">Saved Goals</h3>
        <p className="text-sm text-slate-400 italic">No goals saved yet.</p>
      </div>
    </div>
  );
}
