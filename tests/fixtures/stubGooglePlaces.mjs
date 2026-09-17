// Loaded with `node --import` by tests/googleReviews.test.js: answers the
// review refresh's Places calls without the network. STUB_PLACES picks the
// search results:
//   own        MySOS's listing comes back for the first search
//   later      it only comes back for "My Source of Solutions Singapore"
//   sab        it only comes back when service-area businesses are included
//   lookalike  it never comes back
const mode = process.env.STUB_PLACES ?? 'own';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const lookalike = { id: 'ChIJ-other', displayName: { text: 'Source Solutions Pte Ltd' }, formattedAddress: 'Elsewhere, Singapore', googleMapsUri: 'https://maps.google.com/?cid=111' };
const own = { id: 'ChIJ-mysos', displayName: { text: 'My Source of Solutions' }, googleMapsUri: 'https://maps.google.com/?cid=15290863019161496116' };

globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  if (href.endsWith('/places:searchText')) {
    const body = JSON.parse(init.body);
    console.log(`STUB search ${body.textQuery}${body.includePureServiceAreaBusinesses ? ' (with service-area businesses)' : ''}`);
    const found = mode === 'own'
      || (mode === 'later' && body.textQuery === 'My Source of Solutions Singapore')
      || (mode === 'sab' && body.includePureServiceAreaBusinesses === true);
    return json({ places: found ? [lookalike, own] : [lookalike] });
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
