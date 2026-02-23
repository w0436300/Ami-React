/**
 * Example page: calls POST /refine-learning-goal and displays the result.
 * Uses useRefineLearningGoal hook; optional Zod validation before submit.
 */
import { useState } from 'react';
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
    <div style={{ maxWidth: 560 }}>
      <h1>Refine Learning Goal (Example)</h1>
      <p>
        This page calls <code>POST /refine-learning-goal</code> via{' '}
        <code>useRefineLearningGoal</code> and shows the refined goal.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 4 }}>Learning goal *</span>
          <input
            type="text"
            value={learningGoal}
            onChange={(e) => setLearningGoal(e.target.value)}
            placeholder="e.g. Learn Python for data science"
            disabled={isPending}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          <span style={{ display: 'block', marginBottom: 4 }}>Learner information (optional)</span>
          <textarea
            value={learnerInfo}
            onChange={(e) => setLearnerInfo(e.target.value)}
            placeholder="e.g. I have some experience with Excel"
            disabled={isPending}
            rows={2}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        {validationError && (
          <p style={{ color: 'crimson', margin: 0 }}>{validationError}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={isPending}>
            {isPending ? 'Refining…' : 'Refine goal'}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setValidationError(null);
            }}
            disabled={isPending}
          >
            Clear result
          </button>
        </div>
      </form>

      {isError && (
        <div style={{ marginTop: 16, padding: 12, background: '#fee', borderRadius: 4 }}>
          <strong>Error:</strong> {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {data !== undefined && !isError && (
        <div style={{ marginTop: 16, padding: 12, background: '#efe', borderRadius: 4 }}>
          <strong>Refined goal:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{formatResponse(data)}</pre>
        </div>
      )}
    </div>
  );
}
