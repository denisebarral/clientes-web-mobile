CREATE TABLE private_chats (
    id bigint primary key generated always as identity,
    user_id1 uuid not null references auth.users (id),
    user_id2 uuid not null references auth.users (id),
    created_at timestamptz default now()
);