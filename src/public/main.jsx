import React from 'react';
import ReactDOM from 'react-dom/client';
import PublicApp from './PublicApp';
import './public.css';

const route = new URLSearchParams(globalThis.location.search).get('route');
if (route) {
  const query = new URLSearchParams(globalThis.location.search);
  query.delete('route');
  const suffix = query.toString() ? `?${query}` : '';
  globalThis.history.replaceState(null, '', `/mySOS/${route.replace(/^\/+/, '')}${suffix}`);
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><PublicApp /></React.StrictMode>);
