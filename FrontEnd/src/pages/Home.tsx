import React from 'react';
import Login from '../components/Login';
import Register from '../components/Register';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-8">Welcome to QCM Builder</h1>
        <div className="flex justify-around">
          <Login />
          <Register />
        </div>
      </div>
    </div>
  );
};

export default Home;