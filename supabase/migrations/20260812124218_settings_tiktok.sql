alter table public.settings
  add column tiktok text;

update public.settings
set tiktok = 'https://www.tiktok.com/'
where tiktok is null;

alter table public.settings
  add constraint settings_tiktok_https check (
    tiktok is null or tiktok ~ '^https://'
  );
