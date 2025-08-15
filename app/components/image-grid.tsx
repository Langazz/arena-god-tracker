"use client";

import Image from "next/image";
import { ImageTile } from "../lib/images";
import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Circle, ArrowUpDown, ArrowDownUp, X } from "lucide-react";

interface ImageGridProps {
	images: ImageTile[];
	displayImages?: ImageTile[];
	selectedChampions?: string[];
	onChampionToggle?: (champion: string) => void;
}

type SortMode = "completion" | "alphabetical";
type SortDirection = "asc" | "desc";

interface ConfirmationState {
	show: boolean;
	championName: string;
	action: "add" | "remove";
}

export function ImageGrid({ 
	images, 
	displayImages = images, 
	selectedChampions,
	onChampionToggle 
}: ImageGridProps) {
	const [mounted, setMounted] = useState(false);
	const [sortMode, setSortMode] = useState<SortMode>("alphabetical");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [confirmation, setConfirmation] = useState<ConfirmationState>({
		show: false,
		championName: "",
		action: "add"
	});

	// Audio refs for the 3 sound files
	const audioRefs = useRef<HTMLAudioElement[]>([]);

	useEffect(() => {
		setMounted(true);
		
		// Initialize audio files
		audioRefs.current = [
			new Audio('/sounds/complete1.mp3'),
			new Audio('/sounds/complete2.mp3'),
			new Audio('/sounds/complete3.mp3')
		];

		// Preload audio files
		audioRefs.current.forEach(audio => {
			audio.preload = 'auto';
			audio.volume = 0.7; // Set volume to 70%
		});

		// Cleanup function
		return () => {
			audioRefs.current.forEach(audio => {
				audio.pause();
				audio.currentTime = 0;
			});
		};
	}, []);

	const playRandomSound = () => {
		if (audioRefs.current.length === 0) return;
		
		try {
			const randomIndex = Math.floor(Math.random() * audioRefs.current.length);
			const audio = audioRefs.current[randomIndex];
			
			// Reset audio to beginning in case it was played recently
			audio.currentTime = 0;
			
			// Play the sound
			audio.play().catch(error => {
				console.log('Audio play failed:', error);
				// This is common on first page load due to browser autoplay policies
			});
		} catch (error) {
			console.log('Sound playback error:', error);
		}
	};

	// Use selectedChampions (profile mode)
	const activeChampions = selectedChampions || [];
	const completedCount = activeChampions.length;
	const totalCount = images.length;

	const handleCircleClick = (championName: string, e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent any parent click handlers
		
		const isCompleted = activeChampions.includes(championName);
		setConfirmation({
			show: true,
			championName,
			action: isCompleted ? "remove" : "add"
		});
	};

	const confirmToggle = () => {
		if (onChampionToggle) {
			onChampionToggle(confirmation.championName);
			
			// Play sound only when marking as complete (adding)
			if (confirmation.action === "add") {
				playRandomSound();
			}
		}
		setConfirmation({ show: false, championName: "", action: "add" });
	};

	const cancelToggle = () => {
		setConfirmation({ show: false, championName: "", action: "add" });
	};

	const sortedImages = [...displayImages].sort((a, b) => {
		if (sortMode === "completion") {
			const aCompleted = activeChampions.includes(a.name);
			const bCompleted = activeChampions.includes(b.name);
			if (aCompleted !== bCompleted) {
				return sortDirection === "asc"
					? aCompleted
						? -1
						: 1
					: aCompleted
					? 1
					: -1;
			}
			// If both are in the same group (both completed or both incomplete),
			// sort alphabetically
			return a.name.localeCompare(b.name);
		}
		// For alphabetical mode, just sort by name
		return sortDirection === "asc"
			? a.name.localeCompare(b.name)
			: b.name.localeCompare(a.name);
	});

	if (!mounted) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-medium">Progress</h3>
					<span className="text-sm text-gray-500 dark:text-gray-400">
						{completedCount} / {totalCount} champions
					</span>
				</div>
				<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div
						className="h-full bg-blue-500"
						style={{
							width: `${(completedCount / totalCount) * 100}%`,
						}}
					/>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<select
					value={sortMode}
					onChange={(e) => setSortMode(e.target.value as SortMode)}
					className="px-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
				>
					<option value="completion">Sort by Completion</option>
					<option value="alphabetical">Sort Alphabetically</option>
				</select>
				<button
					onClick={() =>
						setSortDirection((prev) =>
							prev === "asc" ? "desc" : "asc"
						)
					}
					className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
					title={
						sortDirection === "asc"
							? "Reverse order"
							: "Normal order"
					}
				>
					{sortDirection === "asc" ? (
						<ArrowUpDown className="w-5 h-5" />
					) : (
						<ArrowDownUp className="w-5 h-5" />
					)}
				</button>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
				{sortedImages.map((image) => {
					const isCompleted = activeChampions.includes(
						image.name
					);
					return (
						<div
							key={image.name}
							className="group relative flex flex-col items-center"
						>
							{/* Removed onClick from the main button - now it's just for display */}
							<div className="relative w-full aspect-square mb-2 group">
								<Image
									src={image.src}
									alt={image.name}
									fill
									className={`object-cover rounded-lg transition-all duration-200 ${
										isCompleted
											? "brightness-100 opacity-20"
											: "opacity-100"
									} group-hover:opacity-100 group-hover:brightness-100`}
									sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
								/>
								
								{/* Subtle dark overlay for completed items */}
								{isCompleted && (
									<div className="absolute inset-0 bg-black/10 rounded-lg group-hover:bg-black/0 transition-all duration-200" />
								)}
								
								{/* Clickable circle button */}
								<button
									onClick={(e) => handleCircleClick(image.name, e)}
									className={`absolute top-2 right-2 p-1 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md hover:bg-white hover:cursor-pointer group/circle ${
										isCompleted ? "scale-110" : "scale-100"
									}`}
									title={isCompleted ? "Click to mark as incomplete" : "Click to mark as complete"}
								>
									{isCompleted ? (
										<CheckCircle2 className="w-5 h-5 text-green-500 group-hover/circle:text-green-600 transition-colors" />
									) : (
										<Circle className="w-5 h-5 text-gray-400 group-hover/circle:text-blue-500 transition-colors" />
									)}
								</button>

								<div className="absolute top-2 left-2 flex flex-col gap-1">
									<a
										href={`https://u.gg/lol/champions/arena/${image.name.toLowerCase()}-arena-build`}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => e.stopPropagation()}
										className="px-2 py-0.5 text-xs font-medium bg-blue-500/90 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm ring-1 ring-blue-600/50"
									>
										u.gg
									</a>
									<a
										href={`https://blitz.gg/lol/champions/${image.name}/arena`}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => e.stopPropagation()}
										className="px-2 py-0.5 text-xs font-medium bg-red-500/90 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm ring-1 ring-red-600/50"
									>
										blitz
									</a>
									<a
										href={`https://www.metasrc.com/lol/arena/build/${image.name.toLowerCase()}`}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => e.stopPropagation()}
										className="px-2 py-0.5 text-xs font-medium bg-gray-500/90 text-white rounded-full hover:bg-gray-600 transition-colors shadow-sm ring-1 ring-gray-600/50"
									>
										metasrc
									</a>
								</div>
							</div>
							<span className="text-sm text-center font-medium">
								{image.name}
							</span>
						</div>
					);
				})}
			</div>

			{/* Confirmation Modal */}
			{confirmation.show && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								{confirmation.action === "add" ? "Mark Complete" : "Mark Incomplete"}
							</h3>
							<button
								onClick={cancelToggle}
								className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						
						<p className="text-gray-600 dark:text-gray-300 mb-6">
							{confirmation.action === "add" 
								? `Mark ${confirmation.championName} as completed?`
								: `Remove ${confirmation.championName} from completed champions?`
							}
						</p>
						
						<div className="flex gap-3 justify-end">
							<button
								onClick={cancelToggle}
								className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={confirmToggle}
								className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
									confirmation.action === "add"
										? "bg-green-500 hover:bg-green-600"
										: "bg-red-500 hover:bg-red-600"
								}`}
							>
								{confirmation.action === "add" ? "Mark Complete" : "Mark Incomplete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}