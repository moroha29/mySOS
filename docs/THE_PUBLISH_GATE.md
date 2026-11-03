# The publish gate, and why it must never be the owner's problem

## What happens when he presses Publish

The portal does not write to the website. Pressing Publish puts his content on
a `content/mysos-job-N` branch, opens a pull request, and waits for **Check
MySOS website** — this repository's test suite and build — to pass. If it
passes, the pull request merges and the site deploys. If it fails, nothing is
published, and the portal shows him:

> The check on your website found a problem, so nothing was published and your
> website has not changed.

That sentence is all he gets, and all he can do about it is nothing. He cannot
read a CI log, and he should not have to.

## Why that has gone wrong so often

The gate runs *our* tests against *his* content. So any test that reads the
content and expects something particular of it is a test he fails by editing
his own website. Each of these stopped a publish:

| What he did | What failed |
| --- | --- |
| Reworded a homepage promise | Three tests held the exact wording |
| Removed a promise | The count of them was written out in a test |
| Renamed two caps to `CP28 Polyester Baseball Cap` | Every page had to have a title no other page had |

The last one cost him a day's work on the catalogue. He had been renaming caps
to supplier codes, typed `CP28` onto a second one by mistake, and from where he
sat the website simply refused him — with nothing on screen to say which two
pages, or which name, or that a name was the problem at all.

None of those was a problem with his content. All three were tests asserting
facts about content that is his to change.

## The rule

**A test may check what the site owes the content. It may not check what the
content says.**

Owed by the site, and fair to check:

- every page gets a title taken from its own name
- a page's description is the line that page already opens with
- the row of promises is drawn, and each promise appears where it belongs
- every page has an address of its own

Said by the content, and not ours to check:

- the words of a promise, a heading, a product name or a description
- how many promises, products, categories or stories there are
- that no two of them repeat

Addresses are the exception: two pages at one address means one of them is not
written, so that one is still checked. Slugs are the portal's to keep apart,
and it does — a product added twice becomes `-2`, never the same path.

Build-time checks follow the same rule. `scripts/prerender.mjs` used to stop
the build on a repeated title or a page with no description. Both are now said
once at the end of the build, under `worth a look:`, and the pages are written.

## What enforces it

Two things, and neither of them runs on his publish.

`tests/theOwnerCannotBreakTheBuild.test.js` takes the real content, rewrites it
the way the portal allows — a name on two products, every promise worded alike,
a description emptied, one far too long, quotes and other alphabets in a name,
two stories titled alike, one product, no products — and asks only that the
pages still come out.

`npm run check:content-proof` (`scripts/contentProof.mjs`) does the same
rewriting to the content files on disk and runs **the whole suite** against it,
then puts the content back. This is the one that catches a test somebody else
wrote without reading this page. It runs as its own job on our pull requests,
and is skipped on `content/` branches: his publish must stay quick, and a
failure of ours must never become the thing that stops him publishing.

If it fails, the fix is to the test, never to his content.

## Telling him instead

A repeated product name is still worth knowing about — two pages with the same
title compete with each other in a search result. So the portal says so, beside
the products, where he can settle it, phrased as something to look at rather
than something to fix before he may publish. That is the only acceptable place
for this kind of advice: in his hands, after the publish has gone through.
