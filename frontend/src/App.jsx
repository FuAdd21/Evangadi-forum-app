/**
 * Route map: public pages live outside `Layout`; forum tools use `Layout` + `ProtectedRoute`.
 * Add new `<Route>` entries here, then wire navigation in `Sidebar.jsx` and
 * `Layout.jsx` (`getTitle` / `getSubtitle`) so the shell stays in sync.
 */
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing/Landing"));
const Auth = lazy(() => import("./pages/Auth/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const MyQuestions = lazy(() => import("./pages/MyQuestions/MyQuestions"));
const PostQuestion = lazy(() => import("./pages/PostQuestion/PostQuestion"));
const QuestionDetail = lazy(
  () => import("./pages/QuestionDetail/QuestionDetail"),
);
const RagDocuments = lazy(() => import("./pages/RagDocuments/RagDocuments"));
const Settings = lazy(() => import("./pages/Settings/Settings"));

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center",
        color: "var(--text-secondary)",
      }}
    >
      Loading page…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />

              {/* Protected routes with Layout */}
              <Route element={<Layout />}>
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/questions/ask"
                  element={
                    <ProtectedRoute>
                      <PostQuestion />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-questions"
                  element={
                    <ProtectedRoute>
                      <MyQuestions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/question/:questionHash"
                  element={
                    <ProtectedRoute>
                      <QuestionDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rag-documents"
                  element={
                    <ProtectedRoute>
                      <RagDocuments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
