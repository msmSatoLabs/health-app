import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Lets the person choose a photo, crops it square and shrinks it to
 * 512x512 JPEG (about 50-100 KB), so uploads are quick and small.
 * Returns null if they cancel.
 */
export async function pickAvatarJpeg(): Promise<Uint8Array | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets[0]) return null;
  const ctx = ImageManipulator.manipulate(res.assets[0].uri);
  ctx.resize({ width: 512, height: 512 });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!saved.base64) throw new Error('Could not read that photo.');
  return decodeBase64(saved.base64);
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 text -> bytes (small and dependency-free). */
export function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (ALPHABET.indexOf(clean[i]) << 18) |
      (ALPHABET.indexOf(clean[i + 1]) << 12) |
      ((i + 2 < clean.length ? ALPHABET.indexOf(clean[i + 2]) : 0) << 6) |
      (i + 3 < clean.length ? ALPHABET.indexOf(clean[i + 3]) : 0);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}
