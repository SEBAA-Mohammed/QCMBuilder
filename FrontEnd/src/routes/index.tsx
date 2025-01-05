import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from '../pages/Home';
import LoginRegisterPage from '../pages/LoginRegister';

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginRegisterPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;