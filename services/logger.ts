import { supabase } from './supabaseClient';

export const logAction = async (userId: string, userEmail: string | undefined, action: string, details: string) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: userId,
          user_email: userEmail,
          action: action,
          details: details,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Error logging action:', error);
    }
  } catch (err) {
    console.error('Logging failed:', err);
  }
};
