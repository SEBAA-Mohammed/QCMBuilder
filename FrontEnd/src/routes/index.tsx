import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from '../pages/Home';
import LoginRegisterPage from '../pages/LoginRegister';
import TeacherDashboard from '../pages/TeacherDash';

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginRegisterPage />} />
        <Route path="/dashboard" element={<TeacherDashboard />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;