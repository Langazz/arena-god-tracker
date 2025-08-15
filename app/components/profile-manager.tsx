"use client";

import { useState, useEffect } from "react";
import { Profile } from "../types";
import { 
	getProfiles, 
	createProfile, 
	updateProfile, 
	deleteProfile,
	subscribeToProfiles,
	testConnection
} from "../lib/database";
import { ImageGrid } from "./image-grid";
import { ImageTile } from "../lib/images";

interface ProfileManagerProps {
	images: ImageTile[];
}

export function ProfileManager({ images }: ProfileManagerProps) {
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
	const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newProfileName, setNewProfileName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [connectionStatus, setConnectionStatus] = useState<string>("Testing...");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null); // Profile ID to show delete confirmation for

	useEffect(() => {
		// Test connection first
		testConnection().then(isConnected => {
			console.log('Database connection test result:', isConnected);
			if (isConnected) {
				setConnectionStatus("Connected");
				loadProfiles();
			} else {
				setConnectionStatus("Connection failed");
				setLoading(false);
			}
		});

		// Subscribe to real-time changes
		console.log('Setting up real-time subscription...');
		const subscription = subscribeToProfiles((updatedProfiles) => {
			console.log('Real-time update received:', updatedProfiles);
			setProfiles(updatedProfiles);
			// Update selected profile if it still exists
			if (selectedProfile) {
				const updated = updatedProfiles.find(p => p.id === selectedProfile.id);
				if (updated) {
					setSelectedProfile(updated);
				} else {
					setSelectedProfile(updatedProfiles[0] || null);
				}
			} else if (updatedProfiles.length > 0) {
				// If no profile is selected but we have profiles, select the first one
				setSelectedProfile(updatedProfiles[0]);
			}
		});

		return () => {
			console.log('Cleaning up real-time subscription');
			subscription.unsubscribe();
		};
	}, []); // Remove selectedProfile dependency to prevent infinite loop

	const loadProfiles = async () => {
		try {
			setLoading(true);
			console.log('Loading profiles...');
			const storedProfiles = await getProfiles();
			console.log('Profiles loaded from database:', storedProfiles);
			console.log('Profiles array length:', storedProfiles.length);
			
			if (storedProfiles.length === 0) {
				console.log('No profiles found, creating defaults...');
				// Initialize with default profiles
				const defaultProfiles = [
					await createProfile("Me"),
					await createProfile("My Friend"),
				].filter(Boolean) as Profile[];
				
				console.log('Default profiles created:', defaultProfiles);
				setProfiles(defaultProfiles);
				setSelectedProfile(defaultProfiles[0] || null);
			} else {
				console.log('Setting profiles from database:', storedProfiles);
				console.log('Setting profiles state with:', storedProfiles);
				setProfiles(storedProfiles);
				console.log('Setting selected profile to:', storedProfiles[0]);
				setSelectedProfile(storedProfiles[0] || null);
			}
		} catch (error) {
			console.error('Error loading profiles:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleAddProfile = async () => {
		if (!newProfileName.trim()) return;
		
		try {
			console.log('Adding profile:', newProfileName);
			const newProfile = await createProfile(newProfileName.trim());
			if (newProfile) {
				console.log('Profile created successfully:', newProfile);
				setNewProfileName("");
				setShowAddForm(false);
				
				// Fallback: manually refresh profiles in case real-time isn't working
				console.log('Manually refreshing profiles...');
				const updatedProfiles = await getProfiles();
				console.log('Updated profiles:', updatedProfiles);
				setProfiles(updatedProfiles);
				
				// Automatically select the newly created profile
				console.log('Auto-selecting new profile:', newProfile.name);
				setSelectedProfile(newProfile);
			}
		} catch (error) {
			console.error('Error adding profile:', error);
		}
	};

	const handleProfileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setNewProfileName(e.target.value);
	};

	const handleUpdateProfile = async (profile: Profile) => {
		try {
			console.log('Updating profile:', profile);
			const updated = await updateProfile(profile);
			if (updated) {
				console.log('Profile updated successfully:', updated);
				setEditingProfile(null);
				
				// Fallback: manually refresh profiles in case real-time isn't working
				console.log('Manually refreshing profiles after edit...');
				const updatedProfiles = await getProfiles();
				console.log('Updated profiles after edit:', updatedProfiles);
				setProfiles(updatedProfiles);
				
				// Update selected profile if needed
				const updatedSelected = updatedProfiles.find(p => p.id === profile.id);
				if (updatedSelected) {
					setSelectedProfile(updatedSelected);
				}
			}
		} catch (error) {
			console.error('Error updating profile:', error);
		}
	};

	const handleDeleteProfile = async (id: string) => {
		if (profiles.length <= 1) return; // Keep at least one profile
		
		try {
			console.log('Deleting profile with ID:', id);
			const success = await deleteProfile(id);
			if (success) {
				console.log('Profile deleted successfully');
				// Profile will be updated via real-time subscription
				console.log('Waiting for real-time update...');
				
				// Fallback: manually refresh profiles in case real-time isn't working
				console.log('Manually refreshing profiles after delete...');
				const updatedProfiles = await getProfiles();
				console.log('Updated profiles after delete:', updatedProfiles);
				setProfiles(updatedProfiles);
				
				// Update selected profile if needed
				if (selectedProfile?.id === id) {
					setSelectedProfile(updatedProfiles[0] || null);
				}
			}
		} catch (error) {
			console.error('Error deleting profile:', error);
		}
	};

	const toggleChampionWin = async (champion: string) => {
		if (!selectedProfile) return;
		
		try {
			const updatedProfile = { ...selectedProfile };
			const index = updatedProfile.firstplacechampions.indexOf(champion);
			
			if (index > -1) {
				updatedProfile.firstplacechampions.splice(index, 1);
			} else {
				updatedProfile.firstplacechampions.push(champion);
			}
			
			await handleUpdateProfile(updatedProfile);
		} catch (error) {
			console.error('Error toggling champion:', error);
		}
	};

	// Filter images based on search query
	const filteredImages = images.filter(image => 
		image.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	if (loading) {
		return (
			<div className="text-center py-8">
				<div className="mb-4">Connection Status: {connectionStatus}</div>
				{connectionStatus === "Testing..." && <div>Testing database connection...</div>}
				{connectionStatus === "Connected" && <div>Loading profiles...</div>}
				{connectionStatus === "Connection failed" && (
					<div className="text-red-500">
						Failed to connect to database. Please check your environment variables.
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Profile Selection */}
			<div className="flex flex-wrap gap-4 items-center">
				{profiles.map((profile) => (
					<button
						key={profile.id}
						onClick={() => setSelectedProfile(profile)}
						className={`px-4 py-2 rounded-md transition-colors ${
							selectedProfile?.id === profile.id
								? "bg-blue-500 text-white"
								: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
						}`}
					>
						{profile.name}
					</button>
				))}
				<button
					onClick={() => setShowAddForm(true)}
					className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
				>
					+ Add Profile
				</button>
			</div>

			{/* Add Profile Form */}
			{showAddForm && (
				<div className="p-4 border rounded-lg dark:border-gray-700">
					<div className="flex gap-4 items-end">
						<div className="flex-1">
							<label className="block text-sm font-medium mb-1">
								Profile Name
							</label>
							<input
								type="text"
								value={newProfileName}
								onChange={handleProfileNameChange}
								className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
								placeholder="Enter profile name"
							/>
						</div>
						<button
							onClick={handleAddProfile}
							className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
						>
							Add
						</button>
						<button
							onClick={() => setShowAddForm(false)}
							className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Delete Confirmation Popup */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
						<h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
							Delete Profile
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-6">
							Are you sure you want to delete this profile? This action cannot be undone.
						</p>
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setShowDeleteConfirm(null)}
								className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									if (showDeleteConfirm) {
										handleDeleteProfile(showDeleteConfirm);
										setShowDeleteConfirm(null);
									}
								}}
								className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Search Bar and Profile Info */}
			{selectedProfile && (
				<div className="flex items-center gap-4 mb-6">
					{/* Compact Profile Info */}
					<div className="flex items-center gap-2">
						{editingProfile?.id === selectedProfile.id ? (
							<input
								type="text"
								value={editingProfile.name}
								onChange={(e) => setEditingProfile({
									...editingProfile,
									name: e.target.value
								})}
								className="px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
							/>
						) : (
							<span className="text-sm font-medium">{selectedProfile.name}</span>
						)}
						
						{editingProfile?.id === selectedProfile.id ? (
							<>
								<button
									onClick={() => handleUpdateProfile(editingProfile)}
									className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
								>
									Save
								</button>
								<button
									onClick={() => setEditingProfile(null)}
									className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
								>
									Cancel
								</button>
							</>
						) : (
							<button
								onClick={() => setEditingProfile(selectedProfile)}
								className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
							>
								Edit Name
							</button>
						)}
						
						{profiles.length > 1 && (
							<button
								onClick={() => setShowDeleteConfirm(selectedProfile.id)}
								className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
							>
								Delete Profile
							</button>
						)}
					</div>
					
					<div className="ml-auto w-full sm:w-64">
						<input
							type="text"
							placeholder="Search champions..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>
			)}

			{/* Champion Grid */}
			{selectedProfile && (
				<ImageGrid 
					images={images} 
					displayImages={filteredImages}
					selectedChampions={selectedProfile.firstplacechampions}
					onChampionToggle={toggleChampionWin}
				/>
			)}
		</div>
	);
}
