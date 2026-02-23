import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InputField } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useHasEnteredGoal } from '@/context/HasEnteredGoalContext';

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

interface Category {
  id: string;
  label: string;
  /** Emoji shown when selected */
  selectedEmoji: string;
}

const CATEGORIES: Category[] = [
  { id: 'language',  label: 'Learn a new language',   selectedEmoji: '🍓' },
  { id: 'practical', label: 'Build a practical skill', selectedEmoji: '🔧' },
  { id: 'career',    label: 'Career related skill',    selectedEmoji: '💼' },
  { id: 'design',    label: 'Design skill',            selectedEmoji: '🎨' },
];

type OnboardingState = 'idle' | 'category-selected' | 'goal-refined' | 'submitting';

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setHasEnteredGoal } = useHasEnteredGoal();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [learningGoal, setLearningGoal] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinedText, setRefinedText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageState: OnboardingState = isSubmitting
    ? 'submitting'
    : refinedText !== null
      ? 'goal-refined'
      : selectedCategory !== null
        ? 'category-selected'
        : 'idle';

  const handleSelectCategory = useCallback(
    (id: string) => {
      const next = selectedCategory === id ? null : id;
      setSelectedCategory(next);
      setRefinedText(null);
      if (next) {
        const cat = CATEGORIES.find((c) => c.id === next);
        setLearningGoal(cat ? `${cat.label}: ` : '');
      } else {
        setLearningGoal('');
      }
    },
    [selectedCategory],
  );

  const handleRefine = useCallback(() => {
    if (!learningGoal.trim()) return;
    setIsRefining(true);
    setTimeout(() => {
      setRefinedText(
        `${learningGoal.trim()} — refined by AI with a personalized study plan.`,
      );
      setIsRefining(false);
    }, 1200);
  }, [learningGoal]);

  const handleBeginLearning = useCallback(() => {
    setIsSubmitting(true);
    setHasEnteredGoal(true);
    setTimeout(() => {
      navigate('/skill-gap');
    }, 1200);
  }, [navigate, setHasEnteredGoal]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* ── Scrollable content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ── Hero ── */}
        <section className="text-center pt-8 pb-6 px-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome to <span className="text-primary-600">Ami</span>
          </h1>
          <p className="mt-3 text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
            Your personal adaptive learning companion.
            <br />
            No setup required — we&apos;ll adapt to you as we go.
          </p>
        </section>

        {/* ── Main content ── */}
        <section className="max-w-2xl w-full mx-auto px-4 space-y-6 pb-8">
          {/* Question prompt */}
          <p className="text-center text-sm font-medium text-slate-700">
            What would you like to learn today?
          </p>

          {/* Input + AI refine */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <InputField
                placeholder="eg: learn english, python, data ..."
                value={learningGoal}
                onChange={(e) => {
                  setLearningGoal(e.target.value);
                  setRefinedText(null);
                }}
                disabled={isSubmitting}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefine}
              loading={isRefining}
              disabled={!learningGoal.trim() || isSubmitting}
              className="mt-0.5 whitespace-nowrap"
            >
              AI Refinement
            </Button>
          </div>

          {/* Refined result badge */}
          {refinedText && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 text-sm text-primary-800">
              <span className="font-medium">Refined goal:</span> {refinedText}
            </div>
          )}

          {/* Category cards */}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  disabled={isSubmitting}
                  className={cn(
                    'relative text-left px-4 py-3.5 rounded-lg border-2 transition-all text-sm font-medium',
                    'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  )}
                >
                  {cat.label}
                  {isSelected && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                      {cat.selectedEmoji}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Hint + Adjust preference */}
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="text-amber-500 mr-1">💡</span>
              Enter any topic you want to learn, and the system will automatically
              generate personalized content for you.
            </p>
            <Button variant="secondary" size="sm" disabled={isSubmitting}>
              Adjust Preference
            </Button>
          </div>
        </section>

        {/* ── State indicator (dev aid — remove in production) ── */}
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <p className="text-xs text-slate-400">
            Current state: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{pageState}</code>
          </p>
        </div>
      </div>

      {/* ── Bottom action bar：固定间距，不随滚动移动 ── */}
      <section className="shrink-0 pt-6 pb-8 px-4 bg-white border-t border-slate-100">
        <div className="max-w-2xl w-full mx-auto flex flex-col sm:flex-row items-center gap-4">
          <Button
            size="lg"
            onClick={handleBeginLearning}
            loading={isSubmitting}
            disabled={pageState === 'idle'}
            className="w-full sm:w-auto !bg-primary-600 hover:!bg-primary-700 !text-white px-10"
          >
            Begin Learning
          </Button>

          <div className="flex gap-3">
            <Button variant="secondary" size="md" disabled={isSubmitting}>
              Upload Your Resume (Optional)
            </Button>
            <Button variant="secondary" size="md" disabled={isSubmitting}>
              Connect to your LinkedIn
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
