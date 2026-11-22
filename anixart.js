/**
 * Anixart Plugin for Lampa (TV & webOS)
 * Native Lampa design, full D-pad remote support, latest feed, and instant playback
 */
(function () {
    'use strict';

    if (window.plugin_anixart_installed) return;
    window.plugin_anixart_installed = true;

    // --- Embedded QR Generator (uqr) ---
    var QrCodeDataType = /* @__PURE__ */ ((QrCodeDataType2) => {
  QrCodeDataType2[QrCodeDataType2["Border"] = -1] = "Border";
  QrCodeDataType2[QrCodeDataType2["Data"] = 0] = "Data";
  QrCodeDataType2[QrCodeDataType2["Function"] = 1] = "Function";
  QrCodeDataType2[QrCodeDataType2["Position"] = 2] = "Position";
  QrCodeDataType2[QrCodeDataType2["Timing"] = 3] = "Timing";
  QrCodeDataType2[QrCodeDataType2["Alignment"] = 4] = "Alignment";
  return QrCodeDataType2;
})(QrCodeDataType || {});

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const LOW = [0, 1];
const MEDIUM = [1, 0];
const QUARTILE = [2, 3];
const HIGH = [3, 2];
const EccMap = {
  L: LOW,
  M: MEDIUM,
  Q: QUARTILE,
  H: HIGH
};
const NUMERIC_REGEX = /^[0-9]*$/;
const ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/;
const ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const MIN_VERSION = 1;
const MAX_VERSION = 40;
const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;
const ECC_CODEWORDS_PER_BLOCK = [
  // Version: (note that index 0 is for padding, and is set to an illegal value)
  // 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // Low
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  // Medium
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // Quartile
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  // High
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  // Version: (note that index 0 is for padding, and is set to an illegal value)
  // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  // Low
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  // Medium
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  // Quartile
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  // High
];
class QrCode {
  /* -- Constructor (low level) and fields -- */
  // Creates a new QR Code with the given version number,
  // error correction level, data codeword bytes, and mask number.
  // This is a low-level API that most users should not use directly.
  // A mid-level API is the encodeSegments() function.
  constructor(version, ecc, dataCodewords, msk) {
    this.version = version;
    this.ecc = ecc;
    /* -- Fields -- */
    // The width and height of this QR Code, measured in modules, between
    // 21 and 177 (inclusive). This is equal to version * 4 + 17.
    __publicField(this, "size");
    // The index of the mask pattern used in this QR Code, which is between 0 and 7 (inclusive).
    // Even if a QR Code is created with automatic masking requested (mask = -1),
    // the resulting object still has a mask value between 0 and 7.
    __publicField(this, "mask");
    // The modules of this QR Code (false = light, true = dark).
    // Immutable after constructor finishes. Accessed through getModule().
    __publicField(this, "modules", []);
    __publicField(this, "types", []);
    if (version < MIN_VERSION || version > MAX_VERSION)
      throw new RangeError("Version value out of range");
    if (msk < -1 || msk > 7)
      throw new RangeError("Mask value out of range");
    this.size = version * 4 + 17;
    const row = Array.from({ length: this.size }, () => false);
    for (let i = 0; i < this.size; i++) {
      this.modules.push(row.slice());
      this.types.push(row.map(() => 0));
    }
    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);
    if (msk === -1) {
      let minPenalty = 1e9;
      for (let i = 0; i < 8; i++) {
        this.applyMask(i);
        this.drawFormatBits(i);
        const penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          msk = i;
          minPenalty = penalty;
        }
        this.applyMask(i);
      }
    }
    this.mask = msk;
    this.applyMask(msk);
    this.drawFormatBits(msk);
  }
  /* -- Accessor methods -- */
  // Returns the color of the module (pixel) at the given coordinates, which is false
  // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
  // If the given coordinates are out of bounds, then false (light) is returned.
  getModule(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x];
  }
  /* -- Private helper methods for constructor: Drawing function modules -- */
  // Reads this object's version field, and draws and marks all function modules.
  drawFunctionPatterns() {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0, QrCodeDataType.Timing);
      this.setFunctionModule(i, 6, i % 2 === 0, QrCodeDataType.Timing);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);
    const alignPatPos = this.getAlignmentPatternPositions();
    const numAlign = alignPatPos.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (!(i === 0 && j === 0 || i === 0 && j === numAlign - 1 || i === numAlign - 1 && j === 0))
          this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
      }
    }
    this.drawFormatBits(0);
    this.drawVersion();
  }
  // Draws two copies of the format bits (with its own error correction code)
  // based on the given mask and this object's error correction level field.
  drawFormatBits(mask) {
    const data = this.ecc[1] << 3 | mask;
    let rem = data;
    for (let i = 0; i < 10; i++)
      rem = rem << 1 ^ (rem >>> 9) * 1335;
    const bits = (data << 10 | rem) ^ 21522;
    for (let i = 0; i <= 5; i++)
      this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++)
      this.setFunctionModule(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++)
      this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++)
      this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, this.size - 8, true);
  }
  // Draws two copies of the version bits (with its own error correction code),
  // based on this object's version field, iff 7 <= version <= 40.
  drawVersion() {
    if (this.version < 7)
      return;
    let rem = this.version;
    for (let i = 0; i < 12; i++)
      rem = rem << 1 ^ (rem >>> 11) * 7973;
    const bits = this.version << 12 | rem;
    for (let i = 0; i < 18; i++) {
      const color = getBit(bits, i);
      const a = this.size - 11 + i % 3;
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, color);
      this.setFunctionModule(b, a, color);
    }
  }
  // Draws a 9*9 finder pattern including the border separator,
  // with the center module at (x, y). Modules can be out of bounds.
  drawFinderPattern(x, y) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size)
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4, QrCodeDataType.Position);
      }
    }
  }
  // Draws a 5*5 alignment pattern, with the center module
  // at (x, y). All modules must be in bounds.
  drawAlignmentPattern(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(
          x + dx,
          y + dy,
          Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
          QrCodeDataType.Alignment
        );
      }
    }
  }
  // Sets the color of a module and marks it as a function module.
  // Only used by the constructor. Coordinates must be in bounds.
  setFunctionModule(x, y, isDark, type = QrCodeDataType.Function) {
    this.modules[y][x] = isDark;
    this.types[y][x] = type;
  }
  /* -- Private helper methods for constructor: Codewords and masking -- */
  // Returns a new byte string representing the given data with the appropriate error correction
  // codewords appended to it, based on this object's version and error correction level.
  addEccAndInterleave(data) {
    const ver = this.version;
    const ecl = this.ecc;
    if (data.length !== getNumDataCodewords(ver, ecl))
      throw new RangeError("Invalid argument");
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecl[0]][ver];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl[0]][ver];
    const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - rawCodewords % numBlocks;
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const blocks = [];
    const rsDiv = reedSolomonComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
      k += dat.length;
      const ecc = reedSolomonComputeRemainder(dat, rsDiv);
      if (i < numShortBlocks)
        dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const result = [];
    for (let i = 0; i < blocks[0].length; i++) {
      blocks.forEach((block, j) => {
        if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks)
          result.push(block[i]);
      });
    }
    return result;
  }
  // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
  // data area of this QR Code. Function modules need to be marked off before this is called.
  drawCodewords(data) {
    if (data.length !== Math.floor(getNumRawDataModules(this.version) / 8))
      throw new RangeError("Invalid argument");
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6)
        right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = (right + 1 & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.types[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }
  // XORs the codeword modules in this QR Code with the given mask pattern.
  // The function modules must be marked and the codeword bits must be drawn
  // before masking. Due to the arithmetic of XOR, calling applyMask() with
  // the same mask value a second time will undo the mask. A final well-formed
  // QR Code needs exactly one (not zero, two, etc.) mask applied.
  applyMask(mask) {
    if (mask < 0 || mask > 7)
      throw new RangeError("Mask value out of range");
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = x * y % 2 + x * y % 3 === 0;
            break;
          case 6:
            invert = (x * y % 2 + x * y % 3) % 2 === 0;
            break;
          case 7:
            invert = ((x + y) % 2 + x * y % 3) % 2 === 0;
            break;
          default:
            throw new Error("Unreachable");
        }
        if (!this.types[y][x] && invert)
          this.modules[y][x] = !this.modules[y][x];
      }
    }
  }
  // Calculates and returns the penalty score based on state of this QR Code's current modules.
  // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
  getPenaltyScore() {
    let result = 0;
    for (let y = 0; y < this.size; y++) {
      let runColor = false;
      let runX = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < this.size; x++) {
        if (this.modules[y][x] === runColor) {
          runX++;
          if (runX === 5)
            result += PENALTY_N1;
          else if (runX > 5)
            result++;
        } else {
          this.finderPenaltyAddHistory(runX, runHistory);
          if (!runColor)
            result += this.finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
          runColor = this.modules[y][x];
          runX = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * PENALTY_N3;
    }
    for (let x = 0; x < this.size; x++) {
      let runColor = false;
      let runY = 0;
      const runHistory = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < this.size; y++) {
        if (this.modules[y][x] === runColor) {
          runY++;
          if (runY === 5)
            result += PENALTY_N1;
          else if (runY > 5)
            result++;
        } else {
          this.finderPenaltyAddHistory(runY, runHistory);
          if (!runColor)
            result += this.finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
          runColor = this.modules[y][x];
          runY = 1;
        }
      }
      result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * PENALTY_N3;
    }
    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const color = this.modules[y][x];
        if (color === this.modules[y][x + 1] && color === this.modules[y + 1][x] && color === this.modules[y + 1][x + 1])
          result += PENALTY_N2;
      }
    }
    let dark = 0;
    for (const row of this.modules)
      dark = row.reduce((sum, color) => sum + (color ? 1 : 0), dark);
    const total = this.size * this.size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += k * PENALTY_N4;
    return result;
  }
  /* -- Private helper functions -- */
  // Returns an ascending list of positions of alignment patterns for this version number.
  // Each position is in the range [0,177), and are used on both the x and y axes.
  // This could be implemented as lookup table of 40 variable-length lists of integers.
  getAlignmentPatternPositions() {
    if (this.version === 1) {
      return [];
    } else {
      const numAlign = Math.floor(this.version / 7) + 2;
      const step = this.version === 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
      const result = [6];
      for (let pos = this.size - 7; result.length < numAlign; pos -= step)
        result.splice(1, 0, pos);
      return result;
    }
  }
  // Can only be called immediately after a light run is added, and
  // returns either 0, 1, or 2. A helper function for getPenaltyScore().
  finderPenaltyCountPatterns(runHistory) {
    const n = runHistory[1];
    const core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 && runHistory[4] === n && runHistory[5] === n;
    return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
  }
  // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
  finderPenaltyTerminateAndCount(currentRunColor, currentRunLength, runHistory) {
    if (currentRunColor) {
      this.finderPenaltyAddHistory(currentRunLength, runHistory);
      currentRunLength = 0;
    }
    currentRunLength += this.size;
    this.finderPenaltyAddHistory(currentRunLength, runHistory);
    return this.finderPenaltyCountPatterns(runHistory);
  }
  // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
  finderPenaltyAddHistory(currentRunLength, runHistory) {
    if (runHistory[0] === 0)
      currentRunLength += this.size;
    runHistory.pop();
    runHistory.unshift(currentRunLength);
  }
}
function appendBits(val, len, bb) {
  if (len < 0 || len > 31 || val >>> len !== 0)
    throw new RangeError("Value out of range");
  for (let i = len - 1; i >= 0; i--)
    bb.push(val >>> i & 1);
}
function getBit(x, i) {
  return (x >>> i & 1) !== 0;
}
class QrSegment {
  // Creates a new QR Code segment with the given attributes and data.
  // The character count (numChars) must agree with the mode and the bit buffer length,
  // but the constraint isn't checked. The given bit buffer is cloned and stored.
  constructor(mode, numChars, bitData) {
    this.mode = mode;
    this.numChars = numChars;
    this.bitData = bitData;
    if (numChars < 0)
      throw new RangeError("Invalid argument");
    this.bitData = bitData.slice();
  }
  /* -- Methods -- */
  // Returns a new copy of the data bits of this segment.
  getData() {
    return this.bitData.slice();
  }
}
const MODE_NUMERIC = [1, 10, 12, 14];
const MODE_ALPHANUMERIC = [2, 9, 11, 13];
const MODE_BYTE = [4, 8, 16, 16];
function numCharCountBits(mode, ver) {
  return mode[Math.floor((ver + 7) / 17) + 1];
}
function makeBytes(data) {
  const bb = [];
  for (const b of data)
    appendBits(b, 8, bb);
  return new QrSegment(MODE_BYTE, data.length, bb);
}
function makeNumeric(digits) {
  if (!isNumeric(digits))
    throw new RangeError("String contains non-numeric characters");
  const bb = [];
  for (let i = 0; i < digits.length; ) {
    const n = Math.min(digits.length - i, 3);
    appendBits(Number.parseInt(digits.substring(i, i + n), 10), n * 3 + 1, bb);
    i += n;
  }
  return new QrSegment(MODE_NUMERIC, digits.length, bb);
}
function makeAlphanumeric(text) {
  if (!isAlphanumeric(text))
    throw new RangeError("String contains unencodable characters in alphanumeric mode");
  const bb = [];
  let i;
  for (i = 0; i + 2 <= text.length; i += 2) {
    let temp = ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
    temp += ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
    appendBits(temp, 11, bb);
  }
  if (i < text.length)
    appendBits(ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
  return new QrSegment(MODE_ALPHANUMERIC, text.length, bb);
}
function makeSegments(text) {
  if (text === "")
    return [];
  else if (isNumeric(text))
    return [makeNumeric(text)];
  else if (isAlphanumeric(text))
    return [makeAlphanumeric(text)];
  else
    return [makeBytes(toUtf8ByteArray(text))];
}
function isNumeric(text) {
  return NUMERIC_REGEX.test(text);
}
function isAlphanumeric(text) {
  return ALPHANUMERIC_REGEX.test(text);
}
function getTotalBits(segs, version) {
  let result = 0;
  for (const seg of segs) {
    const ccbits = numCharCountBits(seg.mode, version);
    if (seg.numChars >= 1 << ccbits)
      return Number.POSITIVE_INFINITY;
    result += 4 + ccbits + seg.bitData.length;
  }
  return result;
}
function toUtf8ByteArray(str) {
  str = encodeURI(str);
  const result = [];
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) !== "%") {
      result.push(str.charCodeAt(i));
    } else {
      result.push(Number.parseInt(str.substring(i + 1, i + 3), 16));
      i += 2;
    }
  }
  return result;
}
function getNumRawDataModules(ver) {
  if (ver < MIN_VERSION || ver > MAX_VERSION)
    throw new RangeError("Version number out of range");
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7)
      result -= 36;
  }
  return result;
}
function getNumDataCodewords(ver, ecl) {
  return Math.floor(getNumRawDataModules(ver) / 8) - ECC_CODEWORDS_PER_BLOCK[ecl[0]][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecl[0]][ver];
}
function reedSolomonComputeDivisor(degree) {
  if (degree < 1 || degree > 255)
    throw new RangeError("Degree out of range");
  const result = [];
  for (let i = 0; i < degree - 1; i++)
    result.push(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = reedSolomonMultiply(result[j], root);
      if (j + 1 < result.length)
        result[j] ^= result[j + 1];
    }
    root = reedSolomonMultiply(root, 2);
  }
  return result;
}
function reedSolomonComputeRemainder(data, divisor) {
  const result = divisor.map((_) => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => result[i] ^= reedSolomonMultiply(coef, factor));
  }
  return result;
}
function reedSolomonMultiply(x, y) {
  if (x >>> 8 !== 0 || y >>> 8 !== 0)
    throw new RangeError("Byte out of range");
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = z << 1 ^ (z >>> 7) * 285;
    z ^= (y >>> i & 1) * x;
  }
  return z;
}
function encodeSegments(segs, ecl, minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true) {
  if (!(MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= MAX_VERSION) || mask < -1 || mask > 7)
    throw new RangeError("Invalid value");
  let version;
  let dataUsedBits;
  for (version = minVersion; ; version++) {
    const dataCapacityBits2 = getNumDataCodewords(version, ecl) * 8;
    const usedBits = getTotalBits(segs, version);
    if (usedBits <= dataCapacityBits2) {
      dataUsedBits = usedBits;
      break;
    }
    if (version >= maxVersion)
      throw new RangeError("Data too long");
  }
  for (const newEcl of [MEDIUM, QUARTILE, HIGH]) {
    if (boostEcl && dataUsedBits <= getNumDataCodewords(version, newEcl) * 8)
      ecl = newEcl;
  }
  const bb = [];
  for (const seg of segs) {
    appendBits(seg.mode[0], 4, bb);
    appendBits(seg.numChars, numCharCountBits(seg.mode, version), bb);
    for (const b of seg.getData())
      bb.push(b);
  }
  const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
  appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
  appendBits(0, (8 - bb.length % 8) % 8, bb);
  for (let padByte = 236; bb.length < dataCapacityBits; padByte ^= 236 ^ 17)
    appendBits(padByte, 8, bb);
  const dataCodewords = Array.from({ length: Math.ceil(bb.length / 8) }, () => 0);
  bb.forEach((b, i) => dataCodewords[i >>> 3] |= b << 7 - (i & 7));
  return new QrCode(version, ecl, dataCodewords, mask);
}

function encode(data, options) {
  const {
    ecc = "L",
    boostEcc = false,
    minVersion = 1,
    maxVersion = 40,
    maskPattern = -1,
    border = 1
  } = options || {};
  const segment = typeof data === "string" ? makeSegments(data) : Array.isArray(data) ? [makeBytes(data)] : void 0;
  if (!segment)
    throw new Error(`uqr only supports encoding string and binary data, but got: ${typeof data}`);
  const qr = encodeSegments(
    segment,
    EccMap[ecc],
    minVersion,
    maxVersion,
    maskPattern,
    boostEcc
  );
  const result = addBorder({
    version: qr.version,
    maskPattern: qr.mask,
    size: qr.size,
    data: qr.modules,
    types: qr.types
  }, border);
  if (options && options.invert)
    result.data = result.data.map((row) => row.map((mod) => !mod));
  if (options && typeof options.onEncoded === "function") options.onEncoded(result);
  return result;
}
function addBorder(input, border = 1) {
  if (!border)
    return input;
  const { size } = input;
  const newSize = size + border * 2;
  input.size = newSize;
  input.data.forEach((row) => {
    for (let i = 0; i < border; i++) {
      row.unshift(false);
      row.push(false);
    }
  });
  for (let i = 0; i < border; i++) {
    input.data.unshift(Array.from({ length: newSize }, (_) => false));
    input.data.push(Array.from({ length: newSize }, (_) => false));
  }
  const b = QrCodeDataType.Border;
  input.types.forEach((row) => {
    for (let i = 0; i < border; i++) {
      row.unshift(b);
      row.push(b);
    }
  });
  for (let i = 0; i < border; i++) {
    input.types.unshift(Array.from({ length: newSize }, (_) => b));
    input.types.push(Array.from({ length: newSize }, (_) => b));
  }
  return input;
}
function getDataAt(data, x, y, defaults = false) {
  if (x < 0 || y < 0 || x >= data.length || y >= data.length)
    return defaults;
  return data[y][x];
}

