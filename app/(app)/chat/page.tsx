import { createClient, requireUser } from '@/lib/supabase/server';
import ChatView, { type ChatMessage, type ConversationSummary } from '@/components/chat/ChatView';

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const user = await requireUser();
  const supabase = createClient();

  const { data: conversationRows } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  const conversations: ConversationSummary[] = (conversationRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  }));

  // Open the requested conversation, if it belongs to this user.
  const activeId = searchParams.c && conversations.some((c) => c.id === searchParams.c) ? searchParams.c : null;

  let initialMessages: ChatMessage[] = [];
  if (activeId) {
    const { data: messageRows } = await supabase
      .from('messages')
      .select('id, role, content')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .limit(100);

    initialMessages = (messageRows ?? []).map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
    }));
  }

  // Keyed by conversation so switching threads remounts the view: without it
  // the chat would keep the previous conversation's messages in state.
  return (
    <ChatView
      key={activeId ?? 'new'}
      conversations={conversations}
      activeId={activeId}
      initialMessages={initialMessages}
    />
  );
}
