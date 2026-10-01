import { useEffect } from 'react';
import SiteShell from './components/SiteShell';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import SolutionsPage from './pages/SolutionsPage';
import WhyPage from './pages/WhyPage';
import StoriesPage from './pages/StoriesPage';
import StoryDetailPage from './pages/StoryDetailPage';
import SolutionDetailPage from './pages/SolutionDetailPage';
import RequestPage from './pages/RequestPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import ArticlePage from './pages/ArticlePage';
import resources from '../data/resources.json';
import solutions from '../data/solutions.json';
import productData from '../data/productData.json';
import watchChrome from './chrome';
import watchReveals from './reveal';
import { watchTextStyles } from './textStyles';

/*
 * The site is served from the root of its own domain. The leading /mySOS that
 * is still taken off here is not the old GitHub Pages path: the website manager
 * shows this site in its preview at <manager>/mySOS/..., and the page has to
 * find its route there too. textStyles.js makes the same allowance.
 */
export function resolvePublicRoute(pathname = globalThis.location?.pathname ?? '/') {
  const normalized = pathname.replace(/^\/mySOS\/?/, '/').replace(/\/+$/, '') || '/';
  if (normalized === '/') return { page: 'home' };
  if (normalized === '/products') return { page: 'products' };
  if (normalized === '/request') return { page: 'request' };
  if (normalized === '/solutions') return { page: 'solutions' };
  if (normalized === '/why-mysos') return { page: 'why' };
  if (normalized === '/success-stories') return { page: 'stories' };
  if (normalized === '/resources') return { page: 'resources' };
  const guideMatch = normalized.match(/^\/resources\/([^/]+)$/);
  if (guideMatch && resources.articles.some((article) => article.slug === guideMatch[1])) return { page: 'guide', slug: guideMatch[1] };
  const productMatch = normalized.match(/^\/products\/([^/]+)$/);
  if (productMatch && productData.catalogue.some((item) => item.public.visible && item.public.slug === productMatch[1])) {
    return { page: 'product', slug: productMatch[1] };
  }
  const solutionMatch = normalized.match(/^\/solutions\/([^/]+)$/);
  if (solutionMatch && solutions.some((item) => item.id === solutionMatch[1])) return { page: 'solution', id: solutionMatch[1] };
  const storyMatch = normalized.match(/^\/success-stories\/([^/]+)$/);
  if (storyMatch) return { page: 'story', slug: storyMatch[1] };
  return { page: 'not-found' };
}

function NotFound() {
  return <main className="not-found"><span>404</span><h1>Page not found</h1><p>The page you are looking for may have moved.</p><a className="btn btn-primary" href="/">Back to MySOS</a></main>;
}

export default function PublicApp() {
  // Sizes, fonts and colours chosen in the website manager.
  useEffect(() => watchTextStyles(), []);
  // Sections fade and rise as they are reached.
  useEffect(() => watchReveals(), []);
  // The reading line at the top, and the header tightening under it.
  useEffect(() => watchChrome(), []);
  const route = resolvePublicRoute();
  const content = route.page === 'home' ? <HomePage />
    : route.page === 'request' ? <RequestPage />
    : route.page === 'products' ? <ProductsPage />
    : route.page === 'product' ? <ProductDetailPage slug={route.slug} />
      : route.page === 'solutions' ? <SolutionsPage />
        : route.page === 'why' ? <WhyPage />
          : route.page === 'stories' ? <StoriesPage />
            : route.page === 'resources' ? <ResourcesPage />
            : route.page === 'guide' ? <ArticlePage slug={route.slug} />
            : route.page === 'story' ? <StoryDetailPage slug={route.slug} />
            : route.page === 'solution' ? <SolutionDetailPage solutionId={route.id} />
              : <NotFound />;
  return <SiteShell>{content}</SiteShell>;
}
