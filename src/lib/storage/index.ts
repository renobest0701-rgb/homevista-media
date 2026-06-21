import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local";
import { OSSStorageProvider } from "./oss";

let _storage: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_storage) return _storage;
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  _storage = provider === "oss" ? new OSSStorageProvider() : new LocalStorageProvider();
  return _storage;
}

export type { StorageProvider } from "./provider";
