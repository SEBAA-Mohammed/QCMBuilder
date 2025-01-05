import React from 'react';
import LoginRegisterComponent from '../components/LoginRegister';

const LoginRegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen gradient flex flex-col items-center gradient">
      <div className="container px-3 mx-auto flex flex-col items-center">
        <div className="w-full md:w-3/5 py-6 text-center">
          <h1 className="text-5xl font-bold leading-tight mb-8">QCMBuilder</h1>
          <LoginRegisterComponent />
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterPage;