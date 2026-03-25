import { useState } from 'react';
import { ONBOARDING_DATA_USE } from '@/components/ethics';
import { Button } from '@/components/ui';

export function AiTransparencyPage() {
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">AI transparency</h1>
        <p className="text-sm text-slate-600">
          Learn how Ami uses AI, what data we use, and where to report issues.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[#78B3BA]">How Ami uses AI</h2>
          <p className="text-sm text-slate-600">Ami helps generate and personalize your learning.</p>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Ami creates learning content, quizzes, and personalized next steps based on your goal and profile.
          </p>
          <p>
            These results are estimates, so they can be wrong or incomplete. We also run bias &amp; ethics checks to help
            reduce potential skew and improve over time.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#78B3BA]">How your data is used</h2>
        <p className="mt-1 text-sm text-slate-600">What we collect, how we use it, and what you can control.</p>
        <div className="mt-4 space-y-4">
          {ONBOARDING_DATA_USE.sections.map((s) => (
            <div key={s.heading} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.heading}</p>
              <p className="text-sm leading-relaxed text-slate-700">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[#78B3BA]">Limitations</h2>
          <p className="text-sm text-slate-600">What to expect from AI-generated results.</p>
        </div>
        <div className="text-sm text-slate-700 space-y-2">
          <p>
            Ami can be wrong or incomplete, especially for edge cases.
            Results like estimates and suggestions are generated to be helpful, not guaranteed to be perfect.
          </p>
          <p>
            Use your own judgment. If something looks off, report it so we can improve.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[#78B3BA]">Report an issue</h2>
          <p className="text-sm text-slate-600">Tell us what you noticed so we can improve.</p>
        </div>

        {feedbackSubmitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Thanks — we received your report.
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder="Describe what you noticed (lesson, chat, or profile)."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!feedbackText.trim()) return;
                  setFeedbackSubmitted(true);
                }}
                disabled={!feedbackText.trim()}
              >
                Submit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setFeedbackText('');
                  setFeedbackSubmitted(false);
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

