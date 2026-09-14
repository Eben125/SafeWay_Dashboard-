import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoleProvider } from './components/auth/RoleContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RoleProvider>
      <App />
    </RoleProvider>
  </React.StrictMode>
);
