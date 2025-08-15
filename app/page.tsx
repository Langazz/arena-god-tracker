import { Tabs } from "./components/tabs";
import { getImageTiles } from "./lib/images";

export default async function Home() {
	const images = await getImageTiles();

	return (
		<div className="min-h-screen p-4">
			<div className="flex items-center justify-center mb-8">
				<h1 className="text-3xl font-bold text-center">
					Arena Dogs 2nd Place Tracker
				</h1>
			</div>
			<Tabs images={images} />
		</div>
	);
}
