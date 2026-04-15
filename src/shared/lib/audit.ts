import { supabase } from '../../supabaseClient';

type AuditPayload = {
  action: string;
  entity: string;
  entityId?: string | number;
  payload?: Record<string, unknown>;
};

export const logAudit = async ({ action, entity, entityId, payload = {} }: AuditPayload) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      actor_id: userData.user?.id || null,
      action,
      entity,
      entity_id: entityId !== undefined ? String(entityId) : null,
      payload,
    });
  } catch {
    // Auditoria nao deve quebrar UX.
  }
};