function renderUnicode(data, options = {}) {
  const {
    whiteChar = "\u2588",
    blackChar = "\u2591"
  } = options;
  const result = encode(data, options);
  return result.data.map((row) => {
    return row.map((mod) => mod ? blackChar : whiteChar).join("");
  }).join("\n");
}
function renderANSI(data, options = {}) {
  return renderUnicode(data, {
    ...options,
    blackChar: "\x1B[40m\u3000\x1B[0m",
    whiteChar: "\x1B[47m\u3000\x1B[0m"
  });
}
function renderUnicodeCompact(data, options = {}) {
  const platte = {
    WHITE_ALL: "\u2588",
    WHITE_BLACK: "\u2580",
    BLACK_WHITE: "\u2584",
    BLACK_ALL: " "
  };
  const result = encode(data, options);
  const WHITE = false;
  const BLACK = true;
  const at = (x, y) => getDataAt(result.data, x, y, true);
  const lines = [];
  let line = "";
  for (let row = 0; row < result.size; row += 2) {
    for (let col = 0; col < result.size; col++) {
      if (at(col, row) === WHITE && at(col, row + 1) === WHITE)
        line += platte.WHITE_ALL;
      else if (at(col, row) === WHITE && at(col, row + 1) === BLACK)
        line += platte.WHITE_BLACK;
      else if (at(col, row) === BLACK && at(col, row + 1) === WHITE)
        line += platte.BLACK_WHITE;
      else
        line += platte.BLACK_ALL;
    }
    lines.push(line);
    line = "";
  }
  return lines.join("\n");
}

