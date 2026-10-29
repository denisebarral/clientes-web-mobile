CREATE TABLE public_chat_messages (
    id bigint primary key generated always as identity,
    sender_id uuid not null references auth.users (id),
    email text,
    body text,
    created_at timestamptz default now()
);

-- Habilitamos "realtime" a la tabla que creamos.
ALTER PUBLICATION supabase_realtime ADD TABLE public_chat_messages;