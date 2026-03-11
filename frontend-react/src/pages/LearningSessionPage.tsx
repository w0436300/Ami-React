import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { QuizPanel } from '@/components/learning/QuizPanel';
import { cn } from '@/lib/cn';
import { useAuthContext } from '@/context/AuthContext';
import { useGoalsContext } from '@/context/GoalsContext';
import { useActiveGoal } from '@/context/GoalsContext';
import { useAppConfig } from '@/api/endpoints/config';
import { useGoalRuntimeState } from '@/api/endpoints/goals';
import {
  useGetLearningContent,
  useGenerateLearningContent,
  useDeleteLearningContent,
  useSessionActivity,
  useCompleteSession,
  useSubmitContentFeedback,
  generateLearningContentApi,
} from '@/api/endpoints/content';
import { useChatWithTutor } from '@/api/endpoints/chat';
import { SessionLoadingPanel } from '@/components/learning/SessionLoadingPanel';
import type { MasteryEvaluationResponse, ContentSection } from '@/types';

interface LocationState {
  goalId: number;
  sessionIndex: number;
}

function transformSectionMarkdown(markdown: string): string {
  if (!markdown) return markdown;
  // Mirror Streamlit behavior: make backend /static assets absolute so media (video/image) loads correctly
  const staticBase = absolutizeUrl('/static/');
  if (!staticBase) return markdown;
  return markdown.replace(/\/static\//g, staticBase);
}

function normalizeGoalContext(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
      return undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return undefined;
}

function absolutizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = (((import.meta.env as Record<string, string>).VITE_API_BASE_URL ?? '') as string)
    .replace(/\/$/, '')
    .replace(/\/v1$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Backend emits [![thumb](thumb)](youtube_url) — embed YouTube without backend changes */
function youtubeEmbedUrl(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname === 'youtu.be' || u.hostname.endsWith('.youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/\/embed\/([\w-]+)/);
      if (m && m[1]) return `https://www.youtube.com/embed/${m[1]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isDirectVideoUrl(href: string): boolean {
  try {
    const u = new URL(href);
    const path = u.pathname.toLowerCase();
    return /\.(webm|mp4|ogg|ogv)(\?|$)/i.test(path);
  } catch {
    return false;
  }
}

/** Video id from embed URL for thumbnail poster */
function youtubeIdFromEmbed(embed: string): string | null {
  const m = embed.match(/\/embed\/([\w-]{11})/);
  return m?.[1] ?? null;
}

/**
 * Defer iframe src until near viewport or user clicks — avoids loading every
 * YouTube player at once (slow). Shows poster + play until then.
 */
function LazyYouTubeEmbed({ embedUrl, watchUrl }: { embedUrl: string; watchUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const videoId = youtubeIdFromEmbed(embedUrl);
  // maxresdefault often blank/404 for shorts; hqdefault is more reliable
  const posterUrl =
    videoId && !posterFailed
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || src) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc(embedUrl);
          setIframeReady(false);
          obs.disconnect();
        }
      },
      { rootMargin: '400px 0px', threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [embedUrl, src]);

  // If iframe never fires onLoad (cross-origin quirks), clear overlay after a few seconds
  useEffect(() => {
    if (!src) return;
    const t = window.setTimeout(() => setIframeReady(true), 8000);
    return () => clearTimeout(t);
  }, [src]);

  const loadPlayer = useCallback(() => {
    const withAutoplay = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`;
    setSrc(withAutoplay);
    setIframeReady(false);
  }, [embedUrl]);

  return (
    <div
      ref={containerRef}
      className="relative block aspect-video w-full overflow-hidden rounded-b-lg bg-slate-100 ring-1 ring-inset ring-slate-200/80"
    >
      {src ? (
        <>
          <iframe
            title="Video"
            src={src}
            className={cn(
              'absolute inset-0 h-full w-full transition-opacity duration-500',
              iframeReady ? 'opacity-100' : 'opacity-0',
            )}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            onLoad={() => setIframeReady(true)}
          />
          {/* Cover black iframe paint with light placeholder until ready */}
          {!iframeReady && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100"
              aria-hidden
            >
              <div className="h-10 w-10 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Loading player…</span>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={loadPlayer}
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            posterUrl
              ? 'text-white'
              : 'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-700',
          )}
        >
          {posterUrl && (
            <>
              <img
                src={posterUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                decoding="async"
                onError={() => setPosterFailed(true)}
              />
              {/* So play button stays readable on any thumbnail */}
              <div className="absolute inset-0 bg-slate-900/35" aria-hidden />
            </>
          )}
          <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform hover:scale-105">
            <svg className="ml-1 h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span
            className={cn(
              'relative z-10 text-xs font-medium drop-shadow',
              posterUrl ? 'text-white' : 'text-slate-600',
            )}
          >
            Click to load video
          </span>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'relative z-10 mt-1 text-[11px] underline',
              posterUrl ? 'text-white/85 hover:text-white' : 'text-slate-500 hover:text-slate-700',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            Don&apos;t want to wait? Open in new window
          </a>
        </button>
      )}
    </div>
  );
}

/** Markdown components: YouTube links → iframe; direct video URLs → <video> */
const lessonMarkdownComponents: Components = {
  a({ href, children, ...props }) {
    if (!href) {
      return <a {...props}>{children}</a>;
    }
    const embed = youtubeEmbedUrl(href);
    if (embed) {
      // Only show top strip when link wraps an image (backend thumbnail); plain text links skip it
      const hasThumb = React.isValidElement(children) && children.type === 'img';
      return (
        <span className="not-prose my-4 block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
          {/* Backend [![thumb](thumb)](url) — keep thumbnail above embed */}
          {hasThumb && (
            <div className="flex justify-center bg-slate-100/80 px-3 py-2 border-b border-slate-200">
              <span className="inline-block max-h-40 rounded-lg overflow-hidden ring-1 ring-slate-200/80 [&_img]:max-h-40 [&_img]:w-auto [&_img]:object-contain">
                {children}
              </span>
            </div>
          )}
          <LazyYouTubeEmbed embedUrl={embed} watchUrl={href} />
          <div className="px-3 py-2 border-t border-slate-200 bg-white">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              Don&apos;t want to wait? Open in new window
            </a>
          </div>
        </span>
      );
    }
    if (isDirectVideoUrl(href)) {
      const hasThumb = React.isValidElement(children) && children.type === 'img';
      return (
        <span className="not-prose my-4 block w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
          {hasThumb && (
            <div className="flex justify-center bg-slate-900/50 px-2 py-2 [&_img]:max-h-36 [&_img]:object-contain">
              {children}
            </div>
          )}
          <video src={href} controls className="max-h-[480px] w-full" playsInline>
            <a href={href} target="_blank" rel="noopener noreferrer">
              Don&apos;t want to wait? Open in new window
            </a>
          </video>
          <div className="bg-slate-900 px-3 py-2">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-300 hover:text-primary-200 hover:underline"
            >
              Don&apos;t want to wait? Open in new window
            </a>
          </div>
        </span>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

function parseSections(doc: string | Record<string, unknown> | undefined): ContentSection[] {
  if (!doc) return [];
  const text = typeof doc === 'string' ? doc : '';
  if (!text) return [{ title: 'Content', markdown: JSON.stringify(doc, null, 2) }];
  const indices: Array<{ title: string; index: number }> = [];
  const headingRe = /^(#{1,3})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(text)) !== null) {
    indices.push({ title: m[2].trim(), index: m.index });
  }
  if (indices.length === 0) return [{ title: 'Content', markdown: text }];
  return indices.map((h, i) => ({
    title: h.title,
    markdown: text.slice(h.index, indices[i + 1]?.index ?? text.length).trim(),
  }));
}

export function LearningSessionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useAuthContext();
  const { updateGoal } = useGoalsContext();
  const { data: config } = useAppConfig();
  const { activeGoal } = useActiveGoal();

  const state = location.state as LocationState | null;

  const resolvedGoalId = (() => {
    if (state?.goalId != null) return state.goalId;
    return activeGoal?.id ?? null;
  })();

  const resolvedSessionIndex = (() => {
    if (state?.sessionIndex != null) return state.sessionIndex;
    if (!activeGoal?.learning_path) return null;
    const idx = activeGoal.learning_path.findIndex(
      (s) => !s.if_learned,
    );
    return idx >= 0 ? idx : null;
  })();

  const goalId = resolvedGoalId as number;
  const sessionIndex = resolvedSessionIndex as number;

  useEffect(() => {
    if (resolvedGoalId == null || resolvedSessionIndex == null) {
      navigate('/learning-path', { replace: true });
    }
  }, [resolvedGoalId, resolvedSessionIndex, navigate]);

  const { data: _runtimeStateData, refetch: refetchRuntime } = useGoalRuntimeState(userId ?? undefined, goalId ?? undefined);

  const { data: contentCacheResult, isLoading: isCheckingCache } = useGetLearningContent(
    userId ?? undefined,
    goalId ?? undefined,
    sessionIndex ?? undefined,
  );

  const generateMutation = useGenerateLearningContent();
  const deleteMutation = useDeleteLearningContent();
  const sessionActivityMutation = useSessionActivity();
  const completeSessionMutation = useCompleteSession();
  const submitFeedbackMutation = useSubmitContentFeedback();
  const chatMutation = useChatWithTutor();

  type ContentData = NonNullable<typeof contentCacheResult>['data'];
  const [content, setContent] = useState<ContentData>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const hasTriggeredGenRef = useRef(false);

  useEffect(() => {
    if (isCheckingCache) return;
    if (!contentCacheResult) return;
    if (contentCacheResult.status === 200 && contentCacheResult.data) {
      setContent(contentCacheResult.data);
      return;
    }
    if (contentCacheResult.status !== 404) return;
    if (hasTriggeredGenRef.current) return;
    if (!userId || goalId == null || sessionIndex == null || !activeGoal) return;
    const pathSession = activeGoal.learning_path?.[sessionIndex];
    if (!pathSession) return;
    hasTriggeredGenRef.current = true;
    setIsGenerating(true);
    generateMutation.mutate(
      {
        learner_profile: JSON.stringify(activeGoal.learner_profile ?? {}),
        learning_path: JSON.stringify(activeGoal.learning_path ?? []),
        learning_session: JSON.stringify(pathSession),
        use_search: true,
        allow_parallel: true,
        with_quiz: true,
        goal_context: normalizeGoalContext(activeGoal.goal_context),
        user_id: userId,
        goal_id: goalId,
        session_index: sessionIndex,
      },
      {
        onSuccess: (data) => {
          setContent(data);
          setIsGenerating(false);
        },
        onError: () => {
          setGenerateError('Failed to generate content. Please try again.');
          setIsGenerating(false);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingCache, contentCacheResult?.status]);

  const sections: ContentSection[] = content?.view_model?.sections?.length
    ? content.view_model.sections
    : parseSections(content?.document);

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [isOnQuiz, setIsOnQuiz] = useState(false);

  useEffect(() => {
    if (sections.length > 0 && currentSectionIdx >= sections.length - 1) setQuizUnlocked(true);
  }, [currentSectionIdx, sections.length]);

  useEffect(() => {
    setCurrentSectionIdx(0);
    setQuizUnlocked(false);
    setIsOnQuiz(false);
    setIsFeedbackOpen(false);
  }, [content]);

  // Heartbeat
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!userId || goalId == null || sessionIndex == null) return;
    const interval = (config?.motivational_trigger_interval_secs ?? 30) * 1000;
    heartbeatRef.current = setInterval(() => {
      sessionActivityMutation.mutate({
        user_id: userId,
        goal_id: goalId,
        session_index: sessionIndex,
        event_type: 'heartbeat',
      });
    }, interval);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, goalId, sessionIndex, config?.motivational_trigger_interval_secs]);

  const [masteryResult, setMasteryResult] = useState<MasteryEvaluationResponse | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const hasMastered = masteryResult?.is_mastered === true;
  const isCompleteEnabled = hasMastered;
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const quizRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || !userId || goalId == null) return;
    const userMsg = { role: 'user' as const, content: chatInput.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    const last20 = updated.slice(-20);
    try {
      const res = await chatMutation.mutateAsync({
        messages: JSON.stringify(last20),
        learner_profile: JSON.stringify(activeGoal?.learner_profile ?? {}),
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    }
  }, [chatInput, chatMessages, userId, goalId, sessionIndex, activeGoal, chatMutation, updateGoal]);

  // Feedback
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [clarityRating, setClarityRating] = useState(0);
  const [relevanceRating, setRelevanceRating] = useState(0);
  const [depthRating, setDepthRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');

  const handleSubmitFeedback = useCallback(async () => {
    if (!userId || goalId == null) return;
    try {
      const res = await submitFeedbackMutation.mutateAsync({
        user_id: userId,
        goal_id: goalId,
        feedback: {
          clarity: clarityRating,
          relevance: relevanceRating,
          depth: depthRating,
          comments: feedbackComments,
          session_index: sessionIndex,
        },
      });
      setFeedbackSubmitted(true);
      if (res.goal) updateGoal(goalId, res.goal);
    } catch {
      /* ignore */
    }
  }, [
    userId,
    goalId,
    clarityRating,
    relevanceRating,
    depthRating,
    feedbackComments,
    sessionIndex,
    submitFeedbackMutation,
    updateGoal,
  ]);

  const handleBack = useCallback(async () => {
    if (userId && goalId != null && sessionIndex != null) {
      await sessionActivityMutation
        .mutateAsync({
          user_id: userId,
          goal_id: goalId,
          session_index: sessionIndex,
          event_type: 'end',
        })
        .catch(() => {});
    }
    navigate('/learning-path');
  }, [userId, goalId, sessionIndex, sessionActivityMutation, navigate]);

  const ensureCached = useCallback(async () => {
    if (!userId || goalId == null || sessionIndex == null || !activeGoal) return;
    const pathSession = activeGoal.learning_path?.[sessionIndex];
    if (!pathSession) return;
    await generateLearningContentApi({
      learner_profile: JSON.stringify(activeGoal.learner_profile ?? {}),
      learning_path: JSON.stringify(activeGoal.learning_path ?? []),
      learning_session: JSON.stringify(pathSession),
      use_search: true,
      allow_parallel: true,
      with_quiz: true,
      goal_context: normalizeGoalContext(activeGoal.goal_context),
      user_id: userId,
      goal_id: goalId,
      session_index: sessionIndex,
    });
  }, [userId, goalId, sessionIndex, activeGoal]);

  const handleRegenerate = useCallback(async () => {
    if (!userId || goalId == null || sessionIndex == null) return;
    await sessionActivityMutation
      .mutateAsync({
        user_id: userId,
        goal_id: goalId,
        session_index: sessionIndex,
        event_type: 'end',
      })
      .catch(() => {});
    setContent(null);
    setGenerateError(null);
    setMasteryResult(null);
    hasTriggeredGenRef.current = false;
    deleteMutation.mutate({ userId, goalId, sessionIndex });
  }, [userId, goalId, sessionIndex, sessionActivityMutation, deleteMutation]);

  const handleComplete = useCallback(async () => {
    if (!userId || goalId == null || sessionIndex == null) return;
    try {
      const res = await completeSessionMutation.mutateAsync({
        user_id: userId,
        goal_id: goalId,
        session_index: sessionIndex,
      });
      if (res.goal) updateGoal(goalId, res.goal);
      setSessionCompleted(true);
      void refetchRuntime();
    } catch {
      /* ignore */
    }
  }, [userId, goalId, sessionIndex, completeSessionMutation, updateGoal, refetchRuntime]);

  const totalSessions = activeGoal?.learning_path?.length ?? 0;
  const hasNextSession = sessionIndex != null && sessionIndex + 1 < totalSessions;

  const handleNextSession = useCallback(() => {
    if (goalId == null || sessionIndex == null || !hasNextSession) return;
    const nextIdx = sessionIndex + 1;
    if (userId) {
      sessionActivityMutation
        .mutateAsync({ user_id: userId, goal_id: goalId, session_index: nextIdx, event_type: 'start' })
        .catch(() => {});
    }
    navigate('/learning-session', { state: { goalId, sessionIndex: nextIdx } });
  }, [goalId, sessionIndex, hasNextSession, userId, sessionActivityMutation, navigate]);

  if (goalId == null || sessionIndex == null) return null;

  const pathSession = activeGoal?.learning_path?.[sessionIndex];
  const sessionTitle = (pathSession?.title as string | undefined) ?? `Session ${sessionIndex + 1}`;

  if (isCheckingCache || isGenerating) {
    return <SessionLoadingPanel sessionTitle={sessionTitle} />;
  }

  if (generateError) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {generateError}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleBack}>
            Back
          </Button>
          <Button
            onClick={() => {
              setGenerateError(null);
              handleRegenerate();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!content)
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-slate-400 text-sm">
        No content available.
      </div>
    );

  const currentSection = sections[currentSectionIdx];
  const references = content.view_model?.references ?? [];
  const audioUrl = absolutizeUrl(content.audio_url);

  const showQuiz = quizUnlocked && Boolean(content.quizzes);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="pt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="min-w-0 space-y-6 pl-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">{sessionTitle}</h2>
              <p className="text-sm text-slate-500">
                Work through the lesson content in order, then complete the quiz to unlock session completion.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button size="sm" variant="secondary" onClick={handleRegenerate}>
                Regenerate
              </Button>
            </div>
          </div>

          {content.content_format === 'audio_enhanced' && audioUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-blue-700 font-medium">Audio version available</p>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}
          {content.content_format === 'visual_enhanced' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
              This content includes enhanced visual elements.
            </div>
          )}

          {(currentSection || (showQuiz && isOnQuiz && content.quizzes)) && (
            <div
              ref={isOnQuiz ? quizRef : undefined}
              className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm"
            >
              {!isOnQuiz && currentSection && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                    <div className="space-y-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Section {currentSectionIdx + 1} of {sections.length}
                      </span>
                      <h3 className="text-xl font-semibold text-slate-900">{currentSection.title}</h3>
                    </div>
                    <span className="text-xs text-slate-400">Guided lesson content</span>
                  </div>
                  <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900">
                    <ReactMarkdown components={lessonMarkdownComponents}>
                      {transformSectionMarkdown(currentSection.markdown)}
                    </ReactMarkdown>
                  </div>
                </>
              )}

              {showQuiz && isOnQuiz && content.quizzes && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Session quiz
                      </span>
                      <h3 className="text-xl font-semibold text-slate-900">{sessionTitle}</h3>
                    </div>
                    <span className="text-xs text-slate-400">Check your understanding</span>
                  </div>
                  <QuizPanel
                    quiz={content.quizzes}
                    userId={userId!}
                    goalId={goalId}
                    sessionIndex={sessionIndex}
                    onMasteryResult={(r) => {
                      setMasteryResult(r);
                      void refetchRuntime();
                    }}
                    ensureCached={ensureCached}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentSectionIdx === 0 && !isOnQuiz}
              onClick={() => {
                if (isOnQuiz) {
                  setIsOnQuiz(false);
                  setCurrentSectionIdx(Math.max(0, sections.length - 1));
                } else {
                  setCurrentSectionIdx((i) => Math.max(0, i - 1));
                }
              }}
            >
              ← Previous
            </Button>
            {isOnQuiz ? (
              <span className="text-xs text-slate-500">Session quiz</span>
            ) : currentSectionIdx >= sections.length - 1 && showQuiz ? (
              <Button
                size="sm"
                onClick={() => {
                  setIsOnQuiz(true);
                  queueMicrotask(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                }}
              >
                Next → Quiz
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={sections.length === 0 || currentSectionIdx >= sections.length - 1}
                onClick={() =>
                  setCurrentSectionIdx((i) => Math.min(sections.length - 1, i + 1))
                }
              >
                Next →
              </Button>
            )}
          </div>

          {references.length > 0 && (
            <details className="text-sm border border-slate-200 rounded-lg">
              <summary className="px-4 py-3 cursor-pointer text-slate-600 font-medium select-none">
                References ({references.length})
              </summary>
              <ol className="px-6 pb-4 pt-1 space-y-1 text-xs text-slate-500 list-decimal">
                {references.map((ref) => (
                  <li key={ref.index}>{ref.label}</li>
                ))}
              </ol>
            </details>
          )}

          {quizUnlocked && !feedbackSubmitted && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-slate-700 text-sm">Session complete</h3>
                  <p className="text-xs text-slate-500">
                    Feedback is optional. Share a quick rating to help improve future sessions.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsFeedbackOpen((prev) => !prev)}
                >
                  {isFeedbackOpen ? 'Hide feedback' : 'Rate this session'}
                </Button>
              </div>

              {isFeedbackOpen && (
                <div className="space-y-4 pt-2">
                  {[
                    { label: 'Clarity', value: clarityRating, set: setClarityRating },
                    { label: 'Relevance', value: relevanceRating, set: setRelevanceRating },
                    { label: 'Depth', value: depthRating, set: setDepthRating },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-sm text-slate-600 w-20">{label}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => set(star)}
                            className={cn(
                              'text-xl',
                              star <= value ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300',
                            )}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <textarea
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    rows={2}
                    placeholder="Any other comments? (optional)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitFeedback}
                    loading={submitFeedbackMutation.isPending}
                    disabled={
                      clarityRating === 0 ||
                      relevanceRating === 0 ||
                      depthRating === 0 ||
                      submitFeedbackMutation.isPending
                    }
                  >
                    Submit Feedback
                  </Button>
                </div>
              )}
            </div>
          )}
          {feedbackSubmitted && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Thank you for your feedback!
            </div>
          )}

          {sessionCompleted ? (
            <div className="rounded-xl border border-green-300 bg-green-50 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800">Session completed!</p>
                  <p className="text-sm text-green-600">
                    {hasNextSession
                      ? 'Great job! Ready for the next session?'
                      : 'Congratulations! You have completed all sessions in this learning path.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {hasNextSession && (
                  <Button size="lg" onClick={handleNextSession}>
                    Next Session →
                  </Button>
                )}
                <Button size="lg" variant="secondary" onClick={() => navigate('/learning-path')}>
                  Back to Learning Path
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2 pt-2 pb-8">
              <Button
                size="lg"
                onClick={handleComplete}
                loading={completeSessionMutation.isPending}
                disabled={!isCompleteEnabled || completeSessionMutation.isPending}
              >
                {completeSessionMutation.isPending ? 'Completing…' : 'Complete Session'}
              </Button>
              {!hasMastered && (
                <p className="text-xs text-slate-400">
                  {masteryResult
                    ? `Score ${Math.round(masteryResult.score_percentage)}% — need ${Math.round(masteryResult.threshold)}% to unlock`
                    : 'Complete the quiz to unlock'}
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="w-full self-start sticky top-6 h-[calc(100vh-48px)] flex flex-col gap-4 min-h-0">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shrink-0">
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Session overview</p>
            </div>
            <div className="max-h-64 overflow-y-auto pr-1">
              {sections.map((s, i) => {
                const isActive = i === currentSectionIdx;
                const isCompleted = i < currentSectionIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setIsOnQuiz(false);
                      setCurrentSectionIdx(i);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-800'
                        : 'hover:bg-slate-50 text-slate-700',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-medium',
                        isActive && 'border-primary-400 bg-primary-100 text-primary-700',
                        isCompleted && 'border-emerald-300 bg-emerald-50 text-emerald-700',
                        !isActive && !isCompleted && 'border-slate-200 bg-slate-50 text-slate-400',
                      )}
                    >
                      {isCompleted ? '✓' : i + 1}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
              {showQuiz && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOnQuiz(true);
                    quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    'mt-1 w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                    isOnQuiz ? 'bg-primary-50 text-primary-800' : 'hover:bg-slate-50 text-slate-700',
                  )}
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-indigo-300 bg-indigo-50 text-[9px] font-medium text-indigo-700">
                    ✓
                  </span>
                  <span className="truncate">Quiz</span>
                </button>
              )}
            </div>
          </div>

          {/* Ami AI: same 320px column as Session overview — aligned vertical axis */}
          <div className="hidden lg:flex mt-auto shrink-0 h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-40">
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Ami AI</p>
              <p className="mt-1 text-xs text-slate-500">Available for this lesson</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              Ready
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 && (
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
              Ask me about this lesson, vocabulary, pronunciation, or examples.
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-2xl px-3 py-2.5 text-sm',
                  msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-800',
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl px-3 py-2 text-sm text-slate-400">Thinking…</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Ask Ami about this lesson…"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <Button
              size="sm"
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatMutation.isPending}
            >
              Send
            </Button>
          </div>
        </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
