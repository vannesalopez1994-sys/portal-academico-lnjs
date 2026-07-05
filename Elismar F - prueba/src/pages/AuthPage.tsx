import React, { useState } from 'react';
import { Login } from '../components/auth/Login';
import { ForgotPassword } from '../components/auth/ForgotPassword';

export const AuthPage: React.FC = () => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return <Login onForgotPassword={() => setShowForgotPassword(true)} />;
};
