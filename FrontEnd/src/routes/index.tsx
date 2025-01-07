import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from '../pages/Home';
import LoginRegisterPage from '../pages/LoginRegister';
import TeacherDashboard from '../pages/TeacherDash';
import CreateTest from '../pages/CreateTest';

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginRegisterPage />} />
        <Route path="/dashboard" element={<TeacherDashboard />} />
        <Route path="/create-test" element={<CreateTest />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;