import assert from 'node:assert/strict';
import test from 'node:test';

import { identifyNativeBinary } from '../../scripts/validate-vsix-native-artifacts.mjs';

test('identifies Linux x64 native binaries from ELF headers', () => {
  const binary = Buffer.alloc(20);
  binary.set([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], 0);
  binary.writeUInt16LE(0x3e, 18);

  assert.equal(identifyNativeBinary(binary), 'ELF x86-64');
});

test('identifies macOS Apple Silicon native binaries from Mach-O headers', () => {
  const binary = Buffer.alloc(8);
  binary.writeUInt32LE(0xfeedfacf, 0);
  binary.writeInt32LE(0x0100000c, 4);

  assert.equal(identifyNativeBinary(binary), 'Mach-O arm64');
});

test('identifies Windows x64 native binaries from PE headers', () => {
  const binary = Buffer.alloc(160);
  binary.write('MZ', 0, 'ascii');
  binary.writeUInt32LE(0x80, 0x3c);
  binary.write('PE\0\0', 0x80, 'ascii');
  binary.writeUInt16LE(0x8664, 0x84);
  binary.writeUInt16LE(0x20b, 0x98);

  assert.equal(identifyNativeBinary(binary), 'PE32+ x86-64');
});
