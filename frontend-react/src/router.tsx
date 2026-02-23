import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell, AuthLayout, LearningSessionLayout, OnboardingLayout } from '@/components/shell';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LearningPathPage } from '@/pages/LearningPathPage';
import { LearningSessionPage } from '@/pages/LearningSessionPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { SkillGapPage } from '@/pages/SkillGapPage';
import { RefineGoalExamplePage } from '@/pages/RefineGoalExamplePage';

export const router = createBrowserRouter([
  /* Landing / Onboarding — full-page, no sidebar */
  {
    element: <OnboardingLayout />,
    children: [
      { path: '/', element: <OnboardingPage /> },
    ],
  },
  /* Learning Session — sidebar only, no TopBar, center + right panel */
  {
    element: <LearningSessionLayout />,
    children: [
      { path: '/learning-session', element: <LearningSessionPage /> },
    ],
  },
  /* Main app — sidebar + top bar */
  {
    element: <AppShell />,
    children: [
      { path: '/dashboard', element: <HomePage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/learning-path', element: <LearningPathPage /> },
      { path: '/knowledge', element: <KnowledgePage /> },
      { path: '/skill-gap', element: <SkillGapPage /> },
      { path: '/example/refine-goal', element: <RefineGoalExamplePage /> },
    ],
  },
  /* Auth — centered card layout */
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
