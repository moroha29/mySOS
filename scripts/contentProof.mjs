/*
 * Runs the whole test suite against the website's content rewritten the way
 * the portal lets the owner rewrite it.
 *
 * The publish gate is this test suite, run against his content. So any test
 * that reads his content and expects particular words, a particular count, or
 * no repetition among them is a test he can fail by editing his own website --
 * and when he does, nothing is published and all he is told is that "the check
 * on your website found a problem". It has happened over and over: the wording
 * of his homepage promises, the number of them, and two caps he renamed to the
 * same thing, which cost him a day's work on the catalogue.
 *
 * Every one of those was found by him being stopped. This is here to be
 * stopped instead. It rewrites the content as awkwardly as he legitimately
 * can -- the same name on two products, the same wording on every promise, a
 * description left empty, one far too long, quotes and other alphabets in a
 * name, two stories titled alike -- and runs the suite. A failure here is ours
 * to fix. It is never a reason to tell him to write something else.
 *
 * It does not run on his publish: his publish must stay quick, and this runs
 * the suite a second time. It runs on our pull requests, where a test that
 * pins his content is still ours and not yet his problem.
 *
 *   node scripts/contentProof.mjs            # mutate, run the suite, restore
 *   node scripts/contentProof.mjs --show     # write the mutated content and stop
 */
import { spawnSync } from 'node:child_process';
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = (name) => path.join(root, 'src', 'data', `${name}.json`);
const FILES = ['productData', 'siteContent', 'successStories', 'resources', 'solutions'];

const read = async (name) => JSON.parse(await readFile(data(name), 'utf8'));

/*
 * What he can do from the portal, all at once. Each line here is a thing that
 * has either already stopped a publish or is one slip away from it.
 */
function mutate(content) {
  const { productData, siteContent, successStories, resources, solutions } = content;
  const visible = productData.catalogue.filter((item) => item.public.visible);
  if (visible.length < 2) throw new Error('needs at least two visible products to rename');

  // Two products renamed to one name: the slip that blocked him on 3 November.
  const shared = 'CP28 Polyester Baseball Cap';
  const names = new Map([[visible[0].id, shared], [visible[1].id, shared]]);
  // A third renamed to something full of the punctuation a product name picks
  // up -- quotes, an ampersand, a middle dot, another alphabet -- and a fourth
  // left with nothing to describe it.
  if (visible[2]) names.set(visible[2].id, 'A "quoted" & <tagged> cap · 100% ポリ');
  const emptied = visible[3]?.id;
  const overlong = visible[4]?.id;

  const catalogue = productData.catalogue.map((item) => {
    const name = names.get(item.id);
    const description = item.id === emptied ? ''
      : item.id === overlong ? `${'word '.repeat(400)}end`
      : item.public.description;
    return { ...item, public: { ...item.public, description, ...(name ? { name } : {}) } };
  });

  return {
    productData: { ...productData, catalogue },
    siteContent: {
      ...siteContent,
      // Every promise reworded to the same words, and the opening line rewritten.
      homeStats: siteContent.homeStats.map((stat) => ({ ...stat, value: 'One source. Infinite solutions.' })),
      headings: { ...siteContent.headings, heroLead: 'Rewritten in his own words, on the day.' },
    },
    // Two stories, and two guides, titled alike.
    successStories: successStories.map((story, index) => (
      index < 2 ? { ...story, title: successStories[0].title } : story
    )),
    resources: {
      ...resources,
      articles: resources.articles.map((article, index) => (
        index < 2 ? { ...article, title: resources.articles[0].title } : article
      )),
    },
    solutions,
  };
}

const show = process.argv.includes('--show');
const backups = new Map(FILES.map((name) => [name, `${data(name)}.content-proof-backup`]));

const before = {};
for (const name of FILES) before[name] = await read(name);

for (const [name, backup] of backups) await copyFile(data(name), backup);

let status = 1;
try {
  const after = mutate(before);
  for (const name of FILES) await writeFile(data(name), `${JSON.stringify(after[name], null, 2)}\n`, 'utf8');

  if (show) {
    console.log('The content is rewritten in place. Restore it with:');
    for (const [name, backup] of backups) console.log(`  mv ${path.relative(root, backup)} ${path.relative(root, data(name))}`);
    process.exit(0);
  }

  console.log('Running the suite against the content rewritten the way the portal allows.\n');
  status = spawnSync('npx', ['vitest', 'run', '--reporter=dot'], { cwd: root, stdio: 'inherit', shell: true }).status ?? 1;
} finally {
  if (!show) {
    for (const [name, backup] of backups) {
      await copyFile(backup, data(name));
      await rm(backup, { force: true });
    }
  }
}

if (status === 0) {
  console.log('\nNothing he can type stops the website being published.');
} else {
  console.error(`
A test above reads the website's content and expects something particular of it.
That makes it a test the owner fails by editing his own website, and when he
does, nothing is published and he is told only that a check found a problem.

Rewrite the test to check what the site owes the content -- that a page has a
title, that a row is drawn, that a promise appears where it belongs -- and not
what the content happens to say. tests/theOwnerCannotBreakTheBuild.test.js has
the shape of it, and docs/THE_PUBLISH_GATE.md has the reasoning.`);
}
process.exit(status);
