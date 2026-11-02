CREATE TABLE private_chats_messages (
    id bigint primary key generated always as identity,
    chat_id bigint not null references public.private_chats (id),
    sender_id uuid not null references auth.users (id),
    body text not null,
    created_at timestamptz default now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE private_chats_messages;