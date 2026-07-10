/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Code-39 Mapping: 5 bars, 4 spaces. 
// Odd indices (0, 2, 4, 6, 8) are bars. Even indices (1, 3, 5, 7) are spaces.
// '0' indicates narrow element, '1' indicates wide element.
const CODE39_ALPHABET: { [key: string]: string } = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100'
};

/**
 * Generates raw SVG rectangles for a Code-39 barcode.
 * @param text The input string to encode (alphanumeric and some symbols)
 * @param height Height of the barcode lines in pixels
 * @returns An object with the SVG rect elements markup and total computed width
 */
export function generateCode39Svg(text: string, height: number = 50): { rectsHtml: string; width: number } {
  // sanitize input for Code-39 (only uppercase alphanumeric and allowed chars)
  const allowed = /^[0-9A-Z\-\.\s\$\/\+\%]+$/;
  let sanitized = text.toUpperCase().trim();
  if (!allowed.test(sanitized)) {
    // strip non-supported chars
    sanitized = sanitized.replace(/[^0-9A-Z\-\.\s\$\/\+\%]/g, '');
  }
  if (!sanitized) sanitized = '0000000000'; // fallback

  const formatted = `*${sanitized}*`;
  let currentX = 0;
  const rects: string[] = [];
  
  // Custom proportions for excellent scannability
  const narrowWidth = 1.2;
  const wideWidth = 3.0;

  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    const pattern = CODE39_ALPHABET[char] || CODE39_ALPHABET[' '];

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      const w = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${w.toFixed(1)}" height="${height}" fill="black" />`);
      }
      currentX += w;
    }
    // 1-unit narrow space between characters
    currentX += narrowWidth;
  }

  return {
    rectsHtml: rects.join(''),
    width: Number(currentX.toFixed(1))
  };
}
