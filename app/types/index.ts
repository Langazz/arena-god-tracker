export interface Profile {
	id: string;
	name: string;
	firstplacechampions: string[]; // Changed to match database field name
	created_at?: string;
	updated_at?: string;
}

export interface ChampionProgress {
	id: string;
	profile_id: string;
	champion_name: string;
	is_completed: boolean;
	created_at?: string;
	updated_at?: string;
}
