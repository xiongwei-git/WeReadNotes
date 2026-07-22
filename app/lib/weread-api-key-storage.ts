import { validateApiKey } from "./weread-core.ts";

export const WEREAD_API_KEY_STORAGE_KEY = "weread-notes:api-key";

export type ApiKeyStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function getBrowserApiKeyStorage(): ApiKeyStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedApiKey(storage: ApiKeyStorage | null): string | null {
  if (!storage) return null;

  try {
    const savedApiKey = storage.getItem(WEREAD_API_KEY_STORAGE_KEY)?.trim() || "";
    if (validateApiKey(savedApiKey)) return savedApiKey;

    if (savedApiKey) storage.removeItem(WEREAD_API_KEY_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function saveApiKey(
  storage: ApiKeyStorage | null,
  apiKey: string,
): boolean {
  const normalizedApiKey = apiKey.trim();
  if (!storage || !validateApiKey(normalizedApiKey)) return false;

  try {
    storage.setItem(WEREAD_API_KEY_STORAGE_KEY, normalizedApiKey);
    return true;
  } catch {
    return false;
  }
}

export function clearSavedApiKey(storage: ApiKeyStorage | null): boolean {
  if (!storage) return false;

  try {
    storage.removeItem(WEREAD_API_KEY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
