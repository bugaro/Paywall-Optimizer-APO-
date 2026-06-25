const realSetImmediate = globalThis.setImmediate;

if (process.env.NODE_ENV === 'test' && realSetImmediate) {
  // Define a wrapper that schedules the callback via process.nextTick
  // process.nextTick runs outside Sinon fake timers and yields control immediately.
  const wrapper = function (cb: (...args: unknown[]) => void, ...args: unknown[]) {
    process.nextTick(() => cb(...args));
  };

  // Copy standard promisification symbol to ensure promisify(setImmediate) works
  const promisifySymbol = Symbol.for('nodejs.util.promisify.custom');
  if ((realSetImmediate as unknown as Record<symbol, unknown>)[promisifySymbol]) {
    Object.defineProperty(wrapper, promisifySymbol, {
      value: (realSetImmediate as unknown as Record<symbol, unknown>)[promisifySymbol],
      configurable: true,
      writable: true,
    });
  }

  Object.defineProperty(globalThis, 'setImmediate', {
    get() {
      // Always return our configurable wrapper that calls the real setImmediate
      return wrapper;
    },
    set(val) {
      // Ignore Vitest's fake timer assignment so that setImmediate always bypasses the freeze
    },
    configurable: true,
  });
}
