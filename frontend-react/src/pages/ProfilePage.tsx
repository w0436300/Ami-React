import { Button, InputField, TextArea } from '@/components/ui';

export function ProfilePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Learner Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your profile helps Ami adapt recommendations to your background.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <InputField label="Display name" placeholder="Your name" />
        <TextArea
          label="Background & experience"
          placeholder="Describe your current knowledge level, prior courses, etc."
          rows={4}
        />
        <div className="flex gap-3">
          <Button>Save Profile</Button>
          <Button variant="ghost">Sync from Server</Button>
        </div>
      </div>
    </div>
  );
}
