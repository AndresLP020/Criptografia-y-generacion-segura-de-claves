/** Utilidades criptográficas del lado del cliente (Web Crypto API + CSPRNG del navegador). */

export type AesKeySize = 128 | 192 | 256;

const PUBLIC_PEM_LABEL = "PUBLIC KEY";
const PRIVATE_PEM_LABEL = "PRIVATE KEY";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function toPem(label: string, der: ArrayBuffer): string {
  const b64 = arrayBufferToBase64(der);
  const lines = (b64.match(/.{1,64}/g) ?? []).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

export function generateAesKeyBytes(bits: AesKeySize): Uint8Array {
  const bytes = bits / 8;
  const key = new Uint8Array(bytes);
  crypto.getRandomValues(key);
  return key;
}

export function bytesToHexUpper(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** RSA para firma (RSASSA-PKCS1-v1_5): claves en PKCS#8 / SPKI, exponenciales estándar 65537. */
export async function generateRsaKeyPair(modulusLength: 2048 | 3072 | 4096): Promise<{
  publicPem: string;
  privatePem: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicPem: toPem(PUBLIC_PEM_LABEL, spki),
    privatePem: toPem(PRIVATE_PEM_LABEL, pkcs8),
  };
}

export type PasswordCharsetFlags = {
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
};

const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export function buildPasswordAlphabet(flags: PasswordCharsetFlags): string {
  let s = "";
  if (flags.upper) s += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (flags.lower) s += "abcdefghijklmnopqrstuvwxyz";
  if (flags.digits) s += "0123456789";
  if (flags.symbols) s += SYMBOLS;
  return s;
}

/** Selección uniforme con rechazo para evitar sesgo modular (mejor que %). */
export function generatePassword(length: number, alphabet: string): string {
  if (alphabet.length < 2 || length < 1) {
    throw new Error("Alfabeto o longitud inválidos");
  }
  const max = 256 - (256 % alphabet.length);
  let out = "";
  const buf = new Uint8Array(1);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    const x = buf[0]!;
    if (x >= max) continue;
    out += alphabet[x % alphabet.length]!;
  }
  return out;
}

export function passwordEntropyBits(length: number, alphabetSize: number): number {
  if (alphabetSize < 2) return 0;
  return length * (Math.log(alphabetSize) / Math.LN2);
}

/** log10(alphabetSize^length) sin overflow */
export function log10Combinations(length: number, alphabetSize: number): number {
  if (alphabetSize < 2 || length < 1) return 0;
  return length * Math.log10(alphabetSize);
}

export async function hashText(algorithm: "SHA-1" | "SHA-256" | "SHA-512", text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algorithm, data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
