// tests/e2e/specs/02.novel-data.spec.js
// Tests 4–7: novel data round-trip, cleanup (stale/fresh), gender override.
const { test, expect } = require('../fixtures/extension.fixture');
const { makeSendBgMessage } = require('../helpers/background');

test.describe('novel data & character management', () => {
  test('novel character data can be stored and retrieved via messages', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;
    const send = makeSendBgMessage(msgPage);
    const novelId = 'e2e_test__round_trip';

    const stored = await send({
      action: 'updateNovelData',
      novelId,
      chars: {
        Alice: { name: 'Alice', gender: 'f', confidence: 0.9, appearances: 10, evidences: ['she smiled'] },
        Bob:   { name: 'Bob',   gender: 'm', confidence: 0.8, appearances: 5,  evidences: ['he ran'] },
      },
      chapterNumber: 1,
    });
    expect(stored.status).toBe('ok');

    const retrieved = await send({ action: 'getNovelData', novelId });
    expect(retrieved.status).toBe('ok');
    expect(retrieved.characterMap['Alice'].gender).toBe('f');
    expect(retrieved.characterMap['Bob'].gender).toBe('m');
    expect(retrieved.enhancedChapters).toContainEqual({ chapterNumber: 1 });

    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, novelId);
  });

  test('periodic cleanup removes novels with lastAccess > 90 days ago', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;
    const staleId = 'e2e_test__stale_91d';
    const now = Date.now();

    await background.evaluate(({ id, ts }) => {
      novelCharacterMaps[id] = {
        chars: { 0: { name: 'Old Hero', gender: 'm', appearances: 3, evidences: [] } },
        chaps: [1],
        style: null,
        lastAccess: ts,
      };
    }, { id: staleId, ts: now - 91 * 24 * 60 * 60 * 1000 });

    await background.evaluate(() => runPeriodicCleanup());
    await msgPage.waitForTimeout(800);

    const stored = await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.local.get('novelCharacterMaps', (d) => resolve(d.novelCharacterMaps ?? {}))
      )
    );
    expect(Object.keys(stored)).not.toContain(staleId);
  });

  test('periodic cleanup keeps novels with lastAccess within 90 days', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;
    const freshId = 'e2e_test__fresh_30d';
    const now = Date.now();

    await background.evaluate(({ id, ts }) => {
      novelCharacterMaps[id] = {
        chars: { 0: { name: 'Active Hero', gender: 'f', appearances: 5, evidences: [] } },
        chaps: [1, 2],
        style: null,
        lastAccess: ts,
      };
    }, { id: freshId, ts: now - 30 * 24 * 60 * 60 * 1000 });

    await background.evaluate(() => runPeriodicCleanup());
    await msgPage.waitForTimeout(800);

    const preserved = await background.evaluate((id) => id in novelCharacterMaps, freshId);
    expect(preserved).toBe(true);

    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, freshId);
  });

  test('_isProcessing flag is reset after an ollamaRequest error', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;

    // Send a request with an empty model — triggers "Invalid model specification" inside the
    // storage callback after _isProcessing is set to true.
    const resp = await msgPage.evaluate(() =>
      new Promise((resolve) =>
        chrome.runtime.sendMessage(
          { action: 'ollamaRequest', data: { prompt: 'hello', model: '' } },
          resolve
        )
      )
    );
    expect(resp).toHaveProperty('error');

    const flagAfterError = await background.evaluate(() => _isProcessing);
    expect(flagAfterError).toBe(false);
  });

  test('updateNovelData trims characters to MAX_CHARS_PER_NOVEL when over the limit', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;
    const send = makeSendBgMessage(msgPage);
    const novelId = 'e2e_test__char_cap';

    // 90 chars with appearances = index+1 so trimming order is deterministic
    const chars = {};
    for (let i = 0; i < 90; i++) {
      chars[`char_${i}`] = { name: `Character${i}`, gender: 'm', confidence: 0.7, appearances: i + 1 };
    }

    const stored = await send({ action: 'updateNovelData', novelId, chars });
    expect(stored.status).toBe('ok');

    const retrieved = await send({ action: 'getNovelData', novelId });
    expect(retrieved.status).toBe('ok');
    expect(Object.keys(retrieved.characterMap).length).toBeLessThanOrEqual(80);
    expect(retrieved.characterMap['Character89']).toBeDefined();  // appearances: 90, kept
    expect(retrieved.characterMap['Character0']).toBeUndefined(); // appearances:  1, trimmed

    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, novelId);
  });

  test('character gender can be manually overridden via message', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;
    const send = makeSendBgMessage(msgPage);
    const novelId = 'e2e_test__gender_override';

    await background.evaluate((id) => {
      novelCharacterMaps[id] = {
        chars: { 0: { name: 'Jordan', gender: 'u', confidence: 0.5, appearances: 3, evidences: [] } },
        chaps: [1],
        style: null,
        lastAccess: Date.now(),
      };
    }, novelId);

    const result = await send({
      action: 'updateCharacterGender',
      novelId,
      charId: '0',
      newGender: 'female',
      isManualOverride: true,
    });
    expect(result.status).toBe('ok');

    const char = await background.evaluate((id) => novelCharacterMaps[id].chars[0], novelId);
    expect(char.gender).toBe('f');
    expect(char.manualOverride).toBe(true);
    expect(char.confidence).toBe(1.0);

    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, novelId);
  });
});
