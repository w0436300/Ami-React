import { useState } from 'react';
import { Button, InputField, TextArea } from '@/components/ui';
import {
  useRefineLearningGoal,
  refineLearningGoalRequestSchema,
  type RefineLearningGoalResponse,
} from '@/api/endpoints/refineLearningGoal';

function formatResponse(data: RefineLearningGoalResponse): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'refined_goal' in data) {
    return String((data as { refined_goal?: string }).refined_goal ?? JSON.stringify(data));
  }
  return JSON.stringify(data);
}

export function RefineGoalExamplePage() {
  const [learningGoal, setLearningGoal] = useState('');
  const [learnerInfo, setLearnerInfo] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate, data, isPending, error, isError, reset } = useRefineLearningGoal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const payload = {
      learning_goal: learningGoal.trim(),
      learner_information: learnerInfo.trim() || undefined,
    };
    const parsed = refineLearningGoalRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors.learning_goal?.[0] ?? parsed.error.message;
      setValidationError(first);
      return;
    }
    mutate(parsed.data);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Refine Learning Goal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Calls <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">POST /refine-learning-goal</code> and
          displays the refined goal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <InputField
          label="Learning goal"
          placeholder="e.g. Learn Python for data science"
          value={learningGoal}
          onChange={(e) => setLearningGoal(e.target.value)}
          disabled={isPending}
          error={validationError ?? undefined}
          required
        />
        <TextArea
          label="Learner information (optional)"
          placeholder="e.g. I have some experience with Excel"
          value={learnerInfo}
          onChange={(e) => setLearnerInfo(e.target.value)}
          disabled={isPending}
          rows={2}
        />
        <div className="flex gap-3">
          <Button type="submit" loading={isPending}>
            Refine goal
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => { reset(); setValidationError(null); }}
          >
            Clear result
          </Button>
        </div>
      </form>

      {isError && (
        <div className="bg-danger-50 border border-danger-500/20 rounded-lg p-4 text-sm text-danger-700">
          <strong>Error:</strong> {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {data !== undefined && !isError && (
        <div className="bg-success-50 border border-success-500/20 rounded-lg p-4">
          <strong className="text-success-700 text-sm">Refined goal:</strong>
          <pre className="whitespace-pre-wrap mt-2 text-sm text-slate-700">{formatResponse(data)}</pre>
        </div>
      )}
    </div>
  );
}
