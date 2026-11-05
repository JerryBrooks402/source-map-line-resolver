import test from 'node:test';
import assert from 'node:assert/strict';
import { SourceMapLineResolver } from '../src/index.js';

test('resolves a simple mapping', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  const result = resolver.resolve(1);
  assert.deepEqual(result, { source: 'original.js', line: 1, column: 1 });
});

test('resolves a line with multiple segments using the first segment', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA,CAAC',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  const result = resolver.resolve(1);
  assert.deepEqual(result, { source: 'original.js', line: 1, column: 1 });
});

test('returns null for a line with no mappings', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA;;AACA',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.equal(resolver.resolve(2), null);
});

test('returns null for out-of-range line', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.equal(resolver.resolve(2), null);
});

test('returns null for invalid input', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.equal(resolver.resolve(0), null);
  assert.equal(resolver.resolve(-1), null);
  assert.equal(resolver.resolve(1.5), null);
  assert.equal(resolver.resolve('1'), null);
  assert.equal(resolver.resolve(null), null);
});

test('throws on invalid source map', () => {
  assert.throws(() => new SourceMapLineResolver(null), TypeError);
  assert.throws(() => new SourceMapLineResolver({}), TypeError);
  assert.throws(() => new SourceMapLineResolver({ mappings: 'AAAA' }), TypeError);
  assert.throws(() => new SourceMapLineResolver({ mappings: 'AAAA', sources: 'not-array' }), TypeError);
});

test('handles multi-line mappings with source index changes', () => {
  const sourceMap = {
    version: 3,
    sources: ['a.js', 'b.js'],
    mappings: 'AAAA;ACAA',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.deepEqual(resolver.resolve(1), { source: 'a.js', line: 1, column: 1 });
  assert.deepEqual(resolver.resolve(2), { source: 'b.js', line: 1, column: 1 });
});

test('handles empty mappings string', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: '',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.equal(resolver.resolve(1), null);
});

test('handles mappings with trailing semicolons', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AAAA;',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.deepEqual(resolver.resolve(1), { source: 'original.js', line: 1, column: 1 });
  assert.equal(resolver.resolve(2), null);
});

test('throws on invalid base64 character in mappings', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'AA!A',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.throws(() => resolver.resolve(1), /Invalid base64 character/);
});

test('throws on unterminated VLQ segment', () => {
  const sourceMap = {
    version: 3,
    sources: ['original.js'],
    mappings: 'g',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.throws(() => resolver.resolve(1), /Unterminated VLQ segment/);
});

test('returns null when source index is out of bounds', () => {
  const sourceMap = {
    version: 3,
    sources: [],
    mappings: 'AAAA',
  };
  const resolver = new SourceMapLineResolver(sourceMap);
  assert.equal(resolver.resolve(1), null);
});
