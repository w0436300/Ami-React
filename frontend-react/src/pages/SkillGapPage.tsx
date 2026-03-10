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

interface SkillGapItem {
  skill_name?: string;
  name?: string;
  current_level: string;
  required_level: string;
  is_gap: boolean;
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

function SummaryChip({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'success';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'accent' && 'border-blue-200 bg-blue-50 text-blue-700',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'default' && 'border-slate-200 bg-slate-50 text-slate-600',
      )}
    >
      {children}
    </span>
  );
}

function LevelSelect({
  label,
  value,
  levels,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  levels: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <span className="font-medium text-slate-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 bg-transparent text-slate-700 outline-none disabled:cursor-not-allowed"
      >
        {levels.map((level) => (
          <option key={level} value={level}>
            {formatLevelLabel(level)}
          </option>
        ))}
      </select>
    </label>
  );
}

function LevelProgress({
  levels,
  currentLevel,
  targetLevel,
}: {
  levels: string[];
  currentLevel: string;
  targetLevel: string;
}) {
  const currentIdx = Math.max(0, levels.indexOf(currentLevel));
  const targetIdx = Math.max(0, levels.indexOf(targetLevel));
  const start = Math.min(currentIdx, targetIdx);
  const end = Math.max(currentIdx, targetIdx);
  const left = levels.length > 1 ? `${(start / (levels.length - 1)) * 100}%` : '0%';
  const width = levels.length > 1 ? `${((end - start) / (levels.length - 1)) * 100}%` : '0%';

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="relative mb-3 px-2">
        <div className="absolute left-2 right-2 top-[22px] h-1 rounded-full bg-slate-200" />
        {end > start && (
          <div
            className="absolute top-[22px] h-1 rounded-full bg-blue-200"
            style={{ left: `calc(${left} + 8px)`, width }}
          />
        )}
        <div className="relative grid grid-cols-5 gap-1">
          {levels.map((level, idx) => {
            const isCurrent = idx === currentIdx;
            const isTarget = idx === targetIdx;
            const isBetween = idx > start && idx < end;
            return (
              <div key={level} className="flex flex-col items-center gap-1 text-center">
                <div className="h-5 text-[10px]">
                  {isCurrent && isTarget ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Current + Target</span>
                  ) : isCurrent ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700">Current</span>
                  ) : isTarget ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Target</span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    'relative z-10 h-3.5 w-3.5 rounded-full border-2 bg-white',
                    isCurrent && !isTarget && 'border-slate-500',
                    isTarget && !isCurrent && 'border-blue-500',
                    isCurrent && isTarget && 'border-blue-600 bg-blue-600',
                    isBetween && 'border-blue-200 bg-blue-100',
                    !isCurrent && !isTarget && !isBetween && 'border-slate-300',
                  )}
                />
                <span className="text-[11px] leading-tight text-slate-500">{formatLevelLabel(level)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-component: SkillCard                                         */
/* ------------------------------------------------------------------ */

function SkillCard({
  skill,
  levels,
  onToggle,
  onTargetChange,
  onCurrentChange,
  disabled,
}: {
  skill: LocalSkill;
  levels: string[];
  onToggle: () => void;
  onTargetChange: (level: string) => void;
  onCurrentChange: (level: string) => void;
  disabled: boolean;
}) {
  const curIdx = Math.max(0, levels.indexOf(skill.current_level));
  const reqIdx = Math.max(0, levels.indexOf(skill.required_level));
  const gap = Math.max(0, reqIdx - curIdx);

  const title =
    (skill.original.skill_name ?? (skill.original as unknown as { name?: string }).name ?? '').toString() || 'Skill';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800">{title}</h3>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Gap {gap}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Current {formatLevelLabel(skill.current_level)} to target {formatLevelLabel(skill.required_level)}
          </p>
        </div>
        <Toggle
          label={skill.addToPlan ? 'Include' : 'Ignore'}
          checked={skill.addToPlan}
          onChange={() => onToggle()}
          disabled={disabled}
          className="shrink-0"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <LevelSelect
          label="Current"
          value={skill.current_level}
          levels={levels}
          onChange={onCurrentChange}
          disabled={disabled}
        />
        <LevelSelect
          label="Target"
          value={skill.required_level}
          levels={levels}
          onChange={onTargetChange}
          disabled={disabled}
        />
      </div>

      <LevelProgress levels={levels} currentLevel={skill.current_level} targetLevel={skill.required_level} />
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
  const autoRefined = goalAssessment?.auto_refined === true;
  const refinedGoal = (goalAssessment?.refined_goal as string | undefined) ?? state?.goal ?? '';
  const isVague = (goalAssessment?.is_vague ?? (goalAssessment as any)?.vague) === true;
  const allMastered = (goalAssessment?.all_mastered ?? (goalAssessment as any)?.allMastered) === true;
  const retrievedSources = (identifyResponse?.retrieved_sources as unknown[] | undefined) ?? [];
  const biasWarnings =
    (biasAudit?.warnings as string[] | undefined) ??
    (biasAudit?.bias_flags as string[] | undefined) ??
    [];
  const ethicalDisclaimer = (biasAudit?.ethical_disclaimer as string | undefined) ?? '';

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

      <div className="space-y-3">
        {localSkills.map((skill, idx) => (
          <SkillCard
            key={`${skill.original.skill_name ?? skill.original.name ?? 'skill'}-${idx}`}
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

