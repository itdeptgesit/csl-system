/**
 * Web Crypto API Vault Utility (Zero-Knowledge Client-Side Encryption)
 * 
 * Uses industry-standard:
 * - PBKDF2 with SHA-256 & 100,000 iterations for key derivation from Master Password
 * - AES-256-GCM for authenticated symmetric encryption (confidentiality + integrity)
 * - Cryptographically secure random IV (12 bytes) per encryption
 */

const VERIFIER_CONSTANT = 'CSL_VAULT_AUTHORIZED_V1';
const PBKDF2_ITERATIONS = 100000;

export interface VaultSecretPayload {
  username: string;
  password: string;
  nama_pt?: string;
  notes?: string;
}

export interface EncryptedPackage {
  ciphertext: string; // Base64
  iv: string;         // Base64
}

// Convert ArrayBuffer to Base64 string
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate random salt (16 bytes) in Base64
export function generateSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt);
}

// Derive AES-256-GCM key from master password + salt using PBKDF2
export async function deriveVaultKey(masterPassword: string, saltBase64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const salt = base64ToBuffer(saltBase64);

  // Import raw master password as base key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit key
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt payload object with AES-256-GCM
export async function encryptVaultData(payload: VaultSecretPayload, key: CryptoKey): Promise<EncryptedPackage> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = encoder.encode(JSON.stringify(payload));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv)
  };
}

// Decrypt AES-256-GCM package to payload object
export async function decryptVaultData(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<VaultSecretPayload> {
  const decoder = new TextDecoder();
  const iv = base64ToBuffer(ivBase64);
  const cipherBytes = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    key,
    cipherBytes as unknown as ArrayBuffer
  );

  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr) as VaultSecretPayload;
}

// Create verification token to validate master password later
export async function createVerifierToken(key: CryptoKey): Promise<EncryptedPackage> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = encoder.encode(VERIFIER_CONSTANT);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv)
  };
}

// Verify if the derived key can decrypt the verifier token
export async function verifyVaultKey(key: CryptoKey, verifierCipher: string, verifierIv: string): Promise<boolean> {
  try {
    const decoder = new TextDecoder();
    const iv = base64ToBuffer(verifierIv);
    const cipherBytes = base64ToBuffer(verifierCipher);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      key,
      cipherBytes as unknown as ArrayBuffer
    );

    const token = decoder.decode(decryptedBuffer);
    return token === VERIFIER_CONSTANT;
  } catch {
    return false;
  }
}

// Secure Random Password Generator
export function generateStrongPassword(options: {
  length?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  includeUppercase?: boolean;
} = {}): string {
  const length = options.length ?? 18;
  const includeNumbers = options.includeNumbers ?? true;
  const includeSymbols = options.includeSymbols ?? true;
  const includeUppercase = options.includeUppercase ?? true;

  const lowerChars = 'abcdefghijkmnopqrstuvwxyz'; // without ambiguous l
  const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // without ambiguous I, O
  const numberChars = '23456789';              // without ambiguous 0, 1
  const symbolChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  let allChars = lowerChars;
  const guaranteed: string[] = [lowerChars[Math.floor(Math.random() * lowerChars.length)]];

  if (includeUppercase) {
    allChars += upperChars;
    guaranteed.push(upperChars[Math.floor(Math.random() * upperChars.length)]);
  }
  if (includeNumbers) {
    allChars += numberChars;
    guaranteed.push(numberChars[Math.floor(Math.random() * numberChars.length)]);
  }
  if (includeSymbols) {
    allChars += symbolChars;
    guaranteed.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]);
  }

  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);

  const passwordChars: string[] = [...guaranteed];
  for (let i = guaranteed.length; i < length; i++) {
    const charIndex = randomValues[i] % allChars.length;
    passwordChars.push(allChars[charIndex]);
  }

  // Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
