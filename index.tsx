// Fix: Replaced Python Streamlit application code with a standard React entry point.
// This script now renders the main `App` component to the DOM, assuming a standard
// React project setup (like Create React App or Vite) with an HTML file containing a `<div id="root">`.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element. Make sure your HTML has a <div id='root'></div>.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
