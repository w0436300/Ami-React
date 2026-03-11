import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Toggle } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuthContext } from '@/context/AuthContext';
import { useGoalsContext } from '@/context/GoalsContext';
import { useAppConfig } from '@/api/endpoints/config';
import {
  useCreateLearnerProfileWithInfo,
  useValidateProfileFairness,
  identifySkillGapApi,
  auditSkillGapBiasApi,
} from '@/api/endpoints/skillGap';
import { createGoalApi } from '@/api/endpoints/goals';
import { syncProfileApi } from '@/api/endpoints/profile';
import { PathGenerationLoading } from '@/components/learning/PathGenerationLoading';

/* ------------------------------------------------------------------ */
/*  Loading stage copy (reused for skill gap vs learning path)        */
/* ------------------------------------------------------------------ */

const SKILL_GAP_LOADING = {
  title: 'Building your skill gap profile',
  subtitle: "We're analyzing your goal and identifying the most important skills to improve first.",
  steps: [
    'Understanding your learning goal...',
    'Breaking down required skills...',
    'Checking your current gaps...',
    'Identifying priority improvement areas...',
    'Preparing your skill gap analysis...',
  ],
  tips: [
    'Tip: Clear goals lead to more accurate learning recommendations.',
    'Tip: Finding weak spots early helps you improve faster.',
    'Tip: Skill gaps are easier to close when broken into smaller targets.',
    'Tip: Strong learning plans start with honest assessment.',
  ],
};

