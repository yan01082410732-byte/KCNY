create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 30 and username ~ '^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]+$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text check (bio is null or char_length(bio) <= 500), avatar_url text,
  preferred_language text not null default 'zh' check (preferred_language in ('zh','ko')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create or replace function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, preferred_language)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'username',''), 'user_' || substr(new.id::text,1,8)), coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'KCNY user'), coalesce(nullif(new.raw_user_meta_data->>'preferred_language',''),'zh'));
  return new;
exception when unique_violation then raise exception 'Username is already in use'; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();
