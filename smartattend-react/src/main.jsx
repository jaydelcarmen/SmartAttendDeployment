import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login          from './pages/Login/Login';
import Register       from './pages/Register/Register';
import AdminLogin     from './pages/AdminLogin/AdminLogin';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import Layout         from './components/Layout';
import TeacherDashboard from './pages/TeacherDashboard/TeacherDashboard';
import StudentNav     from './pages/StudentNav/StudentNav';
import StudentTable   from './pages/StudentTable/StudentTable';
import Report         from './pages/Report/Report';
import Scanner        from './pages/Scanner/Scanner';
import Settings       from './pages/Settings/Settings';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Login />} />
        <Route path="/register"  element={<Register />} />
        <Route path="/admin"     element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<TeacherDashboard />} />
          <Route path="/students"  element={<StudentNav />} />
          <Route path="/students/:cardId" element={<StudentTable />} />
          <Route path="/report"    element={<Report />} />
          <Route path="/scanner"   element={<Scanner />} />
          <Route path="/settings"  element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
