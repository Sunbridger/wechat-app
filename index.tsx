import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('React version:', React.version);
console.log('ReactDOM version:', ReactDOM.version);

const rootElement = document.getElementById('root');
console.log('rootElement:', rootElement);

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
console.log('React root created:', root);

console.log('Attempting to render App component...');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('App component rendered successfully!');