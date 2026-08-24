import SiteShell from './components/SiteShell';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import SolutionsPage from './pages/SolutionsPage';
import WhyPage from './pages/WhyPage';
import StoriesPage from './pages/StoriesPage';
import StoryDetailPage from './pages/StoryDetailPage';

export function resolvePublicRoute(pathname = globalThis.location?.pathname ?? '/mySOS/') {
  const normalized = pathname.replace(/^\/mySOS\/?/, '/').replace(/\/+$/, '') || '/';
  if (normalized === '/') return { page: 'home' };
  if (normalized === '/products') return { page: 'products' };
  if (normalized === '/solutions') return { page: 'solutions' };
  if (normalized === '/why-mysos') return { page: 'why' };
  if (normalized === '/success-stories') return { page: 'stories' };
  const storyMatch = normalized.match(/^\/success-stories\/([^/]+)$/);
  if (storyMatch) return { page: 'story', slug: storyMatch[1] };
  return { page: 'not-found' };
}

function NotFound() {
  return <main className="not-found"><span>404</span><h1>Page not found</h1><p>The page you are looking for may have moved.</p><a className="button" href="/mySOS/">Back to MySOS</a></main>;
}

export default function PublicApp() {
  const route = resolvePublicRoute();
  const content = route.page === 'home' ? <HomePage />
    : route.page === 'products' ? <ProductsPage />
      : route.page === 'solutions' ? <SolutionsPage />
        : route.page === 'why' ? <WhyPage />
          : route.page === 'stories' ? <StoriesPage />
            : route.page === 'story' ? <StoryDetailPage slug={route.slug} />
              : <NotFound />;
  return <SiteShell>{content}</SiteShell>;
}
