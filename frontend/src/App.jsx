import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppShell } from './components/AppShell.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ChildrenPage } from './pages/ChildrenPage.jsx';
import { ChildDetailPage } from './pages/ChildDetailPage.jsx';
import { GuardiansPage } from './pages/GuardiansPage.jsx';
import { GuardianDetailPage } from './pages/GuardianDetailPage.jsx';
import { SessionsPage } from './pages/SessionsPage.jsx';
import { SessionDetailPage } from './pages/SessionDetailPage.jsx';
import { OrganizationsPage } from './pages/OrganizationsPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { AuditLogsPage } from './pages/AuditLogsPage.jsx';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="tp-login-page d-flex align-items-center justify-content-center">
        <div className="text-center p-4">
          <div className="spinner-border text-success mb-2" role="status" />
          <div className="small text-secondary">Memeriksa sesi pengguna...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const defaultPath = user.role === 'administrator' ? '/organisasi' : '/dashboard';
    return <Navigate to={defaultPath} replace />;
  }

  return <AppShell>{children}</AppShell>;
}

function PublicLoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return <Navigate to={user.role === 'administrator' ? '/organisasi' : '/dashboard'} replace />;
  }
  return <LoginPage />;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={user.role === 'administrator' ? '/organisasi' : '/dashboard'} replace />;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicLoginRoute />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas', 'dinas_kesehatan']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/anak"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas']}>
                <ChildrenPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/anak/:id"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas']}>
                <ChildDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wali"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas']}>
                <GuardiansPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/wali/:id"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas']}>
                <GuardianDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sesi"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas']}>
                <SessionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sesi/:id"
            element={
              <ProtectedRoute allowedRoles={['kader', 'petugas_puskesmas']}>
                <SessionDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/organisasi"
            element={
              <ProtectedRoute allowedRoles={['administrator', 'dinas_kesehatan']}>
                <OrganizationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pengguna"
            element={
              <ProtectedRoute allowedRoles={['administrator']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit-log"
            element={
              <ProtectedRoute allowedRoles={['administrator', 'petugas_puskesmas']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
