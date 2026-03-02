import { supabase } from './supabase';

export async function logActivity(
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, any> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from('user_activity_logs').insert({
      user_id: user.id,
      organization_id: organizationId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
