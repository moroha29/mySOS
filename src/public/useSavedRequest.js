import { useEffect, useState } from 'react';
import { readSavedRequest, SAVED_REQUEST_EVENT, savedLineCount } from '../utils/savedRequest';

/*
 * How many products are waiting in this browser's request.
 *
 * Counted after the page has loaded, never during the first render: the pages
 * are drawn ahead of time on a machine with no browser storage, so a count read
 * while rendering would disagree with what the server drew.
 *
 * It follows changes made on this page (through the request's own event) and in
 * another tab (through the browser's storage event).
 */
export default function useSavedRequest() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => setCount(savedLineCount(readSavedRequest()));
    read();
    window.addEventListener(SAVED_REQUEST_EVENT, read);
    window.addEventListener('storage', read);
    // Coming back to a tab that was left open on an old view.
    window.addEventListener('pageshow', read);
    return () => {
      window.removeEventListener(SAVED_REQUEST_EVENT, read);
      window.removeEventListener('storage', read);
      window.removeEventListener('pageshow', read);
    };
  }, []);

  return count;
}
