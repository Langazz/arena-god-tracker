import { supabase } from './supabase'
import { Profile, ChampionProgress } from '../types'

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection test failed:', error)
      return false
    }
    
    console.log('Database connection successful')
    return true
  } catch (err) {
    console.error('Database connection test error:', err)
    return false
  }
}

// Profile functions
export async function getProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching profiles:', error)
    return []
  }

  return data || []
}

export async function createProfile(name: string): Promise<Profile | null> {
  console.log('Attempting to create profile:', name)
  
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ name, firstplacechampions: [] }])
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return null
  }

  console.log('Profile created successfully:', data)
  return data
}

export async function updateProfile(profile: Profile): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      name: profile.name, 
      firstplacechampions: profile.firstplacechampions,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return data
}

export async function deleteProfile(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting profile:', error)
    return false
  }

  return true
}

// Champion progress functions
export async function getChampionProgress(profileId: string): Promise<ChampionProgress[]> {
  const { data, error } = await supabase
    .from('champion_progress')
    .select('*')
    .eq('profile_id', profileId)

  if (error) {
    console.error('Error fetching champion progress:', error)
    return []
  }

  return data || []
}

export async function toggleChampionProgress(
  profileId: string, 
  championName: string, 
  isCompleted: boolean
): Promise<boolean> {
  // Check if progress record exists
  const { data: existing } = await supabase
    .from('champion_progress')
    .select('id')
    .eq('profile_id', profileId)
    .eq('champion_name', championName)
    .single()

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('champion_progress')
      .update({ 
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating champion progress:', error)
      return false
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('champion_progress')
      .insert([{
        profile_id: profileId,
        champion_name: championName,
        is_completed: isCompleted
      }])

    if (error) {
      console.error('Error creating champion progress:', error)
      return false
    }
  }

  return true
}

// Real-time subscriptions
export function subscribeToProfiles(callback: (profiles: Profile[]) => void) {
  console.log('Setting up profiles subscription...');
  
  let isProcessing = false;
  
  const processUpdate = async () => {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
      const profiles = await getProfiles();
      callback(profiles);
    } catch (error) {
      console.error('Error processing real-time update:', error);
    } finally {
      isProcessing = false;
    }
  };
  
  return supabase
    .channel('profiles')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'profiles' 
      },
      (payload) => {
        console.log('Profile INSERT detected:', payload);
        processUpdate();
      }
    )
    .on('postgres_changes', 
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      },
      (payload) => {
        console.log('Profile UPDATE detected:', payload);
        processUpdate();
      }
    )
    .on('postgres_changes', 
      { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'profiles' 
      },
      (payload) => {
        console.log('Profile DELETE detected:', payload);
        processUpdate();
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to profile changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Subscription channel error');
      }
    });
}

export function subscribeToChampionProgress(
  profileId: string, 
  callback: (progress: ChampionProgress[]) => void
) {
  return supabase
    .channel(`champion_progress_${profileId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'champion_progress',
        filter: `profile_id=eq.${profileId}`
      },
      () => {
        // Refetch progress when any change occurs
        getChampionProgress(profileId).then(callback)
      }
    )
    .subscribe()
}
