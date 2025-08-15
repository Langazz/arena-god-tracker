import { Profile } from "../types";

const STORAGE_KEYS = {
	RIOT_ID: "arena-god-riot-id",
	MATCH_CACHE: "arena-god-match-cache",
	PROFILES: "arena-god-profiles",
} as const;

export function getProfiles(): Profile[] {
	if (typeof window === "undefined") return [];
	const stored = localStorage.getItem(STORAGE_KEYS.PROFILES);
	return stored ? JSON.parse(stored) : [];
}

export function setProfiles(profiles: Profile[]) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
}

export function getProfile(id: string): Profile | null {
	const profiles = getProfiles();
	return profiles.find(p => p.id === id) || null;
}

export function updateProfile(profile: Profile) {
	const profiles = getProfiles();
	const index = profiles.findIndex(p => p.id === profile.id);
	if (index !== -1) {
		profiles[index] = profile;
	} else {
		profiles.push(profile);
	}
	setProfiles(profiles);
}

export function deleteProfile(id: string) {
	const profiles = getProfiles();
	const filtered = profiles.filter(p => p.id !== id);
	setProfiles(filtered);
}