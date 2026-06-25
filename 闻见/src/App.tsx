import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Editor = lazy(() => import('./pages/Editor'));
const Invite = lazy(() => import('./pages/Invite'));
const PointRecharge = lazy(() => import('./pages/PointRecharge'));
const Articles = lazy(() => import('./pages/Articles'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const AudioPlayer = lazy(() => import('./pages/AudioPlayer'));
const Membership = lazy(() => import('./pages/Membership'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminCourses = lazy(() => import('./pages/admin/Courses'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminInvitations = lazy(() => import('./pages/admin/Invitations'));
const AdminInvitationCodes = lazy(() => import('./pages/admin/InvitationCodes'));
const AdminPointCodes = lazy(() => import('./pages/admin/PointCodes'));
const CourseChapters = lazy(() => import('./pages/admin/CourseChapters'));
const AdminArticles = lazy(() => import('./pages/admin/Articles'));
const AdminTags = lazy(() => import('./pages/admin/Tags'));
const AdminAuthors = lazy(() => import('./pages/admin/Authors'));
const AdminExternalLinks = lazy(() => import('./pages/admin/ExternalLinks'));
const AdminMembershipCodes = lazy(() => import('./pages/admin/MembershipCodes'));

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin-slow w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout><AnimatedOutlet /></Layout>}>
            <Route index element={<Home />} />
            <Route path="courses" element={<Suspense fallback={<PageLoading />}><Courses /></Suspense>} />
            <Route path="course/:id" element={<Suspense fallback={<PageLoading />}><CourseDetail /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoading />}><Profile /></Suspense>} />
            <Route path="editor" element={<Suspense fallback={<PageLoading />}><Editor /></Suspense>} />
            <Route path="invite" element={<Suspense fallback={<PageLoading />}><Invite /></Suspense>} />
            <Route path="recharge" element={<Suspense fallback={<PageLoading />}><PointRecharge /></Suspense>} />
            <Route path="articles" element={<Suspense fallback={<PageLoading />}><Articles /></Suspense>} />
            <Route path="article/:id" element={<Suspense fallback={<PageLoading />}><ArticleDetail /></Suspense>} />
            <Route path="audio" element={<Suspense fallback={<PageLoading />}><AudioPlayer /></Suspense>} />
            <Route path="membership" element={<Suspense fallback={<PageLoading />}><Membership /></Suspense>} />
          </Route>
          <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
            <Route index element={<Suspense fallback={<PageLoading />}><AdminDashboard /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PageLoading />}><AdminUsers /></Suspense>} />
            <Route path="courses" element={<Suspense fallback={<PageLoading />}><AdminCourses /></Suspense>} />
            <Route path="orders" element={<Suspense fallback={<PageLoading />}><AdminOrders /></Suspense>} />
            <Route path="invitations" element={<Suspense fallback={<PageLoading />}><AdminInvitations /></Suspense>} />
            <Route path="invitation-codes" element={<Suspense fallback={<PageLoading />}><AdminInvitationCodes /></Suspense>} />
            <Route path="point-codes" element={<Suspense fallback={<PageLoading />}><AdminPointCodes /></Suspense>} />
            <Route path="courses/:courseId/chapters" element={<Suspense fallback={<PageLoading />}><CourseChapters /></Suspense>} />
            <Route path="articles" element={<Suspense fallback={<PageLoading />}><AdminArticles /></Suspense>} />
            <Route path="tags" element={<Suspense fallback={<PageLoading />}><AdminTags /></Suspense>} />
            <Route path="authors" element={<Suspense fallback={<PageLoading />}><AdminAuthors /></Suspense>} />
            <Route path="external-links" element={<Suspense fallback={<PageLoading />}><AdminExternalLinks /></Suspense>} />
            <Route path="membership-codes" element={<Suspense fallback={<PageLoading />}><AdminMembershipCodes /></Suspense>} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
