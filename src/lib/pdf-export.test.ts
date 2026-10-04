import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import data from '../data/rules.json';
import { blankCharacter, createArchive } from '../data/samples';
import { characterHTML } from './transfer';
import type { Character, RuleData } from '../types';

const rules = data as RuleData;
const normalize = (text: string) => text.normalize('NFKC').replace(/\s/g, '');
let browser: Browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function exportPDF(character: Character, definitions = rules, width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.setContent(characterHTML(character, definitions));
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    const wrappedNumbers = await page.evaluate(() =>
      [...document.querySelectorAll('.skill-columns td:nth-child(n+2), .skill-columns th:nth-child(n+2)')]
        .filter(cell => {
          const range = document.createRange();
          range.selectNodeContents(cell);
          return range.getClientRects().length > 1;
        }).map(cell => cell.textContent)
    );
    assert.deepEqual(wrappedNumbers, [], 'skill values and numeric headings must remain on one line');
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    // Keep actual browser output available for visual review and failed CI runs.
    await mkdir('test-results/pdf', { recursive: true });
    await writeFile(`test-results/pdf/${character.id}-${character.rulesetId}-${width}.pdf`, pdf);
    const loadingTask = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
    const document = await loadingTask.promise;
    try {
      const pages: string[] = [];
      for (let number = 1; number <= document.numPages; number++) {
        const pdfPage = await document.getPage(number);
        const content = await pdfPage.getTextContent();
        pages.push(normalize(content.items.map(item => 'str' in item ? item.str : '').join('')));
        const { width: pageWidth, height: pageHeight } = pdfPage.getViewport({ scale: 1 });
        assert.ok(Math.abs(pageWidth - 595.28) < 1 && Math.abs(pageHeight - 841.89) < 1, 'PDF must use A4');
      }
      return pages;
    } finally {
      await loadingTask.destroy();
    }
  } finally {
    await page.close();
  }
}

function assertFront(pages: string[]) {
  assert.match(pages[0], /第一面·属性与技能/);
  assert.match(pages[0], /职业点数.*兴趣点数.*此为个人使用的非官方人物卡。/, 'first-page footer must not spill onto another page');
  assert.match(pages[1], /第二面·背景与装备/, 'backstory must start on the second physical page');
}

for (const era of rules.rulesets) {
  test(`A4 PDF keeps the complete front on one page: ${era.id}`, async () => {
    const character = { ...blankCharacter(era.id), id: 'blank', portrait: '' };
    const pages = await exportPDF(character);
    assertFront(pages);
    assert.equal(pages.length, 2, 'ordinary investigators must export exactly two physical pages');
    for (const skill of rules.skills.filter(skill => !skill.eras?.length || skill.eras.includes(era.id))) {
      const alias = era.skillAliases?.[skill.id];
      const label = alias ? rules.skills.find(target => target.id === alias)?.name ?? alias : skill.name;
      assert.ok(pages[0].includes(normalize(label)), `missing front-page skill: ${label}`);
    }
  });
}

for (const character of createArchive().characters) {
  character.portrait = '';
  test(`sample PDF stays on two pages: ${character.id}`, async () => {
    if (character.id === 'sample-edmund') {
      const portrait = await readFile(new URL('../../public/investigator.png', import.meta.url));
      character.portrait = `data:image/png;base64,${portrait.toString('base64')}`;
    }
    const pages = await exportPDF(character);
    assertFront(pages);
    assert.equal(pages.length, 2);
    for (const item of character.inventory) assert.ok(pages[1].includes(normalize(item.name)));
  });
}

test('printing from a mobile viewport still uses the A4 front layout', async () => {
  const pages = await exportPDF({ ...blankCharacter('gaslight'), id: 'mobile' }, rules, 390);
  assertFront(pages);
  assert.equal(pages.length, 2);
});

test('many custom skills may add pages without dropping any skill or the front footer', async () => {
  const definitions = structuredClone(rules);
  const skills = Array.from({ length: 90 }, (_, index) => ({
    id: `custom-${index}`, name: `原创技能 CUSTOM${index.toString().padStart(3, '0')}`,
    english: '', category: '原创', base: 5,
  }));
  definitions.skills.push(...skills);
  const pages = await exportPDF({ ...blankCharacter(), id: 'custom-skills' }, definitions);
  assert.ok(pages.length > 2, 'large custom skill lists must paginate instead of clipping');
  const back = pages.findIndex(text => text.includes('第二面·背景与装备'));
  assert.ok(back > 0);
  const front = pages.slice(0, back).join('');
  for (const skill of skills) assert.ok(front.includes(normalize(skill.name)), `missing custom skill: ${skill.name}`);
  assert.match(front, /此为个人使用的非官方人物卡。/);
});

test('long backstory and equipment lists paginate with every entry and the final footer intact', async () => {
  const character = { ...blankCharacter(), id: 'long-backstory' };
  character.backstory.notes = Array.from({ length: 120 }, (_, index) => `调查记录 NOTE${index.toString().padStart(3, '0')}：调查员继续记录线索。`).join('\n');
  character.inventory = Array.from({ length: 70 }, (_, index) => ({
    id: `item-${index}`, definitionId: 'notebook', name: `装备 ITEM${index.toString().padStart(3, '0')}`,
    quantity: 1, notes: '随身携带的调查用品。',
  }));
  const pages = await exportPDF(character);
  assertFront(pages);
  assert.ok(pages.length > 2);
  const back = pages.slice(1).join('');
  for (let index = 0; index < 120; index++) assert.ok(back.includes(`NOTE${index.toString().padStart(3, '0')}`), `missing note ${index}`);
  for (const item of character.inventory) assert.ok(back.includes(normalize(item.name)), `missing equipment ${item.name}`);
  assert.match(pages.at(-1)!, /档案编号:long-backstory.*规则资料版本:/);
});
