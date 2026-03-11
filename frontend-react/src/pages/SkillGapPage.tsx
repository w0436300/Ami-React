import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Toggle } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuthContext } from '@/context/AuthContext';
import { useGoalsContext } from '@/context/GoalsContext';
import { useSidebarCollapse } from '@/context/SidebarCollapseContext';
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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5F6B7A]">{rowLabel}</p>
      <div className="relative">
        {/* Track background — click row still uses label buttons below */}
        <div className="h-2 w-full rounded-full bg-[#E8EEF3]" />
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-[#8EA4BE] transition-[width] duration-200"
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
                isSelected ? 'font-semibold text-primary-800' : 'text-slate-700 hover:text-slate-900',
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
    <div className="overflow-hidden rounded-2xl border border-[#DCE7EE] bg-[#FCFDFE] shadow-[0_1px_3px_rgba(20,32,51,0.06)]">
      {/* Header: numbered title + Mark as Gap */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#DCE7EE] bg-[#FCFDFE] text-sm font-semibold text-[#5F6B7A]"
            aria-hidden
          >
            {index + 1}
          </span>
          <h3 className="truncate text-base font-semibold text-[#142033]">{title}</h3>
        </div>
        <Toggle
          label="Mark as Gap"
          checked={skill.addToPlan}
          onChange={() => onToggle()}
          disabled={disabled}
          className="shrink-0 [&_span]:text-xs [&_span]:text-[#5F6B7A]"
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
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <span>{expanded ? 'Collapse' : 'Expand'} details</span>
            <span className={cn('text-slate-600 transition-transform', expanded && 'rotate-180')}>▾</span>
          </button>
          {expanded && (
            <div className="space-y-4 px-4 pb-4">
              {reason && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5F6B7A]">
                    Assessment
                  </p>
                  <p className="text-sm leading-relaxed text-[#2E3A49]">{reason}</p>
                </div>
              )}
              {currentDescription && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5F6B7A]">
                    Current level
                  </p>
                  <p className="text-sm leading-relaxed text-[#2E3A49]">{currentDescription}</p>
                </div>
              )}
              {suggestedPath && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5F6B7A]">
                    Suggested growth path
                  </p>
                  <p className="text-sm leading-relaxed text-[#2E3A49]">{suggestedPath}</p>
                </div>
              )}
              {levelConfidence && (
                <p className="text-[11px] text-[#5F6B7A]">
                  <span className="font-medium text-[#2E3A49]">Confidence:</span> {levelConfidence}
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
  const { collapsed } = useSidebarCollapse();
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
  /** false = default overview (summary cards); true = detailed adjust UI (tracks + toggles) */
  const [adjustMode, setAdjustMode] = useState(false);
  const hasFiredRef = useRef(false);
  /** Snapshot when entering adjust mode — Cancel restores this */
  const adjustSnapshotRef = useRef<LocalSkill[] | null>(null);

  const enterAdjustMode = useCallback(() => {
    adjustSnapshotRef.current = structuredClone(localSkills) as LocalSkill[];
    setAdjustMode(true);
  }, [localSkills]);

  const cancelAdjust = useCallback(() => {
    if (adjustSnapshotRef.current) {
      setLocalSkills(adjustSnapshotRef.current);
      adjustSnapshotRef.current = null;
    }
    setAdjustMode(false);
  }, []);

  const saveAdjustAndReturn = useCallback(() => {
    adjustSnapshotRef.current = null;
    setAdjustMode(false);
  }, []);

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

  /* ---------- Default overview: summary cards + CTA; link opens detailed adjust UI ---------- */
  const gapLv = (s: LocalSkill) => {
    const cur = levels.indexOf(s.current_level);
    const tgt = levels.indexOf(s.required_level);
    if (cur < 0 || tgt < 0) return 0;
    return Math.max(0, tgt - cur);
  };
  const priorityGapCount = localSkills.filter((s) => gapLv(s) >= 1).length;

  if (!adjustMode && localSkills.length > 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-6">
            <header className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#142033] sm:text-2xl">Your skill blueprint is ready</h1>
                <p className="mt-1 text-sm text-[#667085]">
                  {localSkills.length} core competencies identified, including {priorityGapCount} priority gap
                  {priorityGapCount !== 1 ? 's' : ''} to address first.
                </p>
              </div>
            </header>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {localSkills.map((skill, idx) => {
                const name = skill.original.skill_name || skill.original.name || `Skill ${idx + 1}`;
                const g = gapLv(skill);
                const tgtIdx = Math.max(0, levels.indexOf(skill.required_level));
                const barPctTgt = levels.length > 1 ? (tgtIdx / (levels.length - 1)) * 100 : 100;
                const tag =
                  g >= 3
                    ? { text: 'Key breakthrough', className: 'bg-[#142033] text-white' }
                    : g === 2
                      ? { text: 'Steady improvement', className: 'bg-[#E8F6EF] text-[#1F7A52]' }
                      : g === 1
                        ? { text: 'Quick remediation', className: 'bg-[#EAF4FB] text-[#2B6F97]' }
                        : { text: 'Specialized focus', className: 'bg-[#F4F0FF] text-[#5B4B8A]' };
                return (
                  <div
                    key={`${name}-${idx}`}
                    className="min-w-0 rounded-2xl border border-[#DCE7EE] bg-[#FCFDFE] p-4 shadow-[0_1px_3px_rgba(20,32,51,0.06)]"
                  >
                    <h3 className="min-w-0 font-semibold leading-snug text-[#142033] break-words">
                      {name}
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8EEF3]">
                        <div
                          className="h-full rounded-full bg-[#8EA4BE]"
                          style={{ width: `${barPctTgt}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#5F6B7A]">
                        {formatLevelLabel(skill.current_level)} → {formatLevelLabel(skill.required_level)}
                      </p>
                      {/* Status pill + GAP on one row, left–right aligned */}
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 pt-0.5">
                        <span
                          className={`inline-flex w-fit max-w-full shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight whitespace-normal ${tag.className}`}
                        >
                          {tag.text}
                        </span>
                        {g > 0 && (
                          <p className="shrink-0 text-xs font-semibold text-[#2E3A49]">GAP: {g} LV</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="w-full shrink-0 rounded-2xl border border-[#DCE7EE] bg-[#FCFDFE] p-6 shadow-[0_1px_3px_rgba(20,32,51,0.06)] lg:sticky lg:top-24 lg:w-[320px]">
            <div className="mb-4 flex justify-center text-[#142033]">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-center text-lg font-bold text-[#142033]">Generate learning path</h2>
            <p className="mt-2 text-center text-sm text-[#667085]">
              AI will match optimal teaching resources from this blueprint.
            </p>
            <Button
              size="lg"
              className="mt-6 w-full justify-center gap-2"
              onClick={handleSchedule}
              loading={isScheduling}
              disabled={plannedSkills.length === 0 || !hasGaps || isScheduling}
            >
              {isScheduling ? 'Creating…' : 'Generate Learning Path'}
              {!isScheduling && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Button>
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-[#5F6B7A] underline decoration-[#DCE7EE] underline-offset-2 hover:text-[#142033]"
              onClick={enterAdjustMode}
            >
              Adjust start and target levels
            </button>
            <p className="mt-2 text-center text-xs text-[#5F6B7A]">
              Open the detailed view to adjust levels and which skills are included in your plan.
            </p>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl space-y-6 pb-28">
      <button
        type="button"
        className="text-sm font-medium text-[#5F6B7A] underline decoration-[#DCE7EE] underline-offset-2 hover:text-[#142033]"
        onClick={saveAdjustAndReturn}
      >
        ← Back to blueprint overview
      </button>

      <div className="space-y-1">
        <p className="text-sm font-medium text-[#142033]">Select the skills you want included in your learning plan.</p>
        <p className="text-sm font-medium text-[#667085]">
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
        <details className="text-sm border border-[#DCE7EE] rounded-lg bg-[#FCFDFE]">
          <summary className="px-4 py-3 cursor-pointer text-[#142033] font-medium select-none">
            Retrieved sources ({retrievedSources.length})
          </summary>
          <ul className="px-4 pb-4 pt-1 space-y-1 text-xs text-[#5F6B7A] list-disc list-inside">
            {retrievedSources.slice(0, 5).map((src, i) => (
              <li key={i}>{typeof src === 'string' ? src : JSON.stringify(src)}</li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      </div>

      {/* Floating bottom action bar — only over main column (same left offset as sidenav), not over sidenav */}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 h-[70px] border-t border-slate-200 bg-transparent shadow-[0_-4px_24px_rgba(0,0,0,0.08)]',
          collapsed ? 'left-16' : 'left-[15rem]',
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 bg-[rgba(255,255,255,0.92)] px-4 py-3 sm:px-6 lg:px-8">
          <Button type="button" variant="secondary" onClick={cancelAdjust}>
            Cancel
          </Button>
          <Button type="button" size="lg" onClick={saveAdjustAndReturn} className="px-6 sm:px-8">
            Save Changes and Return
          </Button>
        </div>
      </div>
    </div>
  );
}

