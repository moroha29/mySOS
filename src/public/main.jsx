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

const container = document.getElementById('root');
const tree = <React.StrictMode><PublicApp /></React.StrictMode>;

// Routes are prerendered to static HTML at build time (scripts/prerender.mjs).
// Hydrate that markup rather than discarding and re-rendering it; fall back to
// a client render when the container is empty, which is the case in dev and for
// any route the prerender step did not cover.
// A `?route=` arrival (the 404.html deep-link fallback) is served the prerendered
// HTML of the *home* page, so its markup will not match the route being shown.
// Client-render in that case instead of hydrating a mismatch.
if (container.hasChildNodes() && !route) ReactDOM.hydrateRoot(container, tree);
else ReactDOM.createRoot(container).render(tree);
