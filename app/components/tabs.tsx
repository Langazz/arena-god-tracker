"use client";

import { ProfileManager } from "./profile-manager";
import { ImageTile } from "../lib/images";

interface TabsProps {
	images: ImageTile[];
}

export function Tabs({ images }: TabsProps) {
	return (
		<div className="w-full max-w-7xl mx-auto px-4">
			<div className="mt-6">
				<ProfileManager images={images} />
			</div>
		</div>
	);
}
