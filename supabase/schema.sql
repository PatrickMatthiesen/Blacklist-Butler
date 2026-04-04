create table if not exists public.blacklist_guilds (
    guild_id text primary key,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blacklist_sections (
    guild_id text not null references public.blacklist_guilds (guild_id) on delete cascade,
    category text not null,
    header text not null,
    primary key (guild_id, category),
    constraint blacklist_sections_category_length check (char_length(category) = 1)
);

create table if not exists public.blacklist_entries (
    guild_id text not null references public.blacklist_guilds (guild_id) on delete cascade,
    category text not null,
    position integer not null,
    entry_value text not null,
    primary key (guild_id, category, position),
    constraint blacklist_entries_category_length check (char_length(category) = 1),
    constraint blacklist_entries_position_non_negative check (position >= 0)
);

create index if not exists blacklist_entries_guild_category_idx
    on public.blacklist_entries (guild_id, category, position);

create table if not exists public.blacklist_message_refs (
    guild_id text not null references public.blacklist_guilds (guild_id) on delete cascade,
    category text not null,
    message_id text not null,
    payload jsonb not null,
    primary key (guild_id, category),
    constraint blacklist_message_refs_category_length check (char_length(category) = 1)
);

create table if not exists public.blacklist_config_entries (
    guild_id text not null references public.blacklist_guilds (guild_id) on delete cascade,
    config_key text not null,
    config_value text not null,
    primary key (guild_id, config_key)
);

create table if not exists public.blacklist_named_documents (
    guild_id text not null references public.blacklist_guilds (guild_id) on delete cascade,
    document_name text not null,
    payload_text text not null,
    payload_encoding text not null default 'utf-8',
    primary key (guild_id, document_name),
    constraint blacklist_named_documents_encoding check (payload_encoding in ('utf-8', 'base64'))
);