function renderSVG(data, options = {}) {
  const result = encode(data, options);
  const {
    pixelSize = 10,
    whiteColor = "white",
    blackColor = "black"
  } = options;
  const height = result.size * pixelSize;
  const width = result.size * pixelSize;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
  const pathes = [];
  for (let row = 0; row < result.size; row++) {
    for (let col = 0; col < result.size; col++) {
      const x = col * pixelSize;
      const y = row * pixelSize;
      if (result.data[row][col])
        pathes.push(`M${x},${y}h${pixelSize}v${pixelSize}h-${pixelSize}z`);
    }
  }
  svg += `<rect fill="${whiteColor}" width="${width}" height="${height}"/>`;
  svg += `<path fill="${blackColor}" d="${pathes.join("")}"/>`;
  svg += "</svg>";
  return svg;
}




    function renderQrSvg(data, options) {
        options = options || {};
        options.pixelSize = options.pixelSize || 6;
        options.whiteColor = options.whiteColor || '#ffffff';
        options.blackColor = options.blackColor || '#111111';
        return renderSVG(data, options);
    }

    // --- Constants & Config ---
    var API_ENDPOINTS = [
        'https://api-s2.anixsekai.com',
        'https://api-s.anixsekai.com',
        'https://api.anixsekai.com',
        'https://api.anixart.tv'
    ];
    var currentApiIndex = 0;

    var USER_AGENT = 'AnixartApp/10.5-26101718 (Android 9; SDK 28; x86_64; ROG ASUS AI2201_B; ru)';
    var STORAGE_AUTH = 'anixart_user_auth';

    var ICONS = {
        logo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4V8z"/></svg>',
        search: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
        bookmarks: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
        user: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        qr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
    };

    // Safe Navigator helper for SpatialNavigator in Lampa
    var Nav = {
        canmove: function (dir) {
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            return (n && typeof n.canmove === 'function') ? n.canmove(dir) : false;
        },
        move: function (dir) {
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            return (n && typeof n.move === 'function') ? n.move(dir) : false;
        },
        focused: function (elem) {
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            if (n && typeof n.focused === 'function') n.focused(elem);
        },
        getFocused: function () {
            var cur = document.querySelector('.focus');
            if (cur) return cur;
            var n = window.Navigator || (typeof Navigator !== 'undefined' ? Navigator : null);
            if (n && typeof n.getFocusedElement === 'function') {
                var el = n.getFocusedElement();
                if (el) return el;
            }
            if (n && n._focus) return n._focus;
            return null;
        }
    };

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        sec = Math.round(sec);
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        var h = Math.floor(m / 60);
        m = m % 60;
        if (h > 0) {
            return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // --- Poster & Image Cache ---
    var PosterCache = {
        mem: {},
        preload: function (urls) {
            if (!urls || !urls.length) return;
            urls.slice(0, 30).forEach(function (url) {
                if (!url || PosterCache.mem[url]) return;
                var img = new Image();
                img.src = url;
                PosterCache.mem[url] = url;
            });
        }
    };

    // --- Auth & Profile Management ---
    var Auth = {
        get: function () {
            return Lampa.Storage.get(STORAGE_AUTH, {});
        },
        token: function () {
            return this.get().token || '';
        },
        profile: function () {
            return this.get().profile || null;
        },
        isLogged: function () {
            return Boolean(this.token());
        },
        save: function (token, profile) {
            var curr = this.get();
            var data = {
                token: token || curr.token || '',
                profile: profile || curr.profile || null,
                saved_at: Date.now()
            };
            Lampa.Storage.set(STORAGE_AUTH, data);
        },
        clear: function () {
            Lampa.Storage.set(STORAGE_AUTH, {});
        }
    };

    // --- API Client ---
    var Api = {
        getBaseUrl: function () {
            return API_ENDPOINTS[currentApiIndex] || API_ENDPOINTS[0];
        },
        nextEndpoint: function () {
            currentApiIndex = (currentApiIndex + 1) % API_ENDPOINTS.length;
            console.log('Anixart: Switched to endpoint', this.getBaseUrl());
        },
        request: function (path, options) {
            options = options || {};
            var self = this;
            var attempts = 0;
            var maxAttempts = API_ENDPOINTS.length;

            function tryFetch() {
                var baseUrl = self.getBaseUrl();
                var url = baseUrl + path;

                var token = Auth.token();
                if (token) {
                    if (url.indexOf('?') === -1) {
                        url += '?token=' + encodeURIComponent(token);
                    } else {
                        url += '&token=' + encodeURIComponent(token);
                    }
                }

                var headers = {
                    'Accept': 'application/json'
                };
                if (options.v2) {
                    headers['API-Version'] = 'v2';
                }

                var postData = null;
                var contentType = undefined;
                if (options.urlEncoded || options.form) {
                    contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
                    postData = $.param(options.body || {});
                } else if (options.body) {
                    contentType = 'application/json; charset=utf-8';
                    postData = JSON.stringify(options.body);
                }

                return new Promise(function (resolve, reject) {
                    $.ajax({
                        url: url,
                        type: options.method || 'GET',
                        headers: headers,
                        data: postData,
                        contentType: contentType,
                        dataType: 'json',
                        timeout: 10000,
                        success: function (data) {
                            resolve(data);
                        },
                        error: function (xhr, status, error) {
                            attempts++;
                            if (attempts < maxAttempts) {
                                self.nextEndpoint();
                                tryFetch().then(resolve).catch(reject);
                            } else {
                                reject(new Error('Network error: ' + (error || status)));
                            }
                        }
                    });
                });
            }

            return tryFetch();
        },

        // Catalog Endpoints
        filter: function (body, page) {
            return this.request('/filter/' + (page || 0), {
                method: 'POST',
                body: body || { sort: 0 }
            });
        },
        discoverWatching: function (page) {
            return this.request('/discover/watching/' + (page || 0), {
                method: 'POST'
            });
        },
        discoverDiscussing: function () {
            return this.request('/discover/discussing', {
                method: 'POST'
            });
        },
        discoverInteresting: function () {
            return this.request('/discover/interesting', {
                method: 'POST'
            });
        },
        discoverRecommendations: function (page) {
            return this.request('/discover/recommendations/' + (page || 0), {
                method: 'POST'
            });
        },

        // Search
        search: function (query, page) {
            return this.request('/search/releases/' + (page || 0), {
                method: 'POST',
                v2: true,
                body: { query: query }
            });
        },

        // Release Details
        release: function (id) {
            return this.request('/release/' + id);
        },
        comments: function (id, page) {
            return this.request('/release/comment/all/' + id + '/' + (page || 0));
        },

        // Dubbings & Episodes
        types: function (id) {
            return this.request('/episode/' + id);
        },
        sources: function (releaseId, typeId) {
            return this.request('/episode/' + releaseId + '/' + typeId);
        },
        episodes: function (releaseId, typeId, sourceId) {
            return this.request('/episode/' + releaseId + '/' + typeId + '/' + sourceId);
        },

        // Watch Status & History
        markWatched: function (releaseId, sourceId, position) {
            return this.request('/episode/watch/' + releaseId + '/' + sourceId + '/' + position, {
                method: 'POST'
            });
        },
        unmarkWatched: function (releaseId, sourceId, position) {
            return this.request('/episode/unwatch/' + releaseId + '/' + sourceId + '/' + position, {
                method: 'POST'
            });
        },
        history: function (page) {
            return this.request('/history/' + (page || 0));
        },
        addToHistory: function (releaseId, sourceId, position) {
            return this.request('/history/add/' + releaseId + '/' + sourceId + '/' + position);
        },
        deleteFromHistory: function (releaseId) {
            return this.request('/history/delete/' + releaseId);
        },

        // User Lists (Bookmarks)
        profileList: function (statusId, page, sort) {
            var url = '/profile/list/all/' + statusId + '/' + (page || 0);
            if (sort != null && sort !== 'last_view') {
                url += '?sort=' + sort;
            }
            return this.request(url);
        },
        addToList: function (statusId, releaseId) {
            return this.request('/profile/list/add/' + statusId + '/' + releaseId);
        },
        deleteFromList: function (statusId, releaseId) {
            return this.request('/profile/list/delete/' + statusId + '/' + releaseId);
        },

        // Favorites
        favorites: function (page, sort) {
            var url = '/favorite/all/' + (page || 0);
            if (sort != null && sort !== 'last_view') {
                url += '?sort=' + sort;
            }
            return this.request(url);
        },
        addFavorite: function (releaseId) {
            return this.request('/favorite/add/' + releaseId);
        },
        deleteFavorite: function (releaseId) {
            return this.request('/favorite/delete/' + releaseId);
        },

        // Auth
        qrCreate: function () {
            return this.request('/auth/qr/create', {
                method: 'POST',
                urlEncoded: true,
                body: { device: 'Lampa TV' }
            });
        },
        qrStatus: function (key, secret) {
            return this.request('/auth/qr/status', {
                method: 'POST',
                urlEncoded: true,
                body: { key: key, secret: secret }
            });
        },
        signIn: function (login, password) {
            return this.request('/auth/signIn', {
                method: 'POST',
                urlEncoded: true,
                body: { login: login, password: password }
            });
        },
        myProfile: function () {
            var p = Auth.profile();
            if (p && p.id) {
                return this.request('/profile/' + p.id);
            }
            return this.request('/profile/info');
        }
    };

    // --- Stream & Video Resolver ---
    var StreamResolver = {
        decryptKodikSrc: function (src) {
            if (!src) return '';
            var zCharCode = 'Z'.charCodeAt(0);
            var decryptedBase64 = src.replace(/[a-zA-Z]/g, function (e) {
                var eCharCode = e.charCodeAt(0);
                return String.fromCharCode(
                    (eCharCode <= zCharCode ? 90 : 122) >= (eCharCode = eCharCode + 18) ? eCharCode : eCharCode - 26
                );
            });
            while (decryptedBase64.length % 4 !== 0) {
                decryptedBase64 += '=';
            }
            try {
                return atob(decryptedBase64);
            } catch (err) {
                return '';
            }
        },

        resolve: function (url, epInfo) {
            if (!url) return Promise.reject(new Error('Пустой URL серии'));
            var _this = this;

            // Direct mp4/m3u8 already
            if (/\.(mp4|m3u8)(\?|$)/i.test(url) && !/shell\.php/i.test(url) && !/iframe\.php/i.test(url)) {
                return Promise.resolve({ url: url, quality: 'auto' });
            }

            var timeoutPromise = new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error('Resolver timeout'));
                }, 2000);
            });

            var resolvePromise;
            if (/kodik|aniqit|anixis|aniqart/i.test(url)) {
                resolvePromise = _this.resolveKodik(url);
            } else if (/libria|aniliberty/i.test(url)) {
                resolvePromise = _this.resolveLibria(url, epInfo);
            } else if (/sibnet\.ru/i.test(url)) {
                resolvePromise = _this.resolveSibnet(url);
            } else {
                resolvePromise = _this.resolveViaAnixback(url);
            }

            return Promise.race([resolvePromise, timeoutPromise]);
        },

        resolveKodik: function (embedUrl) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var hostname = 'kodikplayer.com';
                var hostMatch = embedUrl.match(/^https?:\/\/([^\/]+)/);
                if (hostMatch) hostname = hostMatch[1];

                var m = embedUrl.match(/\/(seria|video|movie|anime)\/(\d+)\/([0-9a-fA-Z]+)/i);
                if (m) {
                    var type = m[1];
                    var id = m[2];
                    var hash = m[3];
                    var ftorUrl = 'https://' + hostname + '/ftor?type=' + type + '&hash=' + hash + '&id=' + id;

                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', ftorUrl);
                    xhr.timeout = 5000;
                    xhr.onload = function () {
                        try {
                            var res = JSON.parse(xhr.responseText);
                            var links = (res && res.links) || {};
                            var chosen = links['720'] || links['480'] || links['360'] || links[Object.keys(links)[0]];
                            if (chosen && chosen.length && chosen[0].src) {
                                var streamUrl = _this.decryptKodikSrc(chosen[0].src);
                                if (streamUrl) {
                                    if (streamUrl.indexOf('//') === 0) streamUrl = 'http:' + streamUrl;
                                    else if (streamUrl.indexOf('https://') === 0 && (streamUrl.indexOf('solodcdn.com') >= 0 || streamUrl.indexOf('kodik-cdn.com') >= 0)) {
                                        streamUrl = streamUrl.replace('https://', 'http://');
                                    }
                                    resolve({ url: streamUrl, quality: '720' });
                                    return;
                                }
                            }
                            reject(new Error('Не удалось расшифровать поток Kodik'));
                        } catch (e) {
                            reject(e);
                        }
                    };
                    xhr.onerror = function () {
                        reject(new Error('Ошибка сети Kodik'));
                    };
                    xhr.ontimeout = function () {
                        reject(new Error('Таймаут Kodik'));
                    };
                    xhr.send();
                    return;
                }

                _this.resolveViaAnixback(embedUrl).then(resolve).catch(reject);
            });
        },

        resolveLibria: function (embedUrl, epInfo) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var releaseId = null;
                var epOrdinal = null;
                try {
                    var u = new URL(embedUrl);
                    releaseId = u.searchParams.get('id');
                    epOrdinal = u.searchParams.get('ep');
                } catch (e) {}

                if (!releaseId && epInfo) {
                    releaseId = epInfo.releaseId;
                    epOrdinal = epInfo.position;
                }

                if (!releaseId) {
                    return _this.resolveViaAnixback(embedUrl).then(resolve).catch(reject);
                }

                $.ajax({
                    url: 'https://aniliberty.top/api/v1/anime/releases/' + releaseId,
                    type: 'GET',
                    dataType: 'json',
                    timeout: 10000,
                    success: function (data) {
                        var eps = (data && data.episodes) || [];
                        var ep = eps.find(function (e) { return String(e.ordinal) === String(epOrdinal); }) || eps[0];
                        if (ep && (ep.hls_1080 || ep.hls_720 || ep.hls_480)) {
                            var stream = ep.hls_1080 || ep.hls_720 || ep.hls_480;
                            if (stream.indexOf('//') === 0) stream = 'http:' + stream;
                            else if (stream.indexOf('https://') === 0) stream = stream.replace('https://', 'http://');
                            resolve({ url: stream, quality: ep.hls_1080 ? '1080' : '720' });
                        } else {
                            _this.resolveViaAnixback(embedUrl).then(resolve).catch(reject);
                        }
                    },
                    error: function () {
                        _this.resolveViaAnixback(embedUrl).then(resolve).catch(reject);
                    }
                });
            });
        },

        resolveSibnet: function (embedUrl) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: embedUrl,
                    type: 'GET',
                    headers: { 'Accept': 'text/html' },
                    timeout: 10000,
                    success: function (html) {
                        var m = html.match(/player\.src\(\[\s*\{\s*src:\s*"(\/[^"]+)"/i) ||
                                html.match(/src:\s*"(\/v\/[^"]+\.mp4[^"]*)"/i) ||
                                html.match(/src:\s*"(\/[^"]+)"/i);
                        if (m) {
                            var videoUrl = 'http://video.sibnet.ru' + m[1];
                            resolve({ url: videoUrl, quality: 'auto' });
                        } else {
                            _this.resolveViaAnixback(embedUrl).then(resolve).catch(reject);
                        }
                    },
                    error: function () {
                        _this.resolveViaAnixback(embedUrl).then(resolve).catch(reject);
                    }
                });
            });
        },

        resolveViaAnixback: function (embedUrl) {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: 'https://api.anixapp.com/api/stream/resolve',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ embedUrl: embedUrl }),
                    dataType: 'json',
                    timeout: 15000,
                    success: function (res) {
                        if (res && res.ok && res.directUrl) {
                            var u = res.directUrl;
                            if (u.indexOf('//') === 0) u = 'http:' + u;
                            else if (u.indexOf('https://') === 0 && (u.indexOf('solodcdn.com') >= 0 || u.indexOf('kodik-cdn.com') >= 0 || u.indexOf('libria') >= 0)) {
                                u = u.replace('https://', 'http://');
                            }
                            resolve({ url: u, quality: res.quality || 'auto' });
                        } else {
                            reject(new Error((res && res.error) || 'Не удалось получить прямую ссылку'));
                        }
                    },
                    error: function (xhr, status, error) {
                        reject(new Error('Resolver error: ' + (error || status)));
                    }
                });
            });
        }
    };

    // --- Authentication UI Modals ---
    function showQrLoginModal(onSuccess) {
        Lampa.Noty.show('Генерация сессии входа по QR-коду...');
        Api.qrCreate().then(function (res) {
            if (!res || !res.key) {
                Lampa.Noty.show('Ошибка генерации QR-кода');
                return;
            }

            var key = res.key;
            var secret = res.secret;
            var pinCode = String(res.pin || res.code || '');
            var qrUrl = 'https://anixart-app.com/sign-in/qr?key=' + key;

            var svgString = renderQrSvg(qrUrl, { pixelSize: 6, whiteColor: '#ffffff', blackColor: '#111111' });

            var modalHtml = $('<div class="anixart-qr-modal" style="display:flex; flex-direction:column; align-items:center; padding:1.5em; text-align:center;">' +
                '<div class="anixart-qr-container" style="background:#fff; padding:1em; border-radius:1em; display:inline-block; margin-bottom:0.8em;">' + svgString + '</div>' +
                '<div class="anixart-qr-pin-title">Код подтверждения (PIN):</div>' +
                '<div class="anixart-qr-pin-code">' + pinCode + '</div>' +
                '<div class="anixart-qr-status" style="font-size:1.05em; color:rgba(255,255,255,0.7); max-width:340px; line-height:1.4;">' +
                    'Отсканируйте QR-код в приложении Anixart или камерой смартфона и введите 4-значный PIN-код.' +
                '</div>' +
            '</div>');

            var pollTimer = null;
            var isClosed = false;

            function cleanup() {
                isClosed = true;
                if (pollTimer) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                }
            }

            Lampa.Modal.open({
                title: 'Вход в аккаунт Anixart',
                html: modalHtml,
                size: 'medium',
                buttons: [
                    {
                        name: 'Отмена',
                        onSelect: function () {
                            cleanup();
                            Lampa.Modal.close();
                            Lampa.Controller.toggle('content');
                        }
                    }
                ],
                onBack: function () {
                    cleanup();
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('content');
                }
            });

            pollTimer = setInterval(function () {
                if (isClosed) return;
                Api.qrStatus(key, secret).then(function (statusRes) {
                    if (isClosed || !statusRes) return;

                    if (statusRes.code === 2) {
                        cleanup();
                        modalHtml.find('.anixart-qr-status').html('<span style="color:#e50914; font-weight:600;">Время действия QR-кода истекло</span>');
                        return;
                    }
                    if (statusRes.code === 3) {
                        cleanup();
                        modalHtml.find('.anixart-qr-status').html('<span style="color:#e50914; font-weight:600;">Вход был отклонён</span>');
                        return;
                    }
                    if (statusRes.code === 4) {
                        cleanup();
                        modalHtml.find('.anixart-qr-status').html('<span style="color:#e50914; font-weight:600;">Слишком много неверных попыток</span>');
                        return;
                    }
                    if (statusRes.code === 5) {
                        modalHtml.find('.anixart-qr-status').html('<span style="color:#f39c12; font-weight:600;">Неверный PIN-код, попробуйте снова</span>');
                        return;
                    }

                    if (statusRes.status === 1) {
                        modalHtml.find('.anixart-qr-status').html('<span style="color:#2ecc71; font-weight:600;">QR отсканирован!</span><br>Введите ' + pinCode + ' в приложении...');
                    } else if (statusRes.status === 2 || (statusRes.profileToken && statusRes.profileToken.token)) {
                        cleanup();
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('content');
                        Auth.save(statusRes.profileToken.token, statusRes.profile);
                        Lampa.Noty.show('Успешный вход: ' + ((statusRes.profile && statusRes.profile.login) || 'Пользователь'));
                        if (onSuccess) onSuccess();
                    }
                }).catch(function () {});
            }, (res.poll_interval || 2) * 1000);

        }).catch(function (err) {
            Lampa.Noty.show('Ошибка API QR: ' + err.message);
        });
    }

    function promptPasswordLogin(onSuccess) {
        Lampa.Input.edit({
            title: 'Логин или Email Anixart',
            value: '',
            free: true,
            nosave: true
        }, function (login) {
            if (!login) {
                Lampa.Controller.toggle('content');
                return;
            }
            Lampa.Input.edit({
                title: 'Пароль',
                value: '',
                free: true,
                nosave: true
            }, function (password) {
                if (!password) {
                    Lampa.Controller.toggle('content');
                    return;
                }
                Lampa.Noty.show('Выполняется вход...');
                Api.signIn(login, password).then(function (res) {
                    Lampa.Controller.toggle('content');
                    if (res && res.code === 0 && res.profileToken && res.profileToken.token) {
                        Auth.save(res.profileToken.token, res.profile);
                        Lampa.Noty.show('Успешный вход: ' + (res.profile ? res.profile.login : login));
                        if (onSuccess) onSuccess();
                    } else {
                        Lampa.Noty.show('Неверный логин или пароль');
                    }
                }).catch(function (err) {
                    Lampa.Controller.toggle('content');
                    Lampa.Noty.show('Ошибка входа: ' + err.message);
                });
            });
        });
    }

    function showProfileModal(onRefresh) {
        if (!Auth.isLogged()) {
            showQrLoginModal(onRefresh);
            return;
        }

        var profile = Auth.profile() || {};
        var html = $('<div style="padding: 1.5em; text-align: center;">' +
            '<div style="margin-bottom: 1.2em;">' +
                (profile.avatar ? '<img src="' + profile.avatar + '" style="width: 5em; height: 5em; border-radius: 50%; object-fit: cover; box-shadow: 0 0.5em 1.5em rgba(0,0,0,0.5);">' : '<div style="font-size: 3em;">👤</div>') +
            '</div>' +
            '<div style="font-size: 1.5em; font-weight: 700; color: #fff; margin-bottom: 0.3em;">' + (profile.login || 'Пользователь') + '</div>' +
            '<div style="font-size: 1.05em; color: rgba(255,255,255,0.6); margin-bottom: 0.5em;">ID: ' + (profile.id || '') + '</div>' +
        '</div>');

        Lampa.Modal.open({
            title: 'Профиль Anixart',
            html: html,
            size: 'small',
            buttons: [
                {
                    name: 'Выйти из аккаунта',
                    onSelect: function () {
                        Auth.clear();
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('content');
                        Lampa.Noty.show('Вы вышли из аккаунта');
                        if (onRefresh) onRefresh();
                    }
                },
                {
                    name: 'Закрыть',
                    onSelect: function () {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('content');
                    }
                }
            ],
            onBack: function () {
                Lampa.Modal.close();
                Lampa.Controller.toggle('content');
            }
        });
    }

    // --- Fullscreen Frame Viewer for Screenshots / Frames ---
    var FrameViewer = {
        active: false,
        frames: [],
        index: 0,
        title: '',
        html: null,
        lastFocusedElem: null,

        open: function (frames, startIndex, title, lastElem) {
            if (!frames || !frames.length) return;
            var _this = this;
            this.frames = frames;
            this.index = Math.max(0, Math.min(startIndex || 0, frames.length - 1));
            this.title = title || '';
            this.lastFocusedElem = lastElem || null;
            this.active = true;

            if (this.html) this.html.remove();

            this.html = $(
                '<div class="frames-viewer">' +
                    '<div class="frames-viewer__head">' +
                        '<div class="frames-viewer__title">' + this.title + '</div>' +
                        '<div class="frames-viewer__counter">' + (this.index + 1) + ' / ' + this.frames.length + '</div>' +
                    '</div>' +
                    '<div class="frames-viewer__body">' +
                        '<img class="frames-viewer__img" />' +
                    '</div>' +
                    '<div class="frames-viewer__arrow frames-viewer__arrow--left">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
                    '</div>' +
                    '<div class="frames-viewer__arrow frames-viewer__arrow--right">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
                    '</div>' +
                    '<div class="frames-viewer__footer">' +
                        '<span>Стрелки Влево / Вправо для переключения · Нажмите [Назад] для выхода</span>' +
                    '</div>' +
                '</div>'
            );

            $('body').append(this.html);
            this.showFrame(this.index);

            Lampa.Controller.add('anixart_frames_viewer', {
                toggle: function () {},
                left: function () { _this.prev(); },
                right: function () { _this.next(); },
                up: function () { _this.close(); },
                down: function () { _this.close(); },
                back: function () { _this.close(); },
                enter: function () { _this.close(); }
            });
            Lampa.Controller.toggle('anixart_frames_viewer');
        },

        showFrame: function (idx) {
            this.index = idx;
            var url = this.frames[idx];
            var img = this.html.find('.frames-viewer__img');
            img.attr('src', url);
            this.html.find('.frames-viewer__counter').text((idx + 1) + ' / ' + this.frames.length);
        },

        prev: function () {
            if (this.index > 0) this.showFrame(this.index - 1);
            else this.showFrame(this.frames.length - 1);
        },

        next: function () {
            if (this.index < this.frames.length - 1) this.showFrame(this.index + 1);
            else this.showFrame(0);
        },

        close: function () {
            if (!this.active) return;
            this.active = false;
            if (this.html) {
                this.html.remove();
                this.html = null;
            }
            Lampa.Controller.toggle('content');
            if (this.lastFocusedElem && window.Navigator) {
                window.Navigator.focus(this.lastFocusedElem);
                $(this.lastFocusedElem).trigger('hover:focus');
            }
        }
    };

    // --- Component: Release Card View (ComponentCard) Matching Native Lampa / ADrama ---
    function ComponentCard(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
        scroll.minus();
        var html = $('<div class="layer--wheight"></div>');
        var bg = $('<img class="full-start__background loaded" />');
        html.append(bg);
        html.append(scroll.render());

        scroll.onScroll = function (pos) {
            bg.toggleClass('dim', pos > 0);
        };

        scroll.onWheel = function (step) {
            if (step > 0) {
                if (Nav.canmove('down')) Nav.move('down');
            } else {
                if (Nav.canmove('up')) Nav.move('up');
                else Lampa.Controller.toggle('head');
            }
        };

        var last = null;
        var self = this;
        var release = object.release || {};
        var releaseId = object.id || release.id;
        var currentTypes = [];
        var activeTypeId = null;
        var currentSources = [];
        var activeSourceId = null;
        var currentEpisodes = [];
        var activeLineElem = null;

        this.create = function () {
            // Fetch release details and dubbings in parallel
            Promise.all([
                Api.release(releaseId).catch(function () { return { release: release }; }),
                Api.types(releaseId).catch(function () { return { types: [] }; })
            ]).then(function (results) {
                if (results[0] && results[0].release) release = results[0].release;
                var typesRes = results[1];
                currentTypes = (typesRes && typesRes.types) ? typesRes.types : [];

                buildView();
                self.start();
            }).catch(function (err) {
                Lampa.Noty.show('Ошибка загрузки релиза: ' + err.message);
                Lampa.Activity.backward();
            });

            return html;
        };

        function buildView() {
            var titleRu = release.title_ru || release.title || 'Аниме #' + releaseId;
            var titleOrig = release.title_original || '';
            var posterUrl = release.image || (release.poster ? 'https://s.anixmirai.com/posters/' + release.poster + '.jpg' : '');
            var gradeStr = release.grade ? Number(release.grade).toFixed(1) : (release.rating ? String(release.rating) : '0.0');
            var year = release.year || '';
            var country = release.country || 'Япония';
            var runtime = release.duration ? (release.duration + ' мин') : '';
            var desc = release.description || 'Описание отсутствует';
            var genresStr = release.genres || '';
            var totalEps = release.episodes_total || (release.episodes_released ? String(release.episodes_released) : '');

            // 1. Background image
            if (posterUrl) {
                bg.attr('src', posterUrl);
            }

            // 2. Section 1: Native Lampa Header (full_start_new)
            var start = Lampa.Template.get('full_start_new', {
                title: titleRu,
                tagline: titleOrig,
                rating: gradeStr
            });

            start.find('.full-start-new__left').removeClass('hide');
            var posterBox = start.find('.full-start-new__poster');
            posterBox.addClass('card--tv loaded');
            if (!posterBox.find('.card__type').length) {
                posterBox.append('<div class="card__type">ANIME</div>');
            }
            if (posterUrl) {
                start.find('.full-start-new__img').attr('src', posterUrl);
            }

            var headHtml = [];
            if (year) headHtml.push('<span>' + year + '</span>');
            if (country) headHtml.push('<span>' + country + '</span>');
            start.find('.full-start-new__head').html(headHtml.join(' · '));

            start.find('.source--name').text('ANIXART');
            if (!gradeStr || gradeStr === '0.0') {
                start.find('.rate--tmdb').addClass('hide');
            }

            var statusBadge = start.find('.full-start__status');
            var statusName = release.status && release.status.name ? release.status.name : '';
            if (statusName) {
                statusBadge.removeClass('hide').text(statusName);
            } else {
                statusBadge.addClass('hide');
            }

            var detailsItems = [];
            if (runtime) detailsItems.push('<span>' + runtime + '</span>');
            if (totalEps) detailsItems.push('<span>Серий: ' + totalEps + '</span>');
            if (genresStr) detailsItems.push('<span>' + genresStr + '</span>');
            start.find('.full-start-new__details').html(detailsItems.join('<span class="full-start-new__split">●</span>'));

            start.find('.full-start-new__reactions').remove();
            start.find('.button--reaction, .button--subscribe, .button--options, .buttons--container').remove();

            var btnPlay = start.find('.button--play');
            var btnBook = start.find('.button--book');
            btnBook.find('span').text('В списки');

            // Button Play: open sources / dubbings side panel (Lampa.Select.show)
            btnPlay.on('hover:enter click', function () {
                openSourcesSelect();
            }).on('hover:focus', function (e) {
                last = e.target;
                if (activeLineElem !== start[0]) {
                    activeLineElem = start[0];
                    scroll.update(start);
                }
            });

            // Button Bookmarks
            btnBook.on('hover:enter click', function () {
                if (!Auth.isLogged()) {
                    showQrLoginModal(function () {
                        Lampa.Noty.show('Авторизовано. Теперь можно добавить в списки');
                    });
                    return;
                }

                var items = [
                    { title: 'Смотрю', status: 1 },
                    { title: 'В планах', status: 2 },
                    { title: 'Просмотрено', status: 3 },
                    { title: 'Отложено', status: 4 },
                    { title: 'Брошено', status: 5 },
                    { title: 'В избранное', status: 'fav' },
                    { title: 'Удалить из списков', status: 0 }
                ];
                Lampa.Select.show({
                    title: 'Добавить в список Anixart',
                    items: items,
                    onSelect: function (a) {
                        Lampa.Controller.toggle('content');
                        if (a.status === 0) {
                            for (var s = 1; s <= 5; s++) {
                                Api.deleteFromList(s, releaseId).catch(function () {});
                            }
                            Api.deleteFavorite(releaseId).catch(function () {});
                            btnBook.find('span').text('В списки');
                            Lampa.Noty.show('Удалено из списков');
                        } else if (a.status === 'fav') {
                            Api.addFavorite(releaseId).then(function () {
                                Lampa.Noty.show('Добавлено в Избранное');
                            });
                        } else {
                            Api.addToList(a.status, releaseId).then(function () {
                                btnBook.find('span').text(a.title);
                                Lampa.Noty.show('Статус: ' + a.title);
                            }).catch(function (e) {
                                Lampa.Noty.show('Ошибка: ' + e.message);
                            });
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    }
                });
            }).on('hover:focus', function (e) {
                last = e.target;
                if (activeLineElem !== start[0]) {
                    activeLineElem = start[0];
                    scroll.update(start);
                }
            });

            scroll.append(start);

            // 3. Section 2: Details / Description (full_descr)
            var descrLine = $(
                '<div class="items-line layer--visible layer--render">' +
                    '<div class="items-line__head"><div class="items-line__title">Детали</div></div>' +
                    '<div class="items-line__body"></div>' +
                '</div>'
            );
            var descr = Lampa.Template.get('full_descr', {
                text: desc + '<br><br>',
                relise: year || '----',
                budget: '',
                countries: country || '----'
            });
            descr.find('.full--budget').remove();

            if (release.genres) {
                var genresList = release.genres.split(',').map(function (g) { return g.trim(); });
                var tagsBox = descr.find('.full-descr__tags');
                tagsBox.empty();
                genresList.forEach(function (g) {
                    tagsBox.append('<div class="full-descr__tag selector"><div>' + g + '</div></div>');
                });
            }

            descr.find('.full-descr__text').on('hover:enter', function () {
                Lampa.Modal.open({
                    title: titleRu,
                    html: $('<div class="about" style="line-height:1.6;font-size:1.2em;padding:1em;">' + desc + '</div>'),
                    size: 'large',
                    onBack: function () {
                        Lampa.Modal.close();
                        Lampa.Controller.toggle('content');
                    }
                });
            }).on('hover:focus', function (e) {
                last = e.target;
                if (activeLineElem !== descrLine[0]) {
                    activeLineElem = descrLine[0];
                    scroll.update(descrLine);
                }
            });

            descrLine.find('.items-line__body').append(descr);
            scroll.append(descrLine);

            // 4. Section 3: Dubbings Line (if multiple)
            if (currentTypes && currentTypes.length) {
                var dubLine = $(
                    '<div class="items-line layer--visible layer--render anixart-dub-line">' +
                        '<div class="items-line__head"><div class="items-line__title">Озвучка / Перевод</div></div>' +
                        '<div class="items-line__body"><div class="items-cards full-descr__tags" style="padding:0.4em 1.5em;"></div></div>' +
                    '</div>'
                );
                var dubBox = dubLine.find('.items-cards');

                currentTypes.forEach(function (t, idx) {
                    var tag = $('<div class="full-descr__tag selector' + (idx === 0 ? ' active' : '') + '" data-type-id="' + t.id + '">' +
                        '<div>' + t.name + (t.episodes_count ? ' (' + t.episodes_count + ')' : '') + '</div>' +
                    '</div>');

                    tag.on('hover:focus', function () {
                        last = this;
                        if (activeLineElem !== dubLine[0]) {
                            activeLineElem = dubLine[0];
                            scroll.update(dubLine);
                        }
                    }).on('hover:enter', function () {
                        dubBox.find('.full-descr__tag').removeClass('active');
                        tag.addClass('active');
                        activeTypeId = t.id;
                        activeSourceId = null;
                        loadSourcesAndEpisodes(t.id);
                    });

                    dubBox.append(tag);
                });

                scroll.append(dubLine);
                activeTypeId = currentTypes[0].id;
            }

            // 5. Section 4: Episodes Carousel Container
            var epLine = $(
                '<div class="items-line layer--visible layer--render anixart-episodes-line">' +
                    '<div class="items-line__head"><div class="items-line__title">Серии</div></div>' +
                    '<div class="items-line__body"></div>' +
                '</div>'
            );
            scroll.append(epLine);

            if (activeTypeId) {
                loadSourcesAndEpisodes(activeTypeId);
            }

            // 6. Section 5: Frames (Кадры из аниме)
            var frames = release.screenshot_images || (release.screenshots ? release.screenshots.map(function (s) {
                return 'https://s.anixmirai.com/screenshots/' + s + '.jpg';
            }) : []);

            if (frames && frames.length) {
                var framesLine = $(
                    '<div class="items-line layer--visible layer--render items-line--frames anixart-frames-line">' +
                        '<div class="items-line__head">' +
                            '<div class="items-line__title">Кадры <span class="items-line__count">(' + frames.length + ')</span></div>' +
                        '</div>' +
                        '<div class="items-line__body"></div>' +
                    '</div>'
                );

                var framesScroll = new Lampa.Scroll({ horizontal: true, step: 350 });
                framesScroll.body().addClass('items-cards items-cards--frames');
                framesScroll.onWheel = function (step) {
                    if (step > 0) Nav.move('right');
                    else {
                        if (Nav.canmove('left')) Nav.move('left');
                        else Lampa.Controller.toggle('menu');
                    }
                };

                frames.forEach(function (frameUrl, idx) {
                    var card = $(
                        '<div class="card card--wide card--frame selector layer--visible layer--render">' +
                            '<div class="card__view">' +
                                '<img class="card__img loaded" src="' + frameUrl + '" />' +
                                '<div class="frame__number">' + (idx + 1) + '</div>' +
                            '</div>' +
                        '</div>'
                    );

                    card.on('hover:focus', function () {
                        last = card[0];
                        framesScroll.update(card, true);
                        if (activeLineElem !== framesLine[0]) {
                            activeLineElem = framesLine[0];
                            scroll.update(framesLine);
                        }
                    }).on('hover:enter click', function () {
                        FrameViewer.open(frames, idx, titleRu, card[0]);
                    });

                    framesScroll.append(card);
                });

                framesLine.find('.items-line__body').append(framesScroll.render());
                scroll.append(framesLine);
            }

            // 7. Section 6: Comments Carousel
            buildCommentsSection();

            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            Lampa.Controller.collectionSet(scroll.render());
        }

        function findLastWatchedEpisode(episodes) {
            if (!episodes || !episodes.length) return null;

            // 1. Local saved watch for this release
            var saved = Lampa.Storage.get('anixart_watch_' + releaseId);
            if (saved && saved.position != null) {
                var matchSaved = episodes.find(function (e) {
                    return e.position === saved.position;
                });
                if (matchSaved) {
                    return {
                        episode: matchSaved,
                        position: matchSaved.position,
                        time: saved.time || 0,
                        duration: saved.duration || 0,
                        fromLocal: true
                    };
                }
            }

            // 2. Anixart server release.last_view_episode
            if (release && release.last_view_episode && release.last_view_episode.position != null) {
                var histPos = release.last_view_episode.position;
                var matchHist = episodes.find(function (e) {
                    return e.position === histPos;
                });
                if (matchHist) {
                    var tmH = Lampa.Timeline.view('anixart_' + releaseId + '_' + matchHist.position);
                    return {
                        episode: matchHist,
                        position: matchHist.position,
                        time: (tmH && tmH.time) ? tmH.time : 0,
                        duration: (tmH && tmH.duration) ? tmH.duration : 0,
                        fromHistory: true
                    };
                }
            }

            // 3. Highest watched episode from source
            var lastW = null;
            episodes.forEach(function (e) {
                if (e.is_watched) lastW = e;
            });
            if (lastW) {
                var tmW = Lampa.Timeline.view('anixart_' + releaseId + '_' + lastW.position);
                return {
                    episode: lastW,
                    position: lastW.position,
                    time: (tmW && tmW.time) ? tmW.time : 0,
                    duration: (tmW && tmW.duration) ? tmW.duration : 0,
                    fromWatched: true
                };
            }

            // 4. Default to first episode
            return {
                episode: episodes[0],
                position: episodes[0].position,
                time: 0,
                duration: 0,
                isDefault: true
            };
        }

        function openSourcesSelect(targetEp) {
            if (!currentTypes || !currentTypes.length) {
                Lampa.Noty.show('Озвучки не найдены');
                return;
            }

            Lampa.Noty.show('Загрузка озвучек и источников...');

            Promise.all(currentTypes.map(function (t) {
                return Api.sources(releaseId, t.id).then(function (sRes) {
                    return { type: t, sources: (sRes && sRes.sources) ? sRes.sources : [] };
                }).catch(function () {
                    return { type: t, sources: [] };
                });
            })).then(function (results) {
                var selectItems = [];

                results.forEach(function (resItem) {
                    var t = resItem.type;
                    var sources = resItem.sources;

                    if (!sources || !sources.length) {
                        selectItems.push({
                            title: t.name + (t.episodes_count ? (' (' + t.episodes_count + ' эп.)') : ''),
                            type: t,
                            source: null,
                            selected: (t.id === activeTypeId)
                        });
                    } else {
                        sources.sort(function (a, b) {
                            var scoreA = /kodik|aniqit|anixis/i.test(a.name) ? 10 : (/libria/i.test(a.name) ? 8 : 1);
                            var scoreB = /kodik|aniqit|anixis/i.test(b.name) ? 10 : (/libria/i.test(b.name) ? 8 : 1);
                            return scoreB - scoreA;
                        });

                        sources.forEach(function (src) {
                            var countStr = src.episodes_count ? (' · ' + src.episodes_count + ' эп.') : (t.episodes_count ? (' · ' + t.episodes_count + ' эп.') : '');
                            var titleText = t.name + ' — ' + src.name + countStr;
                            selectItems.push({
                                title: titleText,
                                type: t,
                                source: src,
                                selected: (t.id === activeTypeId && src.id === activeSourceId)
                            });
                        });
                    }
                });

                if (!selectItems.length) {
                    Lampa.Noty.show('Нет доступных источников');
                    return;
                }

                var hasSelected = selectItems.some(function (i) { return i.selected; });
                if (!hasSelected && selectItems.length) {
                    var matchType = selectItems.find(function (i) { return i.type && i.type.id === activeTypeId; });
                    if (matchType) matchType.selected = true;
                    else selectItems[0].selected = true;
                }

                var epNumStr = targetEp ? (' (' + (targetEp.name || ((targetEp.position != null ? (targetEp.position + 1) : 1) + ' серия')) + ')') : '';
                var selectTitle = 'Выберите озвучку / источник' + epNumStr;

                Lampa.Select.show({
                    title: selectTitle,
                    items: selectItems,
                    onSelect: function (sel) {
                        Lampa.Controller.toggle('content');

                        var selectedType = sel.type;
                        var selectedSource = sel.source;

                        activeTypeId = selectedType.id;
                        activeSourceId = selectedSource ? selectedSource.id : 0;

                        var dubLine = scroll.render().find('.anixart-dub-line');
                        if (dubLine.length) {
                            dubLine.find('.full-descr__tag').removeClass('active');
                            dubLine.find('.full-descr__tag[data-type-id="' + selectedType.id + '"]').addClass('active');
                        }

                        loadSourcesAndEpisodes(selectedType.id, activeSourceId, function (episodes) {
                            if (!episodes || !episodes.length) return;
                            if (targetEp) {
                                var toPlay = episodes.find(function (e) {
                                    return e.position === targetEp.position;
                                }) || episodes[0];
                                playEpisode(toPlay);
                            } else {
                                openEpisodesSelect(episodes, sel.title);
                            }
                        });
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('content');
                    }
                });
            }).catch(function (err) {
                Lampa.Noty.show('Ошибка загрузки источников: ' + err.message);
            });
        }

        function openEpisodesSelect(episodes, dubbingTitle) {
            if (!episodes || !episodes.length) {
                Lampa.Noty.show('Серии не найдены');
                return;
            }

            var lastWatched = findLastWatchedEpisode(episodes);
            var activePos = lastWatched ? lastWatched.position : (episodes[0] ? episodes[0].position : 0);

            var selectItems = episodes.map(function (ep) {
                var isCurrent = (ep.position === activePos);
                var epNum = ep.position != null ? (ep.position + 1) : 1;
                var epTitle = ep.name || (epNum + ' серия');

                var tm = Lampa.Timeline.view('anixart_' + releaseId + '_' + ep.position);
                var resumeSec = 0;
                if (isCurrent && lastWatched && lastWatched.time > 10) {
                    resumeSec = lastWatched.time;
                } else if (tm && tm.time > 10) {
                    resumeSec = tm.time;
                }

                var subtitleParts = [];
                if (isCurrent) {
                    if (resumeSec > 10) {
                        subtitleParts.push('Продолжить с ' + formatTime(resumeSec));
                    } else {
                        subtitleParts.push('Текущая серия');
                    }
                }
                if (ep.is_watched) {
                    subtitleParts.push('Просмотрено');
                } else if (tm && tm.percent > 0 && tm.percent < 90) {
                    subtitleParts.push(tm.percent + '%');
                }

                return {
                    title: (ep.is_watched ? '✓  ' : '') + epTitle,
                    subtitle: subtitleParts.join(' · '),
                    episode: ep,
                    selected: isCurrent,
                    resumeTime: resumeSec
                };
            });

            Lampa.Select.show({
                title: 'Серии — ' + (dubbingTitle || (release.title_ru || release.title || 'Аниме')),
                items: selectItems,
                onSelect: function (selEp) {
                    Lampa.Controller.toggle('content');
                    playEpisode(selEp.episode, null, selEp.resumeTime);
                },
                onBack: function () {
                    openSourcesSelect();
                }
            });
        }

        function loadSourcesAndEpisodes(typeId, sourceId, onLoaded) {
            if (typeof sourceId === 'function') {
                onLoaded = sourceId;
                sourceId = null;
            }

            var body = scroll.render().find('.anixart-episodes-line .items-line__body');
            body.html('<div style="color:rgba(255,255,255,0.6); padding: 1em 1.5em;">Загрузка серий...</div>');

            var getSourcePromise = null;
            if (sourceId) {
                activeSourceId = sourceId;
                getSourcePromise = Promise.resolve(sourceId);
            } else {
                getSourcePromise = Api.sources(releaseId, typeId).then(function (sRes) {
                    var sources = (sRes && sRes.sources) ? sRes.sources : [];
                    sources.sort(function (a, b) {
                        var scoreA = /kodik|aniqit|anixis/i.test(a.name) ? 10 : (/libria/i.test(a.name) ? 8 : 1);
                        var scoreB = /kodik|aniqit|anixis/i.test(b.name) ? 10 : (/libria/i.test(b.name) ? 8 : 1);
                        return scoreB - scoreA;
                    });
                    activeSourceId = sources.length ? sources[0].id : 0;
                    return activeSourceId;
                });
            }

            getSourcePromise.then(function (srcId) {
                return Api.episodes(releaseId, typeId, srcId);
            }).then(function (epRes) {
                currentEpisodes = (epRes && epRes.episodes) ? epRes.episodes : [];
                body.empty();

                if (!currentEpisodes.length) {
                    body.html('<div style="color:rgba(255,255,255,0.6); padding: 1em 1.5em;">Серии не найдены</div>');
                    if (onLoaded) onLoaded([]);
                    return;
                }

                var epScroll = new Lampa.Scroll({ horizontal: true, step: 300 });
                epScroll.body().addClass('full-episodes');
                epScroll.onWheel = function (step) {
                    if (step > 0) Nav.move('right');
                    else {
                        if (Nav.canmove('left')) Nav.move('left');
                        else Lampa.Controller.toggle('menu');
                    }
                };

                var lastWatched = findLastWatchedEpisode(currentEpisodes);
                var activePos = lastWatched ? lastWatched.position : null;

                currentEpisodes.forEach(function (ep) {
                    var epCard = createEpisodeCard(ep, epScroll, activePos);
                    epScroll.append(epCard);
                });

                body.append(epScroll.render());

                // Center/scroll horizontally to the active/last watched episode
                var activeCard = epScroll.body().find('.full-episode--active');
                if (activeCard.length) {
                    epScroll.update(activeCard, true);
                }

                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                Lampa.Controller.collectionSet(scroll.render());
                if (last && window.Navigator) window.Navigator.focus(last);

                if (onLoaded) onLoaded(currentEpisodes);
            }).catch(function (err) {
                body.html('<div style="color:#e50914; padding: 1em 1.5em;">Ошибка серий: ' + err.message + '</div>');
                if (onLoaded) onLoaded([]);
            });
        }

        function createEpisodeCard(ep, epScroll, activePos) {
            var epNum = ep.position != null ? (ep.position + 1) : 1;
            var epTitle = ep.name || (epNum + ' серия');
            var previewImg = release.image || (release.poster ? 'https://s.anixmirai.com/posters/' + release.poster + '.jpg' : '');

            var card = Lampa.Template.get('full_episode', {
                num: epNum,
                name: epTitle,
                date: 'Серия ' + epNum
            });
            card.addClass('full-episode--small layer--visible');
            card.attr('data-position', ep.position);

            var img = card.find('img');
            if (previewImg) {
                img.attr('src', previewImg);
                img.on('load', function () { card.addClass('full-episode--loaded'); });
            }

            var savedWatch = Lampa.Storage.get('anixart_watch_' + releaseId);
            var isCurrent = (activePos != null && ep.position === activePos);

            if (isCurrent) {
                card.addClass('full-episode--active');
                card.append('<div class="full-episode__active-badge">Текущая</div>');
            }

            if (ep.is_watched) {
                card.append('<div class="full-episode__viewed" style="display:block;"></div>');
                card.addClass('full-episode--viewed');
            }

            var tm = Lampa.Timeline.view('anixart_' + releaseId + '_' + ep.position);
            var pct = (savedWatch && savedWatch.position === ep.position && savedWatch.percent > 0) ? savedWatch.percent : (tm ? tm.percent : 0);
            if (pct > 0 && pct < 90) {
                card.append('<div class="full-episode__timeline"><div class="full-episode__timeline-bar" style="width:' + pct + '%;"></div></div>');
            }

            card.on('hover:focus', function () {
                last = card[0];
                epScroll.update(card, true);
                var parentLine = card.closest('.items-line')[0];
                if (activeLineElem !== parentLine) {
                    activeLineElem = parentLine;
                    scroll.update(card.closest('.items-line'));
                }
            }).on('hover:enter click', function () {
                var resumeTime = (savedWatch && savedWatch.position === ep.position && savedWatch.time > 10) ? savedWatch.time : (tm && tm.time > 10 ? tm.time : 0);
                playEpisode(ep, card, resumeTime);
            }).on('hover:long', function () {
                openSourcesSelect(ep);
            });

            return card;
        }

        function refreshEpisodesUI() {
            var body = scroll.render().find('.anixart-episodes-line .items-line__body');
            var savedWatch = Lampa.Storage.get('anixart_watch_' + releaseId);
            if (!savedWatch || savedWatch.position == null) return;

            body.find('.full-episode').removeClass('full-episode--active');
            body.find('.full-episode__active-badge').remove();

            var activeCard = body.find('.full-episode[data-position="' + savedWatch.position + '"]');
            if (activeCard.length) {
                activeCard.addClass('full-episode--active');
                activeCard.append('<div class="full-episode__active-badge">Текущая</div>');
                if (savedWatch.percent >= 80) {
                    activeCard.addClass('full-episode--viewed');
                    if (!activeCard.find('.full-episode__viewed').length) {
                        activeCard.append('<div class="full-episode__viewed" style="display:block;"></div>');
                    }
                }
                activeCard.find('.full-episode__timeline').remove();
                if (savedWatch.percent > 0 && savedWatch.percent < 90) {
                    activeCard.append('<div class="full-episode__timeline"><div class="full-episode__timeline-bar" style="width:' + savedWatch.percent + '%;"></div></div>');
                }
            }
        }

        function playEpisode(ep, epCardElem, startTime) {
            Lampa.Noty.show('Подготовка: ' + (ep.name || (ep.position + ' серия')) + '...');

            var sId = ep.sourceId || activeSourceId;
            var tId = activeTypeId;

            // Sync watch event to Anixart server history immediately
            if (Auth.isLogged()) {
                Api.addToHistory(releaseId, sId, ep.position).catch(function () {});
            }

            var timelineHash = 'anixart_' + releaseId + '_' + (ep.position != null ? ep.position : 0);
            var timelineObj = Lampa.Timeline.view(timelineHash);
            var resumeSec = (startTime != null && startTime > 10) ? startTime : (timelineObj.time > 10 ? timelineObj.time : 0);

            // Save local watch state
            var watchData = {
                releaseId: releaseId,
                position: ep.position,
                name: ep.name || (ep.position + ' серия'),
                sourceId: sId,
                typeId: tId,
                time: resumeSec || 0,
                duration: timelineObj.duration || 1440,
                percent: timelineObj.percent || 0,
                updated: Date.now()
            };
            Lampa.Storage.set('anixart_watch_' + releaseId, watchData);
            refreshEpisodesUI();

            function playInPlayer(streamUrl) {
                if (streamUrl.indexOf('//') === 0) streamUrl = 'http:' + streamUrl;
                else if (streamUrl.indexOf('https://') === 0 && (streamUrl.indexOf('solodcdn.com') >= 0 || streamUrl.indexOf('kodik-cdn.com') >= 0 || streamUrl.indexOf('libria') >= 0)) {
                    streamUrl = streamUrl.replace('https://', 'http://');
                }

                if (resumeSec > 10) {
                    timelineObj.time = resumeSec;
                    timelineObj.percent = Math.max(1, Math.round(resumeSec / (timelineObj.duration || 1440) * 100));
                    timelineObj.continued = false;
                    Lampa.Timeline.update({
                        hash: timelineHash,
                        time: resumeSec,
                        duration: timelineObj.duration || 1440,
                        percent: timelineObj.percent
                    });
                }

                var fullTitle = (release.title_ru || release.title || 'Аниме') + ' - ' + (ep.name || (ep.position + ' серия'));
                var playlist = (currentEpisodes || []).map(function (item) {
                    var itemHash = 'anixart_' + releaseId + '_' + (item.position != null ? item.position : 0);
                    return {
                        title: (release.title_ru || release.title || 'Аниме') + ' - ' + (item.name || (item.position + ' серия')),
                        url: item.url,
                        timeline: Lampa.Timeline.view(itemHash)
                    };
                });

                Lampa.Player.play({
                    title: fullTitle,
                    url: streamUrl,
                    playlist: playlist,
                    timeline: timelineObj,
                    launch_player: 'inner'
                });

                if (window.anixartWatchTimer) clearInterval(window.anixartWatchTimer);
                window.anixartWatchTimer = setInterval(function () {
                    try {
                        var vid = Lampa.PlayerVideo && Lampa.PlayerVideo.video();
                        if (vid && vid.currentTime > 0) {
                            var cTime = Math.round(vid.currentTime);
                            var dTime = Math.round(vid.duration || 1440);
                            var pct = Math.round(cTime / dTime * 100);

                            watchData.time = cTime;
                            watchData.duration = dTime;
                            watchData.percent = pct;
                            watchData.updated = Date.now();
                            Lampa.Storage.set('anixart_watch_' + releaseId, watchData);

                            Lampa.Timeline.update({
                                hash: timelineHash,
                                time: cTime,
                                duration: dTime,
                                percent: pct
                            });

                            if (pct >= 80 && !ep._markedWatched) {
                                ep._markedWatched = true;
                                if (Auth.isLogged()) {
                                    Api.markWatched(releaseId, sId, ep.position).catch(function () {});
                                }
                            }
                        }
                    } catch (e) {}
                }, 3000);

                Lampa.Player.callback(function () {
                    if (window.anixartWatchTimer) {
                        clearInterval(window.anixartWatchTimer);
                        window.anixartWatchTimer = null;
                    }
                    try {
                        var vid = Lampa.PlayerVideo && Lampa.PlayerVideo.video();
                        if (vid && vid.currentTime > 0) {
                            var cTime = Math.round(vid.currentTime);
                            var dTime = Math.round(vid.duration || 1440);
                            var pct = Math.round(cTime / dTime * 100);

                            watchData.time = cTime;
                            watchData.duration = dTime;
                            watchData.percent = pct;
                            watchData.updated = Date.now();
                            Lampa.Storage.set('anixart_watch_' + releaseId, watchData);

                            Lampa.Timeline.update({
                                hash: timelineHash,
                                time: cTime,
                                duration: dTime,
                                percent: pct
                            });

                            if (pct >= 80 && !ep._markedWatched) {
                                ep._markedWatched = true;
                                if (Auth.isLogged()) {
                                    Api.markWatched(releaseId, sId, ep.position).catch(function () {});
                                }
                            }
                        }
                    } catch (e) {}
                    refreshEpisodesUI();
                });
            }

            function playInIframe(iframeUrl) {
                if (window.Lampa.Iframe) {
                    Lampa.Iframe.show({
                        url: iframeUrl,
                        onBack: function () {
                            if (Auth.isLogged()) {
                                Api.markWatched(releaseId, sId, ep.position).catch(function () {});
                            }
                            watchData.percent = 100;
                            watchData.updated = Date.now();
                            Lampa.Storage.set('anixart_watch_' + releaseId, watchData);

                            Lampa.Controller.toggle('content');
                            refreshEpisodesUI();
                        }
                    });
                } else {
                    Lampa.Noty.show('Плеер iframe недоступен');
                }
            }

            StreamResolver.resolve(ep.url, { releaseId: releaseId, position: ep.position }).then(function (stream) {
                if (stream && stream.url) {
                    playInPlayer(stream.url);
                } else if (ep.url) {
                    playInIframe(ep.url);
                }
            }).catch(function () {
                if (ep.url) {
                    playInIframe(ep.url);
                } else {
                    Lampa.Noty.show('Ссылка на серию отсутствует');
                }
            });
        }

        function buildCommentsSection() {
            Api.comments(releaseId, 0).then(function (res) {
                var items = (res && res.content) || [];
                if (!items.length) return;

                var commentsLine = $(
                    '<div class="items-line layer--visible layer--render anixart-comments-line">' +
                        '<div class="items-line__head"><div class="items-line__title">Комментарии Anixart (' + items.length + ')</div></div>' +
                        '<div class="items-line__body"></div>' +
                    '</div>'
                );

                var comScroll = new Lampa.Scroll({ horizontal: true, step: 300 });
                comScroll.body().addClass('full-reviews');
                comScroll.onWheel = function (step) {
                    if (step > 0) Nav.move('right');
                    else {
                        if (Nav.canmove('left')) Nav.move('left');
                        else Lampa.Controller.toggle('menu');
                    }
                };

                items.forEach(function (c) {
                    var creator = c.creator || {};
                    var dateStr = c.timestamp ? new Date(c.timestamp * 1000).toLocaleDateString() : '';
                    var card = $(
                        '<div class="full-review selector layer--visible">' +
                            '<div class="anixart-comment-header">' +
                                (creator.avatar ? '<img class="anixart-comment-avatar" src="' + creator.avatar + '">' : '<div class="anixart-comment-avatar"></div>') +
                                '<div class="anixart-comment-author">' + (creator.login || 'Пользователь') + '</div>' +
                                '<div class="anixart-comment-date">' + dateStr + '</div>' +
                            '</div>' +
                            '<div class="anixart-comment-text' + (c.is_spoiler ? ' anixart-comment-spoiler' : '') + '">' +
                                (c.message || '') +
                            '</div>' +
                        '</div>'
                    );

                    card.on('hover:focus', function () {
                        last = card[0];
                        comScroll.update(card, true);
                        if (activeLineElem !== commentsLine[0]) {
                            activeLineElem = commentsLine[0];
                            scroll.update(commentsLine);
                        }
                    }).on('hover:enter', function () {
                        Lampa.Modal.open({
                            title: 'Комментарий: ' + (creator.login || 'Пользователь'),
                            html: $('<div style="padding:1.5em; font-size:1.2em; line-height:1.5; color:#fff;">' + (c.message || '') + '</div>'),
                            size: 'medium',
                            buttons: [{ name: 'Закрыть', onSelect: function () { Lampa.Modal.close(); Lampa.Controller.toggle('content'); } }],
                            onBack: function () { Lampa.Modal.close(); Lampa.Controller.toggle('content'); }
                        });
                    });

                    comScroll.append(card);
                });

                commentsLine.find('.items-line__body').append(comScroll.render());
                scroll.append(commentsLine);
                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                Lampa.Controller.collectionSet(scroll.render());
                if (last && window.Navigator) window.Navigator.focus(last);
            }).catch(function () {});
        }

        function getCardFocusedElement() {
            var cur = document.querySelector('.focus');
            if (cur) return cur;
            if (window.Navigator && window.Navigator.getFocusedElement) {
                var el = window.Navigator.getFocusedElement();
                if (el) return el;
            }
            if (window.Navigator && window.Navigator._focus) return window.Navigator._focus;
            return last || null;
        }

        function cardHandleDown() {
            if (Nav.canmove('down')) {
                Nav.move('down');
                return;
            }
            var cur = getCardFocusedElement();
            if (cur) {
                var curLine = $(cur).closest('.items-line, .full-start-new__buttons, .full-start-new');
                if (curLine.length) {
                    var nextLine = curLine.nextAll('.items-line:first');
                    if (!nextLine.length && curLine.hasClass('full-start-new')) {
                        nextLine = scroll.render().find('.items-line:first');
                    }
                    if (nextLine.length) {
                        if (nextLine.hasClass('anixart-episodes-line')) {
                            var activeEp = nextLine.find('.full-episode--active')[0] || nextLine.find('.selector:first')[0];
                            if (activeEp) {
                                last = activeEp;
                                scroll.update($(activeEp));
                                if (window.Navigator) window.Navigator.focus(activeEp);
                                $(activeEp).trigger('hover:focus');
                                return;
                            }
                        }
                        var nextCards = nextLine.find('.selector');
                        if (nextCards.length) {
                            var curR = cur.getBoundingClientRect();
                            var curX = (curR.left + curR.right) / 2;
                            var bestCard = nextCards[0];
                            var bestDist = Infinity;
                            nextCards.each(function () {
                                var r = this.getBoundingClientRect();
                                var c = (r.left + r.right) / 2;
                                var d = Math.abs(c - curX);
                                if (d < bestDist) {
                                    bestDist = d;
                                    bestCard = this;
                                }
                            });
                            if (bestCard) {
                                last = bestCard;
                                if (window.Navigator) window.Navigator.focus(bestCard);
                                $(bestCard).trigger('hover:focus');
                            }
                        }
                    }
                }
            }
        }

        function cardHandleUp() {
            if (Nav.canmove('up')) {
                Nav.move('up');
                return;
            }
            var cur = getCardFocusedElement();
            if (cur) {
                var curLine = $(cur).closest('.items-line');
                if (curLine.length) {
                    var prevLine = curLine.prevAll('.items-line:first');
                    if (!prevLine.length) {
                        // Move up to header buttons (full-start-new buttons)
                        var btns = scroll.render().find('.full-start-new .selector');
                        if (btns.length) {
                            var bestCard = btns[0];
                            last = bestCard;
                            scroll.reset();
                            if (window.Navigator) window.Navigator.focus(bestCard);
                            $(bestCard).trigger('hover:focus');
                            return;
                        }
                    } else {
                        if (prevLine.hasClass('anixart-dub-line')) {
                            var activeTag = prevLine.find('.full-descr__tag.active')[0] || prevLine.find('.selector:first')[0];
                            if (activeTag) {
                                last = activeTag;
                                scroll.update($(activeTag));
                                if (window.Navigator) window.Navigator.focus(activeTag);
                                $(activeTag).trigger('hover:focus');
                                return;
                            }
                        }
                        var prevCards = prevLine.find('.selector');
                        if (prevCards.length) {
                            var curR = cur.getBoundingClientRect();
                            var curX = (curR.left + curR.right) / 2;
                            var bestCard = prevCards[0];
                            var bestDist = Infinity;
                            prevCards.each(function () {
                                var r = this.getBoundingClientRect();
                                var c = (r.left + r.right) / 2;
                                var d = Math.abs(c - curX);
                                if (d < bestDist) {
                                    bestDist = d;
                                    bestCard = this;
                                }
                            });
                            if (bestCard) {
                                last = bestCard;
                                if (window.Navigator) window.Navigator.focus(bestCard);
                                $(bestCard).trigger('hover:focus');
                                return;
                            }
                        }
                    }
                }
            }
            Lampa.Controller.toggle('head');
        }

        function cardHandleLeft() {
            if (Nav.canmove('left')) {
                Nav.move('left');
            } else {
                Lampa.Controller.toggle('menu');
            }
        }

        function cardHandleRight() {
            Nav.move('right');
        }

        this.start = function () {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            setTimeout(function () {
                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            }, 100);

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    if (!last || !$.contains(scroll.render()[0], last)) {
                        last = scroll.render().find('.selector:first')[0];
                    }
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                left: cardHandleLeft,
                right: cardHandleRight,
                up: cardHandleUp,
                down: cardHandleDown,
                enter: function () {
                    var cur = getCardFocusedElement();
                    if (cur) $(cur).trigger('hover:enter');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    // --- Component: Main Screen with Persistent Panes (ComponentMain) ---
    function ComponentMain(object) {
        var scroll = new Lampa.Scroll({ mask: false, over: true, step: 250 });
        scroll.minus();
        scroll.onWheel = function (step) {
            if (step > 0) handleDown();
            else handleUp();
        };

        var html = $('<div class="anixart-main-container"></div>');
        var currentTab = (object && object.tab) || 'catalog'; // catalog, search, bookmarks
        var catalogCategory = 'latest'; // latest, watching, popular, discussing, top

        // Native Lampa Tabs
        var navTabs = $(
            '<div class="navigation-tabs anixart-nav-tabs">' +
                '<div class="navigation-tabs__button selector' + (currentTab === 'catalog' ? ' active' : '') + '" data-tab="catalog">Каталог</div>' +
                '<div class="navigation-tabs__split">|</div>' +
                '<div class="navigation-tabs__button selector' + (currentTab === 'search' ? ' active' : '') + '" data-tab="search">Поиск</div>' +
                '<div class="navigation-tabs__split">|</div>' +
                '<div class="navigation-tabs__button selector' + (currentTab === 'bookmarks' ? ' active' : '') + '" data-tab="bookmarks">Избранное</div>' +
            '</div>'
        );

        // Persistent DOM Panes
        var contentBox = $('<div class="anixart-tab-content"></div>');
        var paneCatalog = $('<div class="anixart-tab-pane" style="display:' + (currentTab === 'catalog' ? 'block' : 'none') + '"></div>');
        var paneSearch = $('<div class="anixart-tab-pane" style="display:' + (currentTab === 'search' ? 'block' : 'none') + '"></div>');
        var paneBookmarks = $('<div class="anixart-tab-pane" style="display:' + (currentTab === 'bookmarks' ? 'block' : 'none') + '"></div>');

        contentBox.append(paneCatalog);
        contentBox.append(paneSearch);
        contentBox.append(paneBookmarks);

        html.append(navTabs);
        html.append(contentBox);
        scroll.render().find('.scroll__body').append(html);

        var last = null;
        var activeRegister = 1;
        var currentBookmarkSort = 'last_view';
        var registerSorts = {
            1: 'last_view',
            2: '1',
            3: '1',
            4: '1',
            5: '1',
            6: '1'
        };
        var bookmarkSeenIds = {};

        function getSortLabel(sortKey) {
            switch (sortKey) {
                case 'last_view': return 'По последнему просмотру';
                case '1': return 'По дате добавления (новые)';
                case '2': return 'По дате добавления (старые)';
                case '3': return 'По году выхода (новые)';
                case '4': return 'По году выхода (старые)';
                case '5': return 'По названию (А — Я)';
                case '6': return 'По названию (Я — А)';
                default: return 'По дате добавления';
            }
        }

        var catalogBuilt = false;
        var searchBuilt = false;
        var bookmarksBuilt = false;

        var catalogPage = 0;
        var catalogLoading = false;
        var searchPage = 0;
        var searchLoading = false;
        var currentSearchQuery = '';
        var bookmarkPage = 0;
        var bookmarkLoading = false;

        function getActivePane() {
            if (currentTab === 'search') return paneSearch;
            if (currentTab === 'bookmarks') return paneBookmarks;
            return paneCatalog;
        }

        function getFocusedElement() {
            var cur = document.querySelector('.focus');
            if (cur) return cur;
            if (window.Navigator && window.Navigator.getFocusedElement) {
                var el = window.Navigator.getFocusedElement();
                if (el) return el;
            }
            if (window.Navigator && window.Navigator._focus) return window.Navigator._focus;
            return last || null;
        }

        function isNavTabsFocused() {
            var cur = getFocusedElement();
            if (!cur) return false;
            return Boolean(navTabs[0] && (navTabs[0] === cur || $.contains(navTabs[0], cur)));
        }

        function isCatTabsFocused() {
            var cur = getFocusedElement();
            if (!cur) return false;
            var cTabs = paneCatalog.find('.anixart-cat-tabs')[0];
            return Boolean(cTabs && (cTabs === cur || $.contains(cTabs, cur)));
        }

        function isRegTabsFocused() {
            var cur = getFocusedElement();
            if (!cur) return false;
            var rTabs = paneBookmarks.find('.anixart-registers-line')[0];
            return Boolean(rTabs && (rTabs === cur || $.contains(rTabs, cur)));
        }

        function isSortBtnFocused() {
            var cur = getFocusedElement();
            if (!cur) return false;
            var sBtn = paneBookmarks.find('.anixart-sort-btn')[0];
            return Boolean(sBtn && (sBtn === cur || $.contains(sBtn, cur)));
        }

        function switchCatTab(cat, focusAfter) {
            if (cat === catalogCategory) {
                if (focusAfter) {
                    var btn = paneCatalog.find('.anixart-cat-tabs .navigation-tabs__button[data-cat="' + cat + '"]')[0];
                    if (btn) {
                        last = btn;
                        if (window.Navigator) window.Navigator.focus(btn);
                        $(btn).trigger('hover:focus');
                    }
                }
                return;
            }
            var subTabs = paneCatalog.find('.anixart-cat-tabs');
            subTabs.find('.navigation-tabs__button').removeClass('active');
            var targetBtn = subTabs.find('.navigation-tabs__button[data-cat="' + cat + '"]');
            targetBtn.addClass('active');
            catalogCategory = cat;
            catalogPage = 0;
            loadCatalogCategory(cat, true);
            if (focusAfter && targetBtn.length) {
                last = targetBtn[0];
                if (window.Navigator) window.Navigator.focus(targetBtn[0]);
                targetBtn.trigger('hover:focus');
            }
        }

        function focusTabs(preferTab) {
            var tabName = preferTab || currentTab;
            var targetTab = navTabs.find('.navigation-tabs__button[data-tab="' + tabName + '"]')[0] ||
                            navTabs.find('.navigation-tabs__button.active')[0] ||
                            navTabs.find('.navigation-tabs__button:first')[0];
            if (targetTab) {
                last = targetTab;
                scroll.reset();
                Lampa.Controller.collectionSet(scroll.render());
                Lampa.Controller.collectionFocus(targetTab, scroll.render());
                if (window.Navigator) window.Navigator.focus(targetTab);
                $(targetTab).trigger('hover:focus');
            }
        }

        // --- Card Generator ---
        function renderCard(item, bookmarkContext) {
            var posterUrl = item.image || (item.poster ? 'https://s.anixmirai.com/posters/' + item.poster + '.jpg' : '');
            var gradeStr = item.grade ? Number(item.grade).toFixed(1) : (item.rating ? String(item.rating) : '');
            var epStr = item.episodes_released ? item.episodes_released + (item.episodes_total ? '/' + item.episodes_total : '') + ' эп.' : '';

            var epWatched = '';
            var localSaved = Lampa.Storage.get('anixart_watch_' + item.id);
            if (localSaved && localSaved.name) {
                epWatched = localSaved.name;
            } else if (item.last_view_episode) {
                if (typeof item.last_view_episode === 'string') {
                    epWatched = item.last_view_episode;
                } else if (item.last_view_episode.name) {
                    epWatched = item.last_view_episode.name;
                } else if (item.last_view_episode.position) {
                    epWatched = item.last_view_episode.position + ' сер.';
                }
            }
            var badgeText = epWatched || epStr;

            var card = $(
                '<div class="card selector layer--visible">' +
                    '<div class="card__view">' +
                        '<img class="card__img" src="' + posterUrl + '" onerror="this.src=\'./img/img_broken.svg\'">' +
                        (badgeText ? '<div class="card__episodes-badge' + (epWatched ? ' card__episodes-badge--watched' : '') + '">' + badgeText + '</div>' : '') +
                        (gradeStr ? '<div class="card__vote">★ ' + gradeStr + '</div>' : '') +
                    '</div>' +
                    '<div class="card__title">' + (item.title_ru || item.title || item.title_original || 'Аниме') + '</div>' +
                    '<div class="card__age">' + (item.year || (item.category ? item.category.name : '')) + '</div>' +
                '</div>'
            );

            card.on('hover:focus', function () {
                last = this;
                scroll.update($(this));
                checkInfiniteScroll();
            }).on('hover:enter', function () {
                Lampa.Activity.push({
                    component: 'anixart_card',
                    release: item,
                    id: item.id
                });
            });

            if (bookmarkContext) {
                card.on('hover:long', function () {
                    showBookmarkCardMenu(item, card);
                });
            }

            return card;
        }

        function showBookmarkCardMenu(item, cardElem) {
            var menuItems = [
                { title: 'Открыть релиз', action: 'open' },
                { title: 'Смотрю', action: 'list', status: 1 },
                { title: 'В планах', action: 'list', status: 2 },
                { title: 'Просмотрено', action: 'list', status: 3 },
                { title: 'Отложено', action: 'list', status: 4 },
                { title: 'Брошено', action: 'list', status: 5 },
                { title: 'Удалить из этого списка', action: 'delete' }
            ];

            Lampa.Select.show({
                title: item.title_ru || item.title || 'Действие с релизом',
                items: menuItems,
                onSelect: function (sel) {
                    Lampa.Controller.toggle('content');
                    if (sel.action === 'open') {
                        Lampa.Activity.push({ component: 'anixart_card', release: item, id: item.id });
                    } else if (sel.action === 'delete') {
                        if (activeRegister <= 5) {
                            Api.deleteFromList(activeRegister, item.id);
                        } else if (activeRegister === 6) {
                            Api.deleteFavorite(item.id);
                        } else if (activeRegister === 7) {
                            Api.deleteFromHistory(item.id);
                        }
                        cardElem.remove();
                        Lampa.Noty.show('Удалено из списка');
                        preloadCounters();
                    } else if (sel.action === 'list') {
                        Api.addToList(sel.status, item.id).then(function () {
                            Lampa.Noty.show('Перемещено в: ' + sel.title);
                            cardElem.remove();
                            preloadCounters();
                        });
                    }
                }
            });
        }

        function checkInfiniteScroll() {
            var cur = getFocusedElement();
            if (!cur) return;

            if (currentTab === 'catalog') {
                if (catalogLoading) return;
                var cards = paneCatalog.find('.category-full .card');
                var idx = cards.index(cur);
                if (idx >= 0 && idx >= cards.length - 12) {
                    catalogPage++;
                    loadCatalogCategory(catalogCategory, false);
                }
            } else if (currentTab === 'search') {
                if (searchLoading || !currentSearchQuery) return;
                var sCards = paneSearch.find('.category-full .card');
                var sIdx = sCards.index(cur);
                if (sIdx >= 0 && sIdx >= sCards.length - 12) {
                    searchPage++;
                    loadSearchPage(false);
                }
            } else if (currentTab === 'bookmarks') {
                if (bookmarkLoading) return;
                var bCards = paneBookmarks.find('.category-full .card');
                var bIdx = bCards.index(cur);
                if (bIdx >= 0 && bIdx >= bCards.length - 12) {
                    bookmarkPage++;
                    loadBookmarkStatus(activeRegister, false);
                }
            }
        }

        // --- CATALOG PANE ---
        function renderCatalog() {
            if (catalogBuilt) return;
            catalogBuilt = true;

            paneCatalog.empty();

            // Native Lampa styled Subtabs (Последнее, Сейчас смотрят, Популярное, ...)
            var subTabs = $(
                '<div class="navigation-tabs anixart-cat-tabs">' +
                    '<div class="navigation-tabs__button selector active" data-cat="latest">Последнее</div>' +
                    '<div class="navigation-tabs__split">|</div>' +
                    '<div class="navigation-tabs__button selector" data-cat="watching">Сейчас смотрят</div>' +
                    '<div class="navigation-tabs__split">|</div>' +
                    '<div class="navigation-tabs__button selector" data-cat="popular">Популярное</div>' +
                    '<div class="navigation-tabs__split">|</div>' +
                    '<div class="navigation-tabs__button selector" data-cat="discussing">Обсуждаемое</div>' +
                    '<div class="navigation-tabs__split">|</div>' +
                    '<div class="navigation-tabs__button selector" data-cat="top">Топ рейтинг</div>' +
                '</div>'
            );

            subTabs.find('.navigation-tabs__button').on('hover:focus', function () {
                last = this;
                scroll.reset();
            }).on('hover:enter', function () {
                var cat = $(this).data('cat');
                switchCatTab(cat, true);
            });

            paneCatalog.append(subTabs);

            var line = $('<div class="items-line layer--visible layer--render"><div class="items-line__body"><div class="category-full"></div></div></div>');
            paneCatalog.append(line);

            loadCatalogCategory('latest', true);
        }

        function loadCatalogCategory(cat, reset) {
            var grid = paneCatalog.find('.category-full');
            if (reset) {
                grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">Загрузка каталога...</div>');
                catalogLoading = true;
            }

            var promise = null;
            if (cat === 'latest') promise = Api.filter({ sort: 0 }, catalogPage);
            else if (cat === 'watching') promise = Api.discoverWatching(catalogPage);
            else if (cat === 'popular') promise = Api.filter({ sort: 3 }, catalogPage);
            else if (cat === 'discussing') promise = Api.discoverDiscussing();
            else if (cat === 'top') promise = Api.filter({ sort: 1 }, catalogPage);

            promise.then(function (res) {
                catalogLoading = false;
                if (reset) grid.empty();

                var items = (res && (res.content || res.releases)) || [];
                if (items.length) {
                    var posters = [];
                    items.forEach(function (rel) {
                        var p = rel.image || (rel.poster ? 'https://s.anixmirai.com/posters/' + rel.poster + '.jpg' : '');
                        if (p) posters.push(p);
                        grid.append(renderCard(rel, false));
                    });
                    PosterCache.preload(posters);
                } else if (reset) {
                    grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">В этом разделе нет релизов</div>');
                }

                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                Lampa.Controller.collectionSet(scroll.render());
                if (last && window.Navigator) window.Navigator.focus(last);
            }).catch(function (err) {
                catalogLoading = false;
                if (reset) {
                    grid.html('<div style="color:#e50914; padding:2em;">Ошибка загрузки каталога: ' + err.message + '</div>');
                }
            });
        }

        // --- SEARCH PANE ---
        function renderSearch() {
            if (searchBuilt) return;
            searchBuilt = true;

            paneSearch.empty();

            var searchBox = $(
                '<div class="anixart-search-box">' +
                    '<div class="anixart-search-input-btn selector">' + ICONS.search + ' <span>Нажмите для поиска аниме...</span></div>' +
                    '<div class="anixart-popular-tags">' +
                        '<div class="anixart-pop-tag selector" data-q="Наруто">Наруто</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Атака титанов">Атака титанов</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Клинок, рассекающий демонов">Клинок</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Магическая битва">Магическая битва</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Блич">Блич</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Ван-Пис">Ван-Пис</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Поднятие уровня в одиночку">Соло левелинг</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Человек-бензопила">Бензопила</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Токийский гуль">Токийский гуль</div>' +
                        '<div class="anixart-pop-tag selector" data-q="Хантер х Хантер">Хантер</div>' +
                    '</div>' +
                '</div>'
            );

            var line = $('<div class="items-line layer--visible layer--render"><div class="items-line__body"><div class="category-full anixart-search-results"></div></div></div>');

            searchBox.find('.anixart-search-input-btn').on('hover:focus', function () {
                last = this;
                scroll.update($(this));
            }).on('hover:enter', function () {
                Lampa.Input.edit({
                    title: 'Поиск аниме в Anixart',
                    value: currentSearchQuery || '',
                    free: true,
                    nosave: true
                }, function (query) {
                    if (query) {
                        currentSearchQuery = query;
                        searchPage = 0;
                        loadSearchPage(true);
                    }
                });
            });

            searchBox.find('.anixart-pop-tag').on('hover:focus', function () {
                last = this;
                scroll.update($(this));
            }).on('hover:enter', function () {
                var q = $(this).data('q');
                currentSearchQuery = q;
                searchPage = 0;
                loadSearchPage(true);
            });

            paneSearch.append(searchBox);
            paneSearch.append(line);
        }

        function loadSearchPage(reset) {
            var grid = paneSearch.find('.anixart-search-results');
            paneSearch.find('.anixart-search-input-btn span').text(currentSearchQuery);

            if (reset) {
                grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">Поиск "' + currentSearchQuery + '"...</div>');
                searchLoading = true;
            }

            Api.search(currentSearchQuery, searchPage).then(function (res) {
                searchLoading = false;
                if (reset) grid.empty();

                var items = (res && (res.content || res.releases)) || [];
                if (items.length) {
                    var posters = [];
                    items.forEach(function (rel) {
                        var p = rel.image || (rel.poster ? 'https://s.anixmirai.com/posters/' + rel.poster + '.jpg' : '');
                        if (p) posters.push(p);
                        grid.append(renderCard(rel, false));
                    });
                    PosterCache.preload(posters);
                } else if (reset) {
                    grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">Ничего не найдено по запросу "' + currentSearchQuery + '"</div>');
                }

                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                Lampa.Controller.collectionSet(scroll.render());
                if (last && window.Navigator) window.Navigator.focus(last);
            }).catch(function (err) {
                searchLoading = false;
                if (reset) {
                    grid.html('<div style="color:#e50914; padding:2em;">Ошибка поиска: ' + err.message + '</div>');
                }
            });
        }

        // --- BOOKMARKS PANE (NATIVE LAMPA REGISTERS) ---
        function renderBookmarks(forceReload) {
            if (bookmarksBuilt && !forceReload) return;
            bookmarksBuilt = true;

            paneBookmarks.empty();

            if (!Auth.isLogged()) {
                var notice = $(
                    '<div class="adrama-auth-notice" style="display:flex; flex-direction:column; align-items:center; padding:4em 2em; text-align:center; gap:1.2em;">' +
                        '<div class="adrama-auth-notice__icon">' + ICONS.bookmarks + '</div>' +
                        '<div class="adrama-auth-notice__title" style="font-size:1.8em; font-weight:700; color:#fff;">Избранное и закладки Anixart</div>' +
                        '<div class="adrama-auth-notice__text" style="font-size:1.15em; color:rgba(255,255,255,0.65); max-width:520px; line-height:1.4;">' +
                            'Войдите в свой аккаунт Anixart, чтобы получить доступ к своим закладкам (Смотрю, В планах, Просмотрено), избранному и истории.' +
                        '</div>' +
                        '<div style="display:flex; gap:1em; margin-top:0.5em;">' +
                            '<div class="navigation-tabs__button selector btn-qr-login" style="background:#e50914; color:#fff; font-size:1.15em; padding:0.8em 1.8em;">Войти по QR-коду</div>' +
                            '<div class="navigation-tabs__button selector btn-pwd-login" style="background:rgba(255,255,255,0.15); font-size:1.15em; padding:0.8em 1.8em;">Войти по логину</div>' +
                        '</div>' +
                    '</div>'
                );

                notice.find('.btn-qr-login').on('hover:focus', function () {
                    last = this;
                    scroll.update($(this));
                }).on('hover:enter', function () {
                    showQrLoginModal(function () {
                        renderBookmarks(true);
                    });
                });

                notice.find('.btn-pwd-login').on('hover:focus', function () {
                    last = this;
                    scroll.update($(this));
                }).on('hover:enter', function () {
                    promptPasswordLogin(function () {
                        renderBookmarks(true);
                    });
                });

                paneBookmarks.append(notice);
                return;
            }

            // Native Registers Line (.anixart-registers-cards .register.selector)
            var regLine = $('<div class="items-line layer--visible layer--render anixart-registers-line"><div class="items-line__body"></div></div>');
            var regScroll = new Lampa.Scroll({ horizontal: true, step: 250 });
            regScroll.body().addClass('items-cards anixart-registers-cards');
            regScroll.onWheel = function (step) {
                if (step > 0) Nav.move('right');
                else {
                    if (Nav.canmove('left')) Nav.move('left');
                    else Lampa.Controller.toggle('menu');
                }
            };

            var registersWrap = regScroll.body();
            var listsConfig = [
                { id: 1, title: 'Смотрю' },
                { id: 2, title: 'В планах' },
                { id: 3, title: 'Просмотрено' },
                { id: 4, title: 'Отложено' },
                { id: 5, title: 'Брошено' },
                { id: 6, title: 'Избранное' },
                { id: 7, title: 'История' }
            ];

            listsConfig.forEach(function (listCfg) {
                var isSubActive = (listCfg.id === activeRegister);
                var reg = $(
                    '<div class="register selector' + (isSubActive ? ' active' : '') + '" data-id="' + listCfg.id + '">' +
                        '<div class="register__name">' + listCfg.title + '</div>' +
                        '<div class="register__counter" data-cnt="' + listCfg.id + '">-</div>' +
                    '</div>'
                );

                reg.on('hover:focus', function () {
                    last = reg[0];
                    regScroll.update(reg, true);
                    scroll.reset();
                }).on('hover:enter', function () {
                    if (activeRegister !== listCfg.id) {
                        registersWrap.find('.register').removeClass('active');
                        reg.addClass('active');
                        activeRegister = listCfg.id;
                        currentBookmarkSort = registerSorts[activeRegister] || (activeRegister === 1 ? 'last_view' : '1');
                        paneBookmarks.find('.anixart-sort-btn__label').text(getSortLabel(currentBookmarkSort));
                        if (activeRegister === 7) {
                            paneBookmarks.find('.anixart-sort-line').hide();
                        } else {
                            paneBookmarks.find('.anixart-sort-line').show();
                        }
                        bookmarkPage = 0;
                        loadBookmarkStatus(listCfg.id, true);
                    }
                });

                registersWrap.append(reg);
            });

            regLine.find('.items-line__body').append(regScroll.render());
            paneBookmarks.append(regLine);

            var sortBar = $(
                '<div class="anixart-sort-line layer--visible layer--render">' +
                    '<div class="anixart-sort-title">Сортировка:</div>' +
                    '<div class="selector anixart-sort-btn">' +
                        '<span class="anixart-sort-btn__label">' + getSortLabel(currentBookmarkSort) + '</span>' +
                        '<span style="font-size:0.8em; opacity:0.7;">▼</span>' +
                    '</div>' +
                '</div>'
            );

            sortBar.find('.anixart-sort-btn').on('hover:focus', function () {
                last = this;
                scroll.update($(this));
            }).on('hover:enter', function () {
                openBookmarksSortMenu();
            });

            paneBookmarks.append(sortBar);

            var contentLine = $('<div class="items-line layer--visible layer--render"><div class="items-line__body"><div class="category-full anixart-bookmarks-grid"></div></div></div>');
            paneBookmarks.append(contentLine);

            if (activeRegister === 7) {
                sortBar.hide();
            } else {
                sortBar.show();
            }

            bookmarkPage = 0;
            loadBookmarkStatus(activeRegister, true);
            preloadCounters();
        }

        function openBookmarksSortMenu() {
            var sortOptions = [];
            if (activeRegister === 1) {
                sortOptions.push({
                    title: 'По последнему просмотру',
                    sort: 'last_view',
                    selected: currentBookmarkSort === 'last_view'
                });
            }
            sortOptions.push(
                { title: 'По дате добавления (новые)', sort: '1', selected: currentBookmarkSort === '1' },
                { title: 'По дате добавления (старые)', sort: '2', selected: currentBookmarkSort === '2' },
                { title: 'По названию (А — Я)', sort: '5', selected: currentBookmarkSort === '5' },
                { title: 'По названию (Я — А)', sort: '6', selected: currentBookmarkSort === '6' },
                { title: 'По году выхода (новые)', sort: '3', selected: currentBookmarkSort === '3' },
                { title: 'По году выхода (старые)', sort: '4', selected: currentBookmarkSort === '4' }
            );

            Lampa.Select.show({
                title: 'Сортировка списка',
                items: sortOptions,
                onSelect: function (sel) {
                    Lampa.Controller.toggle('content');
                    if (currentBookmarkSort !== sel.sort) {
                        currentBookmarkSort = sel.sort;
                        registerSorts[activeRegister] = sel.sort;
                        paneBookmarks.find('.anixart-sort-btn__label').text(getSortLabel(sel.sort));
                        bookmarkPage = 0;
                        loadBookmarkStatus(activeRegister, true);
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function preloadCounters() {
            [1, 2, 3, 4, 5].forEach(function (st) {
                Api.profileList(st, 0).then(function (res) {
                    if (res && res.total_count != null) {
                        paneBookmarks.find('.register__counter[data-cnt="' + st + '"]').text(res.total_count);
                    }
                }).catch(function () {});
            });
            Api.favorites(0).then(function (res) {
                if (res && res.total_count != null) {
                    paneBookmarks.find('.register__counter[data-cnt="6"]').text(res.total_count);
                }
            }).catch(function () {});
            Api.history(0).then(function (res) {
                if (res && res.total_count != null) {
                    paneBookmarks.find('.register__counter[data-cnt="7"]').text(res.total_count);
                }
            }).catch(function () {});
        }

        function loadBookmarkStatus(status, reset) {
            var grid = paneBookmarks.find('.anixart-bookmarks-grid');
            if (reset) {
                grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">Загрузка списка...</div>');
                bookmarkLoading = true;
                bookmarkSeenIds = {};
            }

            if (status === 1 && currentBookmarkSort === 'last_view') {
                if (reset) {
                    Promise.all([
                        Api.history(0).catch(function () { return { content: [] }; }),
                        Api.history(1).catch(function () { return { content: [] }; }),
                        Api.profileList(1, 0, 1).catch(function () { return { content: [] }; })
                    ]).then(function (results) {
                        bookmarkLoading = false;
                        grid.empty();

                        var h0 = results[0].content || results[0].history || [];
                        var h1 = results[1].content || results[1].history || [];
                        var p0 = results[2].content || [];

                        var allItems = [];
                        var histCombined = h0.concat(h1);
                        histCombined.forEach(function (rel) {
                            if (rel && rel.profile_list_status === 1 && !bookmarkSeenIds[rel.id]) {
                                bookmarkSeenIds[rel.id] = true;
                                allItems.push(rel);
                            }
                        });

                        p0.forEach(function (rel) {
                            if (rel && !bookmarkSeenIds[rel.id]) {
                                bookmarkSeenIds[rel.id] = true;
                                allItems.push(rel);
                            }
                        });

                        if (allItems.length) {
                            var posters = [];
                            allItems.forEach(function (rel) {
                                var p = rel.image || (rel.poster ? 'https://s.anixmirai.com/posters/' + rel.poster + '.jpg' : '');
                                if (p) posters.push(p);
                                grid.append(renderCard(rel, true));
                            });
                            PosterCache.preload(posters);
                        } else {
                            grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">Список пуст</div>');
                        }

                        if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                        Lampa.Controller.collectionSet(scroll.render());
                        if (last && window.Navigator) window.Navigator.focus(last);
                    }).catch(function (err) {
                        bookmarkLoading = false;
                        grid.html('<div style="color:#e50914; padding:2em;">Ошибка загрузки списка: ' + err.message + '</div>');
                    });
                    return;
                } else {
                    Api.profileList(1, bookmarkPage, 1).then(function (res) {
                        bookmarkLoading = false;
                        var items = (res && res.content) || [];
                        var newItems = [];
                        items.forEach(function (rel) {
                            if (rel && !bookmarkSeenIds[rel.id]) {
                                bookmarkSeenIds[rel.id] = true;
                                newItems.push(rel);
                            }
                        });

                        if (newItems.length) {
                            var posters = [];
                            newItems.forEach(function (rel) {
                                var p = rel.image || (rel.poster ? 'https://s.anixmirai.com/posters/' + rel.poster + '.jpg' : '');
                                if (p) posters.push(p);
                                grid.append(renderCard(rel, true));
                            });
                            PosterCache.preload(posters);
                            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                            Lampa.Controller.collectionSet(scroll.render());
                        }
                    }).catch(function () {
                        bookmarkLoading = false;
                    });
                    return;
                }
            }

            var promise = null;
            if (status <= 5) promise = Api.profileList(status, bookmarkPage, currentBookmarkSort);
            else if (status === 6) promise = Api.favorites(bookmarkPage, currentBookmarkSort);
            else if (status === 7) promise = Api.history(bookmarkPage);

            promise.then(function (res) {
                bookmarkLoading = false;
                if (reset) grid.empty();

                var items = (res && (res.content || res.releases || res.history)) || [];
                if (items.length) {
                    var posters = [];
                    items.forEach(function (rel) {
                        var p = rel.image || (rel.poster ? 'https://s.anixmirai.com/posters/' + rel.poster + '.jpg' : '');
                        if (p) posters.push(p);
                        grid.append(renderCard(rel, true));
                    });
                    PosterCache.preload(posters);
                } else if (reset) {
                    grid.html('<div style="color:rgba(255,255,255,0.6); padding:2em;">Список пуст</div>');
                }

                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
                Lampa.Controller.collectionSet(scroll.render());
                if (last && window.Navigator) window.Navigator.focus(last);
            }).catch(function (err) {
                bookmarkLoading = false;
                if (reset) {
                    grid.html('<div style="color:#e50914; padding:2em;">Ошибка загрузки списка: ' + err.message + '</div>');
                }
            });
        }

        // --- TAB SWITCHING (0ms INSTANT TOGGLE) ---
        function switchTab(tabName, focusAfter) {
            if (currentTab === tabName && paneCatalog.children().length > 0) return;
            currentTab = tabName;

            navTabs.find('.navigation-tabs__button').removeClass('active');
            navTabs.find('.navigation-tabs__button[data-tab="' + tabName + '"]').addClass('active');

            paneCatalog.hide();
            paneSearch.hide();
            paneBookmarks.hide();

            if (tabName === 'catalog') {
                paneCatalog.show();
                renderCatalog();
            } else if (tabName === 'search') {
                paneSearch.show();
                renderSearch();
            } else if (tabName === 'bookmarks') {
                paneBookmarks.show();
                renderBookmarks();
            }

            scroll.reset();
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();

            if (focusAfter) {
                focusTabs(tabName);
            }
        }

        navTabs.find('.navigation-tabs__button').on('hover:focus', function () {
            last = this;
            scroll.reset();
        }).on('hover:enter', function () {
            var tab = $(this).data('tab');
            switchTab(tab, true);
        });

        // --- SPATIAL NAVIGATION (D-PAD ARROWS) ---
        function handleLeft() {
            if (isNavTabsFocused()) {
                var cur = getFocusedElement();
                var tabBtn = $(cur).closest('.navigation-tabs__button');
                var tabName = tabBtn.data('tab') || currentTab;

                if (tabName === 'bookmarks') {
                    switchTab('search', false);
                    focusTabs('search');
                    return;
                } else if (tabName === 'search') {
                    switchTab('catalog', false);
                    focusTabs('catalog');
                    return;
                } else if (tabName === 'catalog') {
                    Lampa.Controller.toggle('menu');
                    return;
                }
            }

            if (isCatTabsFocused()) {
                var cur = getFocusedElement();
                var curBtn = $(cur).closest('.navigation-tabs__button');
                var prevBtn = curBtn.prevAll('.navigation-tabs__button:first')[0];
                if (prevBtn) {
                    var catKey = $(prevBtn).data('cat');
                    switchCatTab(catKey, true);
                    return;
                } else {
                    Lampa.Controller.toggle('menu');
                    return;
                }
            }

            if (isSortBtnFocused()) {
                Lampa.Controller.toggle('menu');
                return;
            }

            if (Nav.canmove('left')) {
                Nav.move('left');
            } else {
                Lampa.Controller.toggle('menu');
            }
        }

        function handleRight() {
            if (isNavTabsFocused()) {
                var cur = getFocusedElement();
                var tabBtn = $(cur).closest('.navigation-tabs__button');
                var tabName = tabBtn.data('tab') || currentTab;

                if (tabName === 'catalog') {
                    switchTab('search', false);
                    focusTabs('search');
                    return;
                } else if (tabName === 'search') {
                    switchTab('bookmarks', false);
                    focusTabs('bookmarks');
                    return;
                } else if (tabName === 'bookmarks') {
                    return; // rightmost tab
                }
            }

            if (isCatTabsFocused()) {
                var cur = getFocusedElement();
                var curBtn = $(cur).closest('.navigation-tabs__button');
                var nextBtn = curBtn.nextAll('.navigation-tabs__button:first')[0];
                if (nextBtn) {
                    var catKey = $(nextBtn).data('cat');
                    switchCatTab(catKey, true);
                    return;
                }
                return;
            }

            if (isSortBtnFocused()) {
                return;
            }

            Nav.move('right');
        }

        function handleUp() {
            if (isNavTabsFocused()) {
                Lampa.Controller.toggle('head');
                return;
            }

            if (isCatTabsFocused()) {
                scroll.reset();
                focusTabs('catalog');
                return;
            }

            if (isRegTabsFocused()) {
                scroll.reset();
                focusTabs('bookmarks');
                return;
            }

            if (isSortBtnFocused()) {
                var activeReg = paneBookmarks.find('.anixart-registers-line .register.active')[0] ||
                                paneBookmarks.find('.anixart-registers-line .register:first')[0];
                if (activeReg) {
                    last = activeReg;
                    scroll.reset();
                    if (window.Navigator) window.Navigator.focus(activeReg);
                    $(activeReg).trigger('hover:focus');
                    return;
                }
            }

            if (Nav.canmove('up')) {
                Nav.move('up');
                return;
            }

            // Cannot move up, we are on top of pane
            var cur = getFocusedElement();
            if (cur) {
                if (currentTab === 'catalog') {
                    var sTabs = paneCatalog.find('.anixart-cat-tabs .navigation-tabs__button.selector');
                    if (sTabs.length) {
                        var curR = cur.getBoundingClientRect();
                        var curX = (curR.left + curR.right) / 2;
                        var best = sTabs[0];
                        var bestDist = Infinity;
                        sTabs.each(function () {
                            var r = this.getBoundingClientRect();
                            var d = Math.abs((r.left + r.right) / 2 - curX);
                            if (d < bestDist) { bestDist = d; best = this; }
                        });
                        last = best;
                        scroll.reset();
                        if (window.Navigator) window.Navigator.focus(best);
                        $(best).trigger('hover:focus');
                        return;
                    }
                } else if (currentTab === 'bookmarks') {
                    var sBtn = paneBookmarks.find('.anixart-sort-btn:visible')[0];
                    if (sBtn) {
                        last = sBtn;
                        scroll.reset();
                        if (window.Navigator) window.Navigator.focus(sBtn);
                        $(sBtn).trigger('hover:focus');
                        return;
                    }

                    var bTabs = paneBookmarks.find('.register.selector');
                    if (bTabs.length) {
                        var curR = cur.getBoundingClientRect();
                        var curX = (curR.left + curR.right) / 2;
                        var best = bTabs[0];
                        var bestDist = Infinity;
                        bTabs.each(function () {
                            var r = this.getBoundingClientRect();
                            var d = Math.abs((r.left + r.right) / 2 - curX);
                            if (d < bestDist) { bestDist = d; best = this; }
                        });
                        last = best;
                        scroll.reset();
                        if (window.Navigator) window.Navigator.focus(best);
                        $(best).trigger('hover:focus');
                        return;
                    }
                } else if (currentTab === 'search') {
                    var sInput = paneSearch.find('.anixart-search-input-btn.selector')[0];
                    if (sInput && sInput !== cur) {
                        last = sInput;
                        scroll.reset();
                        if (window.Navigator) window.Navigator.focus(sInput);
                        $(sInput).trigger('hover:focus');
                        return;
                    }
                }
            }

            focusTabs();
        }

        function handleDown() {
            if (isNavTabsFocused()) {
                if (currentTab === 'catalog') {
                    var subTabBtn = paneCatalog.find('.anixart-cat-tabs .navigation-tabs__button.active')[0] ||
                                    paneCatalog.find('.anixart-cat-tabs .navigation-tabs__button:first')[0];
                    if (subTabBtn) {
                        last = subTabBtn;
                        if (window.Navigator) window.Navigator.focus(subTabBtn);
                        $(subTabBtn).trigger('hover:focus');
                        return;
                    }
                } else if (currentTab === 'bookmarks') {
                    var activeReg = paneBookmarks.find('.anixart-registers-line .register.active')[0] ||
                                    paneBookmarks.find('.anixart-registers-line .register:first')[0];
                    if (activeReg) {
                        last = activeReg;
                        if (window.Navigator) window.Navigator.focus(activeReg);
                        $(activeReg).trigger('hover:focus');
                        return;
                    }
                }

                var firstEl = getActivePane().find('.selector:first')[0];
                if (firstEl) {
                    last = firstEl;
                    if (window.Navigator) window.Navigator.focus(firstEl);
                    $(firstEl).trigger('hover:focus');
                }
                return;
            }

            if (isCatTabsFocused()) {
                var cards = paneCatalog.find('.category-full .card.selector');
                if (cards.length) {
                    var cur = getFocusedElement();
                    var curR = cur ? cur.getBoundingClientRect() : null;
                    var curX = curR ? (curR.left + curR.right) / 2 : 0;
                    var best = cards[0];
                    var bestDist = Infinity;
                    cards.each(function () {
                        var r = this.getBoundingClientRect();
                        var d = Math.abs((r.left + r.right) / 2 - curX);
                        if (d < bestDist) { bestDist = d; best = this; }
                    });
                    last = best;
                    if (window.Navigator) window.Navigator.focus(best);
                    $(best).trigger('hover:focus');
                    return;
                }
            }

            if (isRegTabsFocused()) {
                var sBtn = paneBookmarks.find('.anixart-sort-btn:visible')[0];
                if (sBtn) {
                    last = sBtn;
                    if (window.Navigator) window.Navigator.focus(sBtn);
                    $(sBtn).trigger('hover:focus');
                    return;
                }

                var bCards = paneBookmarks.find('.anixart-bookmarks-grid .card.selector');
                if (bCards.length) {
                    var cur = getFocusedElement();
                    var curR = cur ? cur.getBoundingClientRect() : null;
                    var curX = curR ? (curR.left + curR.right) / 2 : 0;
                    var best = bCards[0];
                    var bestDist = Infinity;
                    bCards.each(function () {
                        var r = this.getBoundingClientRect();
                        var d = Math.abs((r.left + r.right) / 2 - curX);
                        if (d < bestDist) { bestDist = d; best = this; }
                    });
                    last = best;
                    if (window.Navigator) window.Navigator.focus(best);
                    $(best).trigger('hover:focus');
                    return;
                }
            }

            if (isSortBtnFocused()) {
                var bCards = paneBookmarks.find('.anixart-bookmarks-grid .card.selector');
                if (bCards.length) {
                    var firstCard = bCards[0];
                    last = firstCard;
                    if (window.Navigator) window.Navigator.focus(firstCard);
                    $(firstCard).trigger('hover:focus');
                    return;
                }
            }

            if (Nav.canmove('down')) {
                Nav.move('down');
                return;
            }

            // Fallback for grid row navigation
            var cur = getFocusedElement();
            if (cur) {
                var allCards = getActivePane().find('.category-full .card.selector');
                if (allCards.length) {
                    var curR = cur.getBoundingClientRect();
                    var curX = (curR.left + curR.right) / 2;
                    var nextRowCards = [];
                    allCards.each(function () {
                        var r = this.getBoundingClientRect();
                        if (r.top >= curR.bottom - 5) {
                            nextRowCards.push(this);
                        }
                    });
                    if (nextRowCards.length) {
                        var best = nextRowCards[0];
                        var bestDist = Infinity;
                        var firstRowTop = nextRowCards[0].getBoundingClientRect().top;
                        for (var i = 0; i < nextRowCards.length; i++) {
                            var r = nextRowCards[i].getBoundingClientRect();
                            if (Math.abs(r.top - firstRowTop) > 40) break;
                            var d = Math.abs((r.left + r.right) / 2 - curX);
                            if (d < bestDist) { bestDist = d; best = nextRowCards[i]; }
                        }
                        if (best) {
                            last = best;
                            if (window.Navigator) window.Navigator.focus(best);
                            $(best).trigger('hover:focus');
                        }
                    }
                }
            }
        }

        function ControllerFocus() {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            Lampa.Controller.collectionSet(scroll.render());
            if (!last || !$.contains(scroll.render()[0], last)) {
                last = navTabs.find('.navigation-tabs__button.active')[0] || scroll.render().find('.selector:first')[0];
            }
            if (isNavTabsFocused() || $.contains(navTabs[0], last)) {
                scroll.reset();
            }
            Lampa.Controller.collectionFocus(last || false, scroll.render());
        }

        this.start = function () {
            if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            setTimeout(function () {
                if (Lampa.Layer && Lampa.Layer.update) Lampa.Layer.update();
            }, 100);

            Lampa.Controller.add('content', {
                toggle: function () {
                    ControllerFocus();
                },
                left: handleLeft,
                right: handleRight,
                up: handleUp,
                down: handleDown,
                enter: function () {
                    var cur = getFocusedElement();
                    if (cur) $(cur).trigger('hover:enter');
                },
                back: function () {
                    if (currentTab !== 'catalog') {
                        switchTab('catalog', false);
                        focusTabs('catalog');
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.create = function () {
            switchTab(currentTab, false);
            return scroll.render();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    // --- Initialization & Lampa Menu Integration ---
    function init() {
        Lampa.Component.add('anixart', ComponentMain);
        Lampa.Component.add('anixart_main', ComponentMain);
        Lampa.Component.add('anixart_card', ComponentCard);

        window.AnixartResolver = StreamResolver;
        window.AnixartApi = Api;
        window.AnixartAuth = Auth;

        // Inject Stylesheet if not present
        if (!$('link[href*="anixart.css"]').length && !$('#anixart-styles').length) {
            $('head').append('<style id="anixart-styles">' + "/* Anixart Plugin for Lampa (TV & webOS) */\n\n.anixart-main-container {\n    padding-top: 0.5em !important;\n    padding-bottom: 3.5em !important;\n}\n\n/* Horizontal card lines layout */\n.items-cards {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    align-items: flex-start !important;\n    padding: 0.8em 1.5em 1.2em 1.5em !important;\n}\n\n.items-cards .card {\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    width: 12.75em !important;\n    margin-right: 1.2em !important;\n}\n\n.items-line {\n    position: relative;\n    margin-bottom: 1.5em;\n}\n\n.items-line__head {\n    padding: 0 1.5em;\n    margin-bottom: 0.4em;\n}\n\n.items-line__title {\n    font-size: 1.4em;\n    font-weight: 700;\n    color: #fff;\n}\n\n.items-line__body {\n    overflow: visible !important;\n    position: relative !important;\n}\n\n/* Card poster vote badge */\n.card__view .card__vote {\n    position: absolute !important;\n    right: 0.3em !important;\n    bottom: 0.3em !important;\n    top: auto !important;\n    left: auto !important;\n    z-index: 2 !important;\n    background: rgba(0, 0, 0, 0.65) !important;\n    color: #fff !important;\n    padding: 0.2em 0.45em !important;\n    border-radius: 0.3em !important;\n    font-size: 0.85em !important;\n    font-weight: 700 !important;\n    line-height: 1 !important;\n}\n\n.card__view .card__episodes-badge {\n    position: absolute !important;\n    left: 0.3em !important;\n    bottom: 0.3em !important;\n    z-index: 2 !important;\n    background: rgba(229, 9, 20, 0.85) !important;\n    color: #fff !important;\n    padding: 0.2em 0.45em !important;\n    border-radius: 0.3em !important;\n    font-size: 0.8em !important;\n    font-weight: 700 !important;\n    line-height: 1 !important;\n}\n\n/* TV card grid layout for Search, Bookmarks, and Catalog */\n.category-full {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-wrap: wrap !important;\n    flex-wrap: wrap !important;\n    padding: 1.2em 1.8em !important;\n    gap: 1.2em !important;\n}\n\n.category-full .card {\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    width: 12.75em !important;\n    margin: 0 1.2em 1.5em 0 !important;\n}\n\n/* --- Native Lampa Navigation Tabs --- */\n.navigation-tabs.anixart-nav-tabs,\n.anixart-nav-tabs.navigation-tabs {\n    margin: 1.2em 1.5em 1.6em 1.5em !important;\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    width: auto !important;\n    background-color: rgba(0, 0, 0, 0.4) !important;\n    border-radius: 0.6em !important;\n    padding: 0.35em !important;\n    border: 1px solid rgba(255, 255, 255, 0.08) !important;\n    box-sizing: border-box !important;\n    align-items: center !important;\n}\n\n.navigation-tabs.anixart-nav-tabs .navigation-tabs__split,\n.anixart-nav-tabs.navigation-tabs .navigation-tabs__split {\n    padding: 0.4em 0.25em !important;\n    opacity: 0.25 !important;\n    color: rgba(255, 255, 255, 0.5) !important;\n    line-height: 1 !important;\n    user-select: none !important;\n}\n\n.navigation-tabs.anixart-nav-tabs .navigation-tabs__button,\n.anixart-nav-tabs.navigation-tabs .navigation-tabs__button {\n    cursor: pointer !important;\n    font-size: 1.15em !important;\n    padding: 0.55em 1.8em !important;\n    border-radius: 0.4em !important;\n    color: rgba(255, 255, 255, 0.75) !important;\n    background-color: transparent !important;\n    white-space: nowrap !important;\n    font-weight: 500 !important;\n    transition: none !important;\n    -webkit-transition: none !important;\n    transform: none !important;\n    -webkit-transform: none !important;\n    box-shadow: none !important;\n}\n\n.navigation-tabs.anixart-nav-tabs .navigation-tabs__button.active,\n.anixart-nav-tabs.navigation-tabs .navigation-tabs__button.active {\n    background-color: rgba(255, 255, 255, 0.25) !important;\n    color: #ffffff !important;\n    font-weight: 600 !important;\n}\n\n.navigation-tabs.anixart-nav-tabs .navigation-tabs__button.focus,\n.anixart-nav-tabs.navigation-tabs .navigation-tabs__button.focus {\n    background-color: #ffffff !important;\n    color: #000000 !important;\n    font-weight: 700 !important;\n    transform: none !important;\n    -webkit-transform: none !important;\n    box-shadow: none !important;\n    z-index: 2 !important;\n}\n\n/* Catalog Sub-tabs (\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u0435, \u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043c\u043e\u0442\u0440\u044f\u0442, \u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u043e\u0435, ...) */\n.navigation-tabs.anixart-cat-tabs,\n.anixart-cat-tabs.navigation-tabs {\n    margin: 0.4em 1.5em 1.2em 1.5em !important;\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    background-color: rgba(0, 0, 0, 0.3) !important;\n    border-radius: 0.5em !important;\n    padding: 0.25em !important;\n    border: 1px solid rgba(255, 255, 255, 0.06) !important;\n}\n\n.navigation-tabs.anixart-cat-tabs .navigation-tabs__button,\n.anixart-cat-tabs.navigation-tabs .navigation-tabs__button {\n    font-size: 1.05em !important;\n    padding: 0.45em 1.2em !important;\n}\n\n/* User profile button in top bar */\n.anixart-header-profile {\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    gap: 0.6em !important;\n    padding: 0.45em 1.2em !important;\n    border-radius: 0.5em !important;\n    background: rgba(255, 255, 255, 0.08) !important;\n    color: rgba(255, 255, 255, 0.8) !important;\n    font-size: 1.05em !important;\n    font-weight: 600 !important;\n    cursor: pointer !important;\n    margin-left: 1.5em !important;\n    vertical-align: middle !important;\n}\n\n.anixart-header-profile.focus {\n    background: #ffffff !important;\n    color: #121212 !important;\n}\n\n.anixart-header-profile__avatar {\n    width: 1.8em !important;\n    height: 1.8em !important;\n    border-radius: 50% !important;\n    object-fit: cover !important;\n}\n\n/* --- Native Lampa Card Details (full-start-new / full-descr / full-episodes) --- */\n.layer--wheight {\n    position: relative;\n    width: 100%;\n    min-height: 100vh;\n}\n\n.full-start__background {\n    position: fixed;\n    top: 0;\n    left: 0;\n    width: 100%;\n    height: 100%;\n    object-fit: cover;\n    z-index: -1;\n    filter: blur(20px) brightness(0.25);\n    -webkit-filter: blur(20px) brightness(0.25);\n    opacity: 0.65;\n    transition: opacity 0.3s, filter 0.3s;\n    -webkit-transition: opacity 0.3s, -webkit-filter 0.3s;\n}\n\n.full-start__background.dim {\n    opacity: 0.25;\n    filter: blur(30px) brightness(0.15);\n    -webkit-filter: blur(30px) brightness(0.15);\n}\n\n.full-start-new__poster img,\n.full-start-new__poster.loaded img,\n.full-start-new__img {\n    opacity: 1 !important;\n    display: block !important;\n}\n\n.full-start-new__head {\n    font-size: 1.15em;\n    color: rgba(255, 255, 255, 0.7);\n    margin-bottom: 0.4em;\n}\n\n.full-start-new__split {\n    margin: 0 0.5em;\n    opacity: 0.5;\n    font-size: 0.7em;\n    vertical-align: middle;\n}\n\n.full-descr__tag {\n    display: inline-block;\n    margin-right: 0.8em;\n    margin-bottom: 0.6em;\n    padding: 0.3em 0.8em;\n    border-radius: 0.5em;\n    background: rgba(255, 255, 255, 0.1);\n    color: rgba(255, 255, 255, 0.85);\n    font-size: 0.95em;\n    cursor: pointer;\n}\n\n.full-descr__tag.focus {\n    background: #ffffff !important;\n    color: #121212 !important;\n}\n\n.full-descr__tag.active {\n    background: #e50914 !important;\n    color: #ffffff !important;\n}\n\n.full-descr__tag.focus.active {\n    background: #ffffff !important;\n    color: #121212 !important;\n}\n\n/* Episodes Carousel */\n.full-episodes {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    padding: 0.8em 1.5em 1.5em 1.5em !important;\n}\n\n.full-episodes .full-episode {\n    margin-right: 1.2em !important;\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n}\n\n/* Comments Carousel (full-reviews) */\n.full-reviews {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    padding: 0.8em 1.5em 1.5em 1.5em !important;\n}\n\n.full-reviews .full-review {\n    margin-right: 1.2em !important;\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    width: 24em !important;\n    padding: 1.2em !important;\n    border-radius: 0.8em !important;\n    background: rgba(255, 255, 255, 0.08) !important;\n    border: 1px solid rgba(255, 255, 255, 0.1) !important;\n    cursor: pointer !important;\n    box-sizing: border-box !important;\n}\n\n.full-reviews .full-review.focus {\n    background: #ffffff !important;\n    color: #121212 !important;\n    border-color: #ffffff !important;\n}\n\n.anixart-comment-header {\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-align-items: center;\n    align-items: center;\n    gap: 0.8em;\n    margin-bottom: 0.8em;\n}\n\n.anixart-comment-avatar {\n    width: 2.2em;\n    height: 2.2em;\n    border-radius: 50%;\n    object-fit: cover;\n    background: rgba(255, 255, 255, 0.15);\n}\n\n.anixart-comment-author {\n    font-weight: 700;\n    font-size: 1.05em;\n    color: inherit;\n}\n\n.anixart-comment-date {\n    font-size: 0.85em;\n    color: rgba(255, 255, 255, 0.5);\n    margin-left: auto;\n}\n\n.full-review.focus .anixart-comment-date {\n    color: rgba(0, 0, 0, 0.5) !important;\n}\n\n.anixart-comment-text {\n    font-size: 1em;\n    line-height: 1.4;\n    color: inherit;\n    max-height: 5.5em;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.anixart-comment-spoiler {\n    filter: blur(5px);\n    -webkit-filter: blur(5px);\n    opacity: 0.5;\n}\n\n.full-review.focus .anixart-comment-spoiler {\n    filter: none !important;\n    -webkit-filter: none !important;\n    opacity: 1 !important;\n}\n\n/* Bookmarks Registers line matching native Lampa (.register.selector) */\n.anixart-registers-line {\n    padding: 0.5em 0 1.2em 0 !important;\n}\n\n.anixart-registers-cards {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    padding: 0.5em 1.5em !important;\n}\n\n.anixart-registers-cards .register {\n    background-color: rgba(0, 0, 0, 0.3) !important;\n    -webkit-border-radius: 1em !important;\n    border-radius: 1em !important;\n    padding: 1em 1.2em !important;\n    line-height: 1.3 !important;\n    position: relative !important;\n    min-width: 9em !important;\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    margin-right: 1.2em !important;\n    cursor: pointer !important;\n    transition: background-color 0.2s ease !important;\n}\n\n.anixart-registers-cards .register.active {\n    background-color: rgba(255, 255, 255, 0.2) !important;\n}\n\n.anixart-registers-cards .register.focus::after {\n    content: \"\" !important;\n    position: absolute !important;\n    top: -0.35em !important;\n    left: -0.35em !important;\n    right: -0.35em !important;\n    bottom: -0.35em !important;\n    border: 0.3em solid #fff !important;\n    -webkit-border-radius: 1.3em !important;\n    border-radius: 1.3em !important;\n    pointer-events: none !important;\n}\n\n.register__name {\n    font-size: 1.15em !important;\n    font-weight: 700 !important;\n    color: #ffffff !important;\n}\n\n.register__counter {\n    font-size: 0.95em !important;\n    color: rgba(255, 255, 255, 0.6) !important;\n    margin-top: 0.3em !important;\n}\n\n/* Search Box */\n.anixart-search-box {\n    padding: 0 1.5em 2em 1.5em;\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-flex-direction: column;\n    flex-direction: column;\n    gap: 1.2em;\n}\n\n.anixart-search-input-btn svg {\n    width: 1.4em !important;\n    height: 1.4em !important;\n    min-width: 1.4em !important;\n    min-height: 1.4em !important;\n    max-width: 1.4em !important;\n    max-height: 1.4em !important;\n    flex-shrink: 0 !important;\n    display: block !important;\n}\n\n.anixart-search-input-btn {\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    gap: 0.8em !important;\n    padding: 0.75em 1.6em !important;\n    background: rgba(255, 255, 255, 0.1) !important;\n    border-radius: 0.6em !important;\n    font-size: 1.2em !important;\n    color: #fff !important;\n    border: 2px solid transparent !important;\n    cursor: pointer !important;\n    width: auto !important;\n    max-width: 32em !important;\n    box-sizing: border-box !important;\n    line-height: 1.2 !important;\n    transition: none !important;\n    -webkit-transition: none !important;\n}\n\n.anixart-search-input-btn.focus {\n    border-color: #ffffff !important;\n    background: #ffffff !important;\n    color: #000000 !important;\n}\n\n.anixart-search-input-btn.focus svg {\n    stroke: #000000 !important;\n}\n\n.anixart-popular-tags {\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-flex-wrap: wrap;\n    flex-wrap: wrap;\n    gap: 0.6em;\n    max-width: 80em;\n}\n\n.anixart-pop-tag {\n    background: rgba(255, 255, 255, 0.08);\n    padding: 0.45em 1.1em;\n    border-radius: 2em;\n    font-size: 1em;\n    color: rgba(255, 255, 255, 0.85);\n    cursor: pointer;\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    transition: none;\n    -webkit-transition: none;\n}\n\n.anixart-pop-tag.focus {\n    border-color: #ffffff !important;\n    background: #ffffff !important;\n    color: #000000 !important;\n}\n\n/* QR Code Modal */\n.anixart-qr-modal {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: column !important;\n    flex-direction: column !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    text-align: center !important;\n    padding: 2em !important;\n}\n\n.anixart-qr-container {\n    background: #ffffff !important;\n    padding: 1.2em !important;\n    border-radius: 0.8em !important;\n    box-shadow: 0 0.5em 2em rgba(0, 0, 0, 0.7) !important;\n    margin-bottom: 1.5em !important;\n    width: 250px !important;\n    height: 250px !important;\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    -webkit-justify-content: center !important;\n    justify-content: center !important;\n}\n\n.anixart-qr-container svg {\n    width: 100% !important;\n    height: 100% !important;\n}\n\n.anixart-qr-pin {\n    font-size: 2.2em !important;\n    font-weight: 800 !important;\n    letter-spacing: 0.25em !important;\n    color: #e50914 !important;\n    margin: 0.5em 0 !important;\n    padding: 0.2em 0.8em !important;\n    border-radius: 0.4em !important;\n    background: rgba(229, 9, 20, 0.1) !important;\n}\n\n.anixart-qr-instruction {\n    font-size: 1.15em !important;\n    color: rgba(255, 255, 255, 0.8) !important;\n    margin-bottom: 1.5em !important;\n    max-width: 32em !important;\n    line-height: 1.4 !important;\n}\n\n.anixart-qr-status {\n    font-size: 1.05em !important;\n    color: #2ecc71 !important;\n    margin-bottom: 1em !important;\n}\n\n/* --- Frames & Screenshots (\u041a\u0430\u0434\u0440\u044b \u0438\u0437 \u0430\u043d\u0438\u043c\u0435) --- */\n.items-line--frames {\n    position: relative;\n    margin-bottom: 1.5em;\n}\n\n.items-cards--frames {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-flex-direction: row !important;\n    flex-direction: row !important;\n    -webkit-flex-wrap: nowrap !important;\n    flex-wrap: nowrap !important;\n    -webkit-box-align: start !important;\n    -webkit-align-items: flex-start !important;\n    align-items: flex-start !important;\n    padding: 0.8em 1.5em 1.4em 1.5em !important;\n}\n\n.items-cards--frames .card--frame {\n    -webkit-flex-shrink: 0 !important;\n    flex-shrink: 0 !important;\n    width: 20em !important;\n    margin-right: 1.2em !important;\n    cursor: pointer;\n}\n\n.card--frame .card__view {\n    padding-bottom: 56.25% !important; /* 16:9 widescreen */\n    position: relative !important;\n    -webkit-border-radius: 0.8em !important;\n    border-radius: 0.8em !important;\n    background: #141416 !important;\n    transition: transform 0.2s ease, box-shadow 0.2s ease !important;\n}\n\n.card--frame .card__img {\n    position: absolute !important;\n    top: 0 !important;\n    left: 0 !important;\n    width: 100% !important;\n    height: 100% !important;\n    object-fit: cover !important;\n    -webkit-border-radius: 0.8em !important;\n    border-radius: 0.8em !important;\n    transition: transform 0.25s ease, opacity 0.3s ease !important;\n    opacity: 0;\n}\n\n.card--frame .card__img.loaded {\n    opacity: 1 !important;\n}\n\n.card--frame.focus .card__view {\n    outline: none !important;\n}\n\n.card--frame.focus .card__view::after {\n    content: \"\" !important;\n    position: absolute !important;\n    top: -0.4em !important;\n    left: -0.4em !important;\n    right: -0.4em !important;\n    bottom: -0.4em !important;\n    border: 0.3em solid #fff !important;\n    -webkit-border-radius: 1.2em !important;\n    border-radius: 1.2em !important;\n    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85) !important;\n    z-index: 5 !important;\n    pointer-events: none !important;\n    -webkit-animation: animation-card-focus 0.2s ease !important;\n    animation: animation-card-focus 0.2s ease !important;\n}\n\n.card--frame.hover .card__view::after {\n    border-color: rgba(255, 255, 255, 0.5) !important;\n}\n\n.card--frame.focus .card__img {\n    transform: scale(1.02) !important;\n}\n\n.card--frame .frame__number {\n    position: absolute;\n    bottom: 0.5em;\n    right: 0.6em;\n    padding: 0.15em 0.5em;\n    background: rgba(0, 0, 0, 0.65);\n    border-radius: 0.3em;\n    font-size: 0.8em;\n    font-weight: 600;\n    color: #fff;\n    pointer-events: none;\n    z-index: 2;\n}\n\n.items-line__count {\n    font-size: 0.75em;\n    color: rgba(255, 255, 255, 0.5);\n    font-weight: 400;\n    margin-left: 0.4em;\n}\n\n/* Fullscreen Frame Viewer */\n.frames-viewer {\n    position: fixed;\n    top: 0;\n    left: 0;\n    width: 100vw;\n    height: 100vh;\n    background: rgba(0, 0, 0, 0.94);\n    z-index: 10000;\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-flex-direction: column;\n    flex-direction: column;\n    -webkit-box-pack: center;\n    -webkit-justify-content: center;\n    justify-content: center;\n    -webkit-box-align: center;\n    -webkit-align-items: center;\n    align-items: center;\n    user-select: none;\n    -webkit-user-select: none;\n    animation: frames-fade-in 0.2s ease-out;\n}\n\n@keyframes frames-fade-in {\n    from { opacity: 0; }\n    to { opacity: 1; }\n}\n\n.frames-viewer__head {\n    position: absolute;\n    top: 2em;\n    left: 3.5em;\n    right: 3.5em;\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-box-pack: justify;\n    -webkit-justify-content: space-between;\n    justify-content: space-between;\n    -webkit-box-align: center;\n    -webkit-align-items: center;\n    align-items: center;\n    z-index: 2;\n}\n\n.frames-viewer__title {\n    font-size: 1.6em;\n    font-weight: 700;\n    color: #fff;\n    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);\n    max-width: 75vw;\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.frames-viewer__counter {\n    font-size: 1.3em;\n    color: rgba(255, 255, 255, 0.8);\n    font-weight: 600;\n    background: rgba(255, 255, 255, 0.12);\n    padding: 0.2em 0.8em;\n    border-radius: 0.4em;\n}\n\n.frames-viewer__body {\n    position: relative;\n    width: 90vw;\n    height: 80vh;\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-box-pack: center;\n    -webkit-justify-content: center;\n    justify-content: center;\n    -webkit-box-align: center;\n    -webkit-align-items: center;\n    align-items: center;\n}\n\n.frames-viewer__img {\n    max-width: 100%;\n    max-height: 100%;\n    object-fit: contain;\n    border-radius: 0.6em;\n    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85);\n    transition: opacity 0.2s ease;\n}\n\n.frames-viewer__arrow {\n    position: absolute;\n    top: 50%;\n    transform: translateY(-50%);\n    -webkit-transform: translateY(-50%);\n    width: 3.8em;\n    height: 3.8em;\n    display: -webkit-box;\n    display: -webkit-flex;\n    display: flex;\n    -webkit-box-align: center;\n    -webkit-align-items: center;\n    align-items: center;\n    -webkit-box-pack: center;\n    -webkit-justify-content: center;\n    justify-content: center;\n    color: rgba(255, 255, 255, 0.7);\n    background: rgba(0, 0, 0, 0.5);\n    border: 1px solid rgba(255, 255, 255, 0.15);\n    -webkit-border-radius: 50%;\n    border-radius: 50%;\n    z-index: 10;\n    pointer-events: none;\n    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);\n    transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;\n}\n\n.frames-viewer__arrow svg {\n    width: 2.2em;\n    height: 2.2em;\n    display: block;\n}\n\n.frames-viewer__arrow--left {\n    left: 2em;\n}\n\n.frames-viewer__arrow--right {\n    right: 2em;\n}\n\n.frames-viewer__footer {\n    position: absolute;\n    bottom: 2em;\n    color: rgba(255, 255, 255, 0.5);\n    font-size: 1.05em;\n    text-align: center;\n    z-index: 2;\n}\n\n.anixart-qr-pin-title {\n    font-size: 1.15em !important;\n    color: rgba(255, 255, 255, 0.75) !important;\n    margin-top: 0.5em !important;\n}\n\n.anixart-qr-pin-code {\n    font-size: 2.6em !important;\n    font-weight: 800 !important;\n    letter-spacing: 0.35em !important;\n    color: #fff !important;\n    margin: 0.1em 0 0.4em 0 !important;\n    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8) !important;\n}\n\n/* Bookmarks Sort Bar */\n.anixart-sort-line {\n    display: -webkit-box !important;\n    display: -webkit-flex !important;\n    display: flex !important;\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    -webkit-box-pack: start !important;\n    -webkit-justify-content: flex-start !important;\n    justify-content: flex-start !important;\n    gap: 0.8em !important;\n    padding: 0.4em 1.5em 0.8em 1.5em !important;\n}\n\n.anixart-sort-title {\n    font-size: 1.05em !important;\n    color: rgba(255, 255, 255, 0.6) !important;\n    font-weight: 600 !important;\n    margin-right: 0.2em !important;\n}\n\n.anixart-sort-btn {\n    background: rgba(255, 255, 255, 0.12) !important;\n    padding: 0.45em 1.2em !important;\n    border-radius: 0.4em !important;\n    font-size: 1.05em !important;\n    color: rgba(255, 255, 255, 0.85) !important;\n    display: -webkit-inline-box !important;\n    display: -webkit-inline-flex !important;\n    display: inline-flex !important;\n    -webkit-box-align: center !important;\n    -webkit-align-items: center !important;\n    align-items: center !important;\n    gap: 0.6em !important;\n    cursor: pointer !important;\n    transition: background-color 0.15s, color 0.15s !important;\n    width: auto !important;\n    max-width: -webkit-fit-content !important;\n    max-width: fit-content !important;\n    -webkit-flex: 0 0 auto !important;\n    flex: 0 0 auto !important;\n}\n\n.anixart-sort-btn.focus {\n    background-color: #ffffff !important;\n    color: #000000 !important;\n    font-weight: 700 !important;\n}\n\n.anixart-sort-btn.focus span {\n    color: #000000 !important;\n}\n\n.card__episodes-badge--watched {\n    background: rgba(229, 9, 20, 0.95) !important;\n    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6) !important;\n}\n\n/* Episode Active and Progress */\n.full-episode.full-episode--active {\n    position: relative !important;\n}\n\n.full-episode.full-episode--active:not(.focus) {\n    box-shadow: 0 0 0 2px #e50914 !important;\n}\n\n.full-episode__active-badge {\n    position: absolute !important;\n    top: 0.35em !important;\n    left: 0.35em !important;\n    background: #e50914 !important;\n    color: #ffffff !important;\n    font-size: 0.75em !important;\n    font-weight: 700 !important;\n    padding: 0.15em 0.45em !important;\n    border-radius: 0.3em !important;\n    z-index: 3 !important;\n    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7) !important;\n}\n\n.full-episode__timeline {\n    position: absolute !important;\n    bottom: 0 !important;\n    left: 0 !important;\n    right: 0 !important;\n    height: 4px !important;\n    background: rgba(255, 255, 255, 0.25) !important;\n    z-index: 3 !important;\n    overflow: hidden !important;\n}\n\n.full-episode__timeline-bar {\n    height: 100% !important;\n    background: #e50914 !important;\n}\n\n\n" + '</style>');
        }

        // Add Item to Sidebar Menu: Anixart
        if (Lampa.Menu && Lampa.Menu.addButton) {
            Lampa.Menu.addButton(ICONS.logo, 'Anixart', function () {
                Lampa.Activity.push({ component: 'anixart', title: 'Anixart' });
            });
        }

        // Add Settings Section
        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({
                component: 'anixart_settings',
                name: 'Anixart (Аниме)',
                icon: ICONS.logo
            });

            Lampa.SettingsApi.addParam({
                component: 'anixart_settings',
                param: { name: 'anixart_account_info', type: 'title' },
                field: {
                    name: 'Учетная запись Anixart',
                    description: Auth.isLogged() ? ('Вы вошли как: ' + ((Auth.profile() && (Auth.profile().login || Auth.profile().name)) || 'Пользователь')) : 'Вы не авторизованы'
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'anixart_settings',
                param: { name: 'anixart_login_btn', type: 'button' },
                field: {
                    name: Auth.isLogged() ? 'Управление аккаунтом / Выйти' : 'Войти в аккаунт (QR / пароль)'
                },
                onRender: function (item) {
                    item.on('hover:enter', function () {
                        if (Auth.isLogged()) {
                            showProfileModal();
                        } else {
                            showQrLoginModal();
                        }
                    });
                }
            });
        }
    }

    if (window.appready) {
        init();
    } else if (window.Lampa && window.Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    } else {
        window.addEventListener('load', function () {
            if (window.Lampa && window.Lampa.Listener) {
                Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') init();
                });
            }
        });
    }
})();
