import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LearningPathPage } from '@/pages/LearningPathPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { SkillGapPage } from '@/pages/SkillGapPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'learning-path', element: <LearningPathPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'skill-gap', element: <SkillGapPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
