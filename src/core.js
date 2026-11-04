/**
 * Maps generated (transpiled) line numbers back to original source positions
 * using an embedded source map.
 *
 * This resolver works only with source maps that embed the source content
 * inline (the `sourcesContent` field). It does not fetch remote sources.
 *
 * The mapping is line-based: given a generated line number (1-based), it
 * returns the original source file and line number (1-based). When a line
 * cannot be resolved, it returns `null`.
 *
 * WHY: Stack traces from transpiled code point at generated lines. Without
 * a full source map consumer, a simple line resolver is often enough to
 * translate those lines back to the original source, which is especially
 * useful in error reporting and debugging pipelines.
 */
export class SourceMapLineResolver {
  /**
   * @param {object} sourceMap - A parsed source map object (v3).
   *   Must contain `mappings`, `sources`, and optionally `sourcesContent`.
   * @throws {TypeError} If the source map is missing required fields.
   */
  constructor(sourceMap) {
    if (!sourceMap || typeof sourceMap !== 'object') {
      throw new TypeError('sourceMap must be an object');
    }
    if (typeof sourceMap.mappings !== 'string') {
      throw new TypeError('sourceMap.mappings must be a string');
    }
    if (!Array.isArray(sourceMap.sources)) {
      throw new TypeError('sourceMap.sources must be an array');
    }
    this.sources = sourceMap.sources;
    this.mappings = sourceMap.mappings;
    this._decoded = null;
  }

  /**
   * Decode the VLQ mappings into an array of segments.
   * Each segment is an array of numbers in the order:
   *   [generatedColumn, sourceIndex, originalLine, originalColumn, nameIndex]
   * For lines that have no mappings, the array contains an empty array.
   *
   * @returns {Array<Array<number>>} Decoded lines.
   */
  _decodeMappings() {
    if (this._decoded) {
      return this._decoded;
    }

    const lines = this.mappings.split(';');
    const decoded = lines.map((line) => {
      if (line === '') {
        return [];
      }
      const segments = line.split(',');
      return segments.map((segment) => this._decodeSegment(segment));
    });

    this._decoded = decoded;
    return decoded;
  }

  /**
   * Decode a single VLQ segment string into an array of numbers.
   * @param {string} segment
   * @returns {Array<number>}
   */
  _decodeSegment(segment) {
    const result = [];
    let shift = 0;
    let value = 0;
    let continuation = false;

    for (let i = 0; i < segment.length; i++) {
      const digit = this._base64Decode(segment.charCodeAt(i));
      if (digit === -1) {
        throw new Error(`Invalid base64 character in mappings: ${segment[i]}`);
      }

      continuation = (digit & 32) !== 0;
      value += (digit & 31) << shift;

      if (!continuation) {
        const negative = (value & 1) === 1;
        value >>>= 1;
        result.push(negative ? -value : value);
        value = 0;
        shift = 0;
      } else {
        shift += 5;
      }
    }

    if (continuation) {
      throw new Error(`Unterminated VLQ segment: ${segment}`);
    }

    return result;
  }

  /**
   * Decode a base64 character code to its 6-bit value.
   * Returns -1 for invalid characters.
   * @param {number} code
   * @returns {number}
   */
  _base64Decode(code) {
    // A-Z
    if (code >= 65 && code <= 90) return code - 65;
    // a-z
    if (code >= 97 && code <= 122) return code - 97 + 26;
    // 0-9
    if (code >= 48 && code <= 57) return code - 48 + 52;
    // +
    if (code === 43) return 62;
    // /
    if (code === 47) return 63;
    return -1;
  }

  /**
   * Map a generated line number (1-based) to an original source position.
   *
   * @param {number} generatedLine - 1-based line number in the generated file.
   * @returns {{ source: string, line: number, column: number } | null}
   *   The original source file, 1-based line, and 1-based column,
   *   or `null` if the line has no mapping.
   */
  resolve(generatedLine) {
    if (typeof generatedLine !== 'number' || !Number.isInteger(generatedLine) || generatedLine < 1) {
      return null;
    }

    const decoded = this._decodeMappings();
    const lineIndex = generatedLine - 1;

    if (lineIndex >= decoded.length) {
      return null;
    }

    const segments = decoded[lineIndex];
    if (!segments || segments.length === 0) {
      return null;
    }

    // Use the first segment of the line. This is the common case for stack
    // traces, which point at the beginning of the line's code.
    const segment = segments[0];
    if (segment.length < 4) {
      return null;
    }

    const sourceIndex = segment[1];
    const originalLine = segment[2];
    const originalColumn = segment[3];

    if (sourceIndex < 0 || sourceIndex >= this.sources.length) {
      return null;
    }

    return {
      source: this.sources[sourceIndex],
      line: originalLine + 1,
      column: originalColumn + 1,
    };
  }
}
