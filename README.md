# source-map-line-resolver

Maps transpiled stack trace line numbers back to their original source positions using an embedded source map.

```js
import { SourceMapLineResolver } from 'source-map-line-resolver';

const sourceMap = {
  version: 3,
  sources: ['original.js'],
  mappings: 'AAAA',
};

const resolver = new SourceMapLineResolver(sourceMap);
const position = resolver.resolve(1);
console.log(position); // { source: 'original.js', line: 1, column: 1 }
```

## Why

When JavaScript is transpiled, stack traces reference line numbers in the generated file. Mapping those lines back to the original source usually requires a full source map consumer, which can be heavy and pulls in dependencies. This library provides a focused, dependency-free way to resolve a single generated line to its original source file and line. The trade-off is that it only resolves the first mapping on a line and does not handle column-level lookups or remote sources.

## Edge cases

- If a generated line has no mapping, `resolve` returns `null`.
- If the source map contains malformed VLQ segments, `resolve` throws an error. This is intentional: silent failure would hide broken source maps.
- The resolver uses the first segment of a line, which is sufficient for typical stack traces but may not be precise for minified code with multiple statements per line.

## API

### `new SourceMapLineResolver(sourceMap)`

Creates a resolver from a parsed source map object. The object must have `mappings` (string) and `sources` (array). Throws `TypeError` if these are missing or invalid.

### `resolver.resolve(generatedLine)`

Takes a 1-based generated line number and returns an object `{ source, line, column }` with the original source file, 1-based line, and 1-based column, or `null` if the line cannot be resolved.
