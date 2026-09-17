// Loaded with `node --import` by tests/googleReviews.test.js: answers the
// review refresh's Places calls without the network. STUB_PLACES picks the
// search results: "own" includes MySOS's listing, "lookalike" does not.
const mode = process.env.STUB_PLACES ?? 'own';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const lookalike = { id: 'ChIJ-other', displayName: { text: 'Source Solutions Pte Ltd' }, formattedAddress: 'Elsewhere, Singapore', googleMapsUri: 'https://maps.google.com/?cid=111' };
const own = { id: 'ChIJ-mysos', displayName: { text: 'My Source of Solutions' }, formattedAddress: 'Singapore', googleMapsUri: 'https://maps.google.com/?cid=15290863019161496116' };

globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.endsWith('/places:searchText')) {
    console.log(`STUB search ${JSON.parse(init.body).textQuery}`);
    return json({ places: mode === 'own' ? [lookalike, own] : [lookalike] });
  }
  if (href.includes('/places/')) {
    console.log(`STUB details ${decodeURIComponent(new URL(href).pathname.split('/').pop())}`);
    return json({
      displayName: { text: 'My Source of Solutions' },
      rating: 4.9,
      userRatingCount: 57,
      reviews: [{ name: 'places/ChIJ-mysos/reviews/1', rating: 5, text: { text: 'Great service.' }, authorAttribution: { displayName: 'Jane T' }, publishTime: '2026-08-02T00:00:00Z' }],
    });
  }
  throw new Error(`unexpected request to ${href}`);
};
