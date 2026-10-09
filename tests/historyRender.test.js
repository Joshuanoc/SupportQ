import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Real App initialization and accessible markup; this is SSR, not a browser test.
test('app remains renderable when browser history is corrupt or unavailable', async t => {
  const server = await createServer({server: {middlewareMode: true}, appType: 'custom'});
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    const {default: App} = await server.ssrLoadModule('/src/App.jsx');
    for (const raw of ['null', '{}', '[null]', '{broken']) {
      await t.test(`render with ${raw}`, () => {
        let writes = 0;
        Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
          getItem: () => raw, setItem: () => writes++, removeItem: () => writes++,
        }});
        const html = renderToStaticMarkup(React.createElement(App));
        assert.match(html, /Support workspace/);
        assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
        assert.match(html, /saved incident history could not be loaded/);
        assert.equal(writes, 0);
      });
    }
    await t.test('render when localStorage property is denied', () => {
      Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() {throw new Error('SYNTHETIC_PRIVATE_EXCEPTION');}});
      const html = renderToStaticMarkup(React.createElement(App));
      assert.match(html, /Support workspace/);
      assert.match(html, /Browser history is unavailable/);
      assert.doesNotMatch(html, /SYNTHETIC_PRIVATE_EXCEPTION/);
    });
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
    await server.close();
  }
});
