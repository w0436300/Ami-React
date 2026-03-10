/**
 * Profile "Learning style" (Visual Learner / Balanced / Text-first) is not persisted
 * by a dedicated backend field today. We store the user's choice locally and inject it
 * into learner_information when creating a new goal so the profile/agent pipeline can use it.
 */
const STORAGE_KEY = 'ami_learning_style_preference';

export const LEARNING_STYLE_OPTIONS = ['Visual Learner', 'Balanced', 'Text-first'] as const;
export type LearningStyleOption = (typeof LEARNING_STYLE_OPTIONS)[number];

export const DEFAULT_LEARNING_STYLE: LearningStyleOption = 'Balanced';

export function getLearningStylePreference(): LearningStyleOption {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && LEARNING_STYLE_OPTIONS.includes(raw as LearningStyleOption)) {
      return raw as LearningStyleOption;
    }
  } catch {
    // ignore
  }
  return DEFAULT_LEARNING_STYLE;
}

export function setLearningStylePreference(style: LearningStyleOption): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // ignore
  }
}

/** Prefix appended to learner_information so create-profile / skill-gap flow sees it */
export function learningStylePreferencePrefix(style: LearningStyleOption): string {
  return `Learning style preference: ${style}. `;
}

/** Inject preference into learner_information if not already present */
export function withLearningStyleInLearnerInformation(learnerInformation: string): string {
  const style = getLearningStylePreference();
  const prefix = learningStylePreferencePrefix(style);
  if (!learnerInformation || learnerInformation.trim() === '') {
    return prefix.trim();
  }
  if (learnerInformation.includes('Learning style preference:')) {
    return learnerInformation;
  }
  return prefix + learnerInformation;
}
