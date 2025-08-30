"use client";

const SALT = new TextEncoder().encode('salt_lost_wallet_finder');
const PASSWORD = new TextEncoder().encode('static_password_for_demo');
const STORAGE_KEY = 'lost_wallet_finder_saved_wallets';

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    PASSWORD,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: object): Promise<string> {
  const key = await getEncryptionKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  const encryptedPackage = new Uint8Array(iv.length + encryptedContent.byteLength);
  encryptedPackage.set(iv);
  encryptedPackage.set(new Uint8Array(encryptedContent), iv.length);

  return Buffer.from(encryptedPackage).toString('base64');
}

export async function encryptAndSave(dataToSave: object) {
  if (typeof window === 'undefined') return;

  const encryptedData = await encryptData(dataToSave);
  
  // For demo, we just save one. A real app might want to manage a list.
  window.localStorage.setItem(STORAGE_KEY, encryptedData);
}

async function decryptData(encryptedBase64: string): Promise<object> {
    const key = await getEncryptionKey();
    const encryptedPackage = Buffer.from(encryptedBase64, 'base64');
    const iv = encryptedPackage.slice(0, 12);
    const encryptedContent = encryptedPackage.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        encryptedContent
    );
    
    return JSON.parse(new TextEncoder().decode(decryptedContent));
}