const LEARNING_PATH_LOADING = {
  title: 'Building your learning path',
  steps: [
    'Analyzing your skill gaps...',
    'Reviewing weak knowledge areas...',
    'Matching the right difficulty level...',
    'Building your personalized learning path...',
    'Finalizing your next best steps...',
  ],
  tips: [
    'Short, frequent review sessions usually work better than one long session.',
    'Practice the hardest items first when your attention is highest.',
    'Mixing reading, listening, and recall improves retention.',
    'Repeating a concept in different contexts strengthens memory.',
    'Small daily progress is usually better than occasional cramming.',
    'Teaching what you learn to someone else deepens understanding.',
    'Taking breaks between study blocks boosts long-term recall.',
  ],
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface LocationState {
  goal: string;
  personaKey: string | null;
  learnerInformation: string;
  isGoalManagementFlow: boolean;
}

/** Mirrors backend modules.skill_gap.schemas.SkillGap (+ optional extras) */
interface SkillGapItem {
  name?: string;
  skill_name?: string;
  current_level: string;
  required_level: string;
  is_gap: boolean;
  /** Backend: concise rationale for current level (≤20 words) */
  reason?: string;
  level_confidence?: string;
  [key: string]: unknown;
}

interface LocalSkill {
  original: SkillGapItem;
  current_level: string;
  required_level: string;
  addToPlan: boolean;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function formatLevelLabel(level: string) {
  if (!level) return '';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/** Horizontal level track: click stage to select (no dropdown) */
function LevelTrackRow({
  rowLabel,
  value,
  levels,
  onChange,
  disabled,
}: {
  rowLabel: string;
  value: string;
  levels: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const selectedIdx = Math.max(0, levels.indexOf(value));
  const n = levels.length;
  const fillPct = n > 1 ? (selectedIdx / (n - 1)) * 100 : 0;

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{rowLabel}</p>
      <div className="relative">
        {/* Track background — click row still uses label buttons below */}
        <div className="h-2 w-full rounded-full bg-slate-100" />
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-primary-500/90 transition-[width] duration-200"
          style={{ width: `${fillPct}%`, minWidth: selectedIdx === 0 ? 12 : undefined }}
        />
        <div className="absolute inset-0 flex">
          {levels.map((level, idx) => {
            const isSelected = idx === selectedIdx;
            const isPast = idx <= selectedIdx;
            const leftPct = n > 1 ? (idx / (n - 1)) * 100 : 0;
            return (
              <button
                key={level}
                type="button"
                disabled={disabled}
                aria-label={`Set ${rowLabel} to ${formatLevelLabel(level)}`}
                aria-pressed={isSelected}
                onClick={() => onChange(level)}
                className={cn(
                  'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary-400 disabled:pointer-events-none disabled:opacity-50',
                )}
                style={{ left: `${leftPct}%` }}
              >
                {isSelected ? (
                  <div className="h-2.5 w-2.5 rounded-sm bg-primary-600 shadow-sm ring-2 ring-white" />
                ) : idx === 0 ? (
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full ring-2 ring-white',
                      isPast ? 'bg-primary-500' : 'bg-slate-300',
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'h-1.5 w-1.5 rounded-full ring-2 ring-white',
                      isPast ? 'bg-primary-300' : 'bg-slate-300',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {/* Labels — primary click target to pick level */}
      <div className="mt-2 grid grid-cols-5 gap-0.5 text-center">
        {levels.map((level, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={cn(
                'rounded-md px-0.5 py-1 text-[10px] leading-tight transition-colors',
                'hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                disabled && 'cursor-not-allowed opacity-50',
                isSelected ? 'font-semibold text-primary-800' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {formatLevelLabel(level)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Normalize backend string fields; returns null if empty */
function stringFromBackend(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/* ------------------------------------------------------------------ */
/*  Sub-component: SkillCard                                         */
/* ------------------------------------------------------------------ */

function SkillCard({
  index,
  skill,
  levels,
  onToggle,
  onTargetChange,
  onCurrentChange,
  disabled,
}: {
  index: number;
  skill: LocalSkill;
  levels: string[];
  onToggle: () => void;
  onTargetChange: (level: string) => void;
  onCurrentChange: (level: string) => void;
  disabled: boolean;
}) {
  const title =
    stringFromBackend(skill.original.name) ??
    stringFromBackend(skill.original.skill_name) ??
    'Skill';

  // All narrative copy from backend only
  const reason = stringFromBackend(skill.original.reason);
  const levelConfidence = stringFromBackend(skill.original.level_confidence);
  const suggestedPath = stringFromBackend(
    (skill.original as Record<string, unknown>).suggested_growth_path,
  );
  const currentDescription = stringFromBackend(
    (skill.original as Record<string, unknown>).current_level_description,
  );

  const hasExpandableContent =
    Boolean(reason || suggestedPath || currentDescription || levelConfidence);

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header: numbered title + Mark as Gap */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700"
            aria-hidden
          >
            {index + 1}
          </span>
          <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <Toggle
          label="Mark as Gap"
          checked={skill.addToPlan}
          onChange={() => onToggle()}
          disabled={disabled}
          className="shrink-0 [&_span]:text-xs [&_span]:text-slate-600"
        />
      </div>

      {/* TARGET + CURRENT tracks */}
      <div className="space-y-5 px-4 pb-3">
        <LevelTrackRow
          rowLabel="Target level"
          value={skill.required_level}
          levels={levels}
          onChange={onTargetChange}
          disabled={disabled}
        />
        <LevelTrackRow
          rowLabel="Current level"
          value={skill.current_level}
          levels={levels}
          onChange={onCurrentChange}
          disabled={disabled}
        />
      </div>

      {/* Expandable: only backend-provided strings; no fabricated copy */}
      {hasExpandableContent && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <span>{expanded ? 'Collapse' : 'Expand'} details</span>
            <span className={cn('text-slate-400 transition-transform', expanded && 'rotate-180')}>▾</span>
          </button>
          {expanded && (
            <div className="space-y-4 px-4 pb-4">
              {reason && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Assessment
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">{reason}</p>
                </div>
              )}
              {currentDescription && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Current level
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">{currentDescription}</p>
                </div>
              )}
              {suggestedPath && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Suggested growth path
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">{suggestedPath}</p>
                </div>
              )}
              {levelConfidence && (
                <p className="text-[11px] text-slate-500">
                  <span className="font-medium text-slate-600">Confidence:</span> {levelConfidence}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export function SkillGapPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const { setSelectedGoalId, refreshGoals } = useGoalsContext();
  const { data: config } = useAppConfig();

  const state = location.state as LocationState | null;

  useEffect(() => {
    if (!state?.goal || !state?.learnerInformation) {
      navigate('/onboarding', { replace: true });
    }
  }, [state, navigate]);

  const levels = config?.skill_levels ?? ['unlearned', 'beginner', 'intermediate', 'advanced', 'expert'];

  const createProfileMutation = useCreateLearnerProfileWithInfo();
  const validateFairnessMutation = useValidateProfileFairness();

  const [identifyResponse, setIdentifyResponse] = useState<Record<string, unknown> | null>(null);
  const [biasAudit, setBiasAudit] = useState<Record<string, unknown> | null>(null);
  const [localSkills, setLocalSkills] = useState<LocalSkill[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    // Wait for config so we use the correct level labels (backend uses lowercase like "unlearned")
    if (hasFiredRef.current || !config || !state?.goal || !state?.learnerInformation) return;

    // Prevent double-fire in the same mount (e.g. React StrictMode). Do NOT skip based on
    // sessionStorage: after navigating away and back, component remounts with empty state,
    // so we must call the API again to get skill gaps for the current goal.
    hasFiredRef.current = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const resp = (await identifySkillGapApi({
          learning_goal: state.goal,
          learner_information: state.learnerInformation,
        })) as unknown as Record<string, unknown>;

        setIdentifyResponse(resp);
        const rawGaps = (resp as any).skill_gaps;
        const gapArray: SkillGapItem[] = Array.isArray(rawGaps)
          ? (rawGaps as SkillGapItem[])
          : rawGaps && typeof rawGaps === 'object'
          ? Object.values(rawGaps as Record<string, SkillGapItem>)
          : [];

        const normalizedGaps: SkillGapItem[] = gapArray.map((sg) => ({
          ...sg,
          skill_name: (sg.skill_name ?? sg.name ?? '').toString(),
        }));

        setLocalSkills(
          normalizedGaps.map((sg) => ({
            original: sg,
            current_level: sg.current_level ?? levels[0],
            required_level: sg.required_level ?? (levels[1] ?? levels[0]),
            addToPlan: sg.is_gap !== false,
          })),
        );

        try {
          const biasData = (await auditSkillGapBiasApi({
            // Backend expects JSON string under `skill_gaps`
            skill_gaps: JSON.stringify({ skill_gaps: normalizedGaps }),
            learner_information: state.learnerInformation,
          })) as Record<string, unknown>;
          setBiasAudit(biasData);
        } catch {
          // ignore bias audit errors
        }
      } catch {
        setError('Failed to identify skill gaps. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleToggle = useCallback((idx: number) => {
    setLocalSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, addToPlan: !s.addToPlan } : s)));
  }, []);

  const handleTargetChange = useCallback((idx: number, level: string) => {
    setLocalSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, required_level: level } : s)));
  }, []);

  const handleCurrentChange = useCallback((idx: number, level: string) => {
    setLocalSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, current_level: level } : s)));
  }, []);

  const plannedSkills = localSkills.filter((s) => s.addToPlan);
  const hasGaps = plannedSkills.some((s) => levels.indexOf(s.required_level) > levels.indexOf(s.current_level));
  const selectedCount = plannedSkills.length;
  const identifiedCount = localSkills.length;

  const goalAssessment = (identifyResponse?.goal_assessment as Record<string, unknown> | undefined) ?? null;
  const refinedGoal = (goalAssessment?.refined_goal as string | undefined) ?? state?.goal ?? '';
  const retrievedSources = (identifyResponse?.retrieved_sources as unknown[] | undefined) ?? [];
  void goalAssessment?.auto_refined;
  void biasAudit;

  const handleSchedule = useCallback(async () => {
    if (!userId || !state) return;
    setIsScheduling(true);
    setError(null);
    try {
      const filteredGaps = plannedSkills.map((s) => ({
        ...s.original,
        current_level: s.current_level,
        required_level: s.required_level,
      }));

      const profileResult = await createProfileMutation.mutateAsync({
        learning_goal: refinedGoal,
        learner_information: state.learnerInformation,
        skill_gaps: JSON.stringify(filteredGaps),
      });
      const learnerProfile = profileResult.learner_profile;

      let profileFairness: Record<string, unknown> | null = null;
      if (!state.isGoalManagementFlow) {
        try {
          profileFairness = (await validateFairnessMutation.mutateAsync({
            learner_profile: JSON.stringify(learnerProfile),
            learner_information: state.learnerInformation,
            persona_name: state.personaKey ?? '',
          })) as Record<string, unknown>;
        } catch {
          profileFairness = null;
        }
      }

      const newGoal = await createGoalApi(userId, {
        learning_goal: refinedGoal,
        skill_gaps: filteredGaps as unknown,
        goal_assessment: goalAssessment,
        goal_context: (identifyResponse as any)?.goal_context,
        retrieved_sources: retrievedSources,
        bias_audit: biasAudit,
        profile_fairness: profileFairness,
        learner_profile: learnerProfile,
      });

      try {
        await syncProfileApi(userId, newGoal.id);
      } catch {
        // ignore sync errors here
      }

      refreshGoals();
      setSelectedGoalId(newGoal.id);
      navigate('/learning-path');
    } catch {
      setError('Failed to create your learning path. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  }, [
    userId,
    state,
    plannedSkills,
    refinedGoal,
    goalAssessment,
    identifyResponse,
    retrievedSources,
    biasAudit,
    createProfileMutation,
    validateFairnessMutation,
    refreshGoals,
    setSelectedGoalId,
    navigate,
  ]);

  if (!state?.goal) return null;

  if (isLoading && !identifyResponse) {
    return (
      <PathGenerationLoading
        title={SKILL_GAP_LOADING.title}
        subtitle={SKILL_GAP_LOADING.subtitle}
        steps={SKILL_GAP_LOADING.steps}
        tips={SKILL_GAP_LOADING.tips}
        goalTitle={state.goal}
      />
    );
  }

  if (error && !identifyResponse) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        <Button variant="secondary" onClick={() => navigate('/onboarding')}>
          Back to Onboarding
        </Button>
      </div>
    );
  }

  if (isScheduling) {
    return (
      <PathGenerationLoading
        title={LEARNING_PATH_LOADING.title}
        steps={LEARNING_PATH_LOADING.steps}
        tips={LEARNING_PATH_LOADING.tips}
        goalTitle={refinedGoal || state?.goal || ''}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl space-y-6 pb-28">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <p className="text-sm text-slate-600">
          Based on your goal, we've identified the key skills required and estimated your current level. Review each
          skill below — toggle off any you want to exclude, or adjust if the AI assessment seems off.
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">Select the skills you want included in your learning plan.</p>
        <p className="text-sm text-slate-500">
          {identifiedCount} identified • {selectedCount} selected
        </p>
      </div>

      <div className="space-y-4">
        {localSkills.map((skill, idx) => (
          <SkillCard
            key={`${skill.original.skill_name ?? skill.original.name ?? 'skill'}-${idx}`}
            index={idx}
            skill={skill}
            levels={levels}
            onToggle={() => handleToggle(idx)}
            onTargetChange={(level) => handleTargetChange(idx, level)}
            onCurrentChange={(level) => handleCurrentChange(idx, level)}
            disabled={isScheduling}
          />
        ))}
      </div>

      {retrievedSources.length > 0 && (
        <details className="text-sm border border-slate-200 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer text-slate-600 font-medium select-none">
            Retrieved sources ({retrievedSources.length})
          </summary>
          <ul className="px-4 pb-4 pt-1 space-y-1 text-xs text-slate-500 list-disc list-inside">
            {retrievedSources.slice(0, 5).map((src, i) => (
              <li key={i}>{typeof src === 'string' ? src : JSON.stringify(src)}</li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="sticky bottom-0 z-10 pt-2">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-800">{selectedCount} skill{selectedCount !== 1 ? 's' : ''} selected</p>
            <p className="text-xs text-slate-500">
              {hasGaps
                ? 'Your selected skills will shape the difficulty and focus of the learning path.'
                : 'Select at least one skill with a target level above the current level to continue.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => navigate('/onboarding')} disabled={isScheduling}>
              Edit Goal
            </Button>
            <Button
              size="lg"
              onClick={handleSchedule}
              loading={isScheduling}
              disabled={plannedSkills.length === 0 || !hasGaps || isScheduling}
              className="px-8"
            >
              {isScheduling ? 'Creating your profile…' : 'Generate Learning Path'}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

