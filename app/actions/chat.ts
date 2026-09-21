'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { logDbError } from '@/lib/supabase/log';

/** Deletes one of the user's conversations; its messages go with it. */
export async function deleteConversation(id: string): Promise<{ status: 'ok' } | { status: 'error' }> {
  const user = await requireUser();
  if (typeof id !== 'string' || !id) return { status: 'error' };

  // RLS already limits this to the user's own rows; the filter says so too.
  const { error } = await createClient().from('conversations').delete().eq('id', id).eq('user_id', user.id);
  logDbError('chat.deleteConversation', error);
  if (error) return { status: 'error' };

  revalidatePath('/chat');
  return { status: 'ok' };
}
