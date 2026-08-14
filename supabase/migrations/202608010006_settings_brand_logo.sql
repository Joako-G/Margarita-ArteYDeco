begin;

alter table public.settings
  add column logo_path text;

alter table public.settings
  add constraint settings_logo_path_valid check (
    logo_path is null
    or (
      btrim(logo_path) <> ''
      and logo_path !~ '(^|/)\.\.?(/|$)'
      and logo_path !~ '^[a-z][a-z0-9+.-]*://'
    )
  );

grant update (logo_path) on public.settings to service_role;

commit;
