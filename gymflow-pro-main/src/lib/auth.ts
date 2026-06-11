const TOKENS_KEY = "gymos_tokens";
const ACTIVE_GYM_KEY = "gymos_active_gym";
const OWNER_KEY = "gymos_owner";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OwnerProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profilePhoto?: string;
  role: "owner";
}

export function getTokens(): AuthTokens | null {
  try {
    const data = localStorage.getItem(TOKENS_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function clearAuth() {
  localStorage.removeItem(TOKENS_KEY);
  localStorage.removeItem(ACTIVE_GYM_KEY);
  localStorage.removeItem(OWNER_KEY);
}

export function getActiveGymId(): string | null {
  return localStorage.getItem(ACTIVE_GYM_KEY);
}

export function setActiveGymId(gymId: string) {
  localStorage.setItem(ACTIVE_GYM_KEY, gymId);
}

export function getOwnerProfile(): OwnerProfile | null {
  try {
    const data = localStorage.getItem(OWNER_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setOwnerProfile(profile: OwnerProfile) {
  localStorage.setItem(OWNER_KEY, JSON.stringify(profile));
}
