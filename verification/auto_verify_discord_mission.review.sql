-- REVIEW ONLY; NOT executed. Existing function preserved, two UTC boundary expressions changed.
CREATE OR REPLACE FUNCTION public.auto_verify_discord_mission(p_selection_id bigint, p_message_id text, p_channel_id text, p_message_author_id text, p_message_time timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_selection record;
begin
  select *
  into v_selection
  from public.weekly_selections
  where id = p_selection_id
  for update;

  if not found then
    return 'selection_not_found';
  end if;

  if not mission_internal.discord_evidence_time_matches(
    p_message_id, p_message_time
  ) then
    return 'invalid_evidence_timestamp';
  end if;

  if v_selection.discord_user_id <> p_message_author_id then
    return 'member_mismatch';
  end if;

  if v_selection.mission_id = 'break-the-ice' then
    if p_channel_id <> '1546529501859815438' then
      return 'wrong_channel';
    end if;
  elsif v_selection.mission_id = 'daily-fun' then
    if p_channel_id not in (
      '1562480265878577233',
      '1561393990392094790'
    ) then
      return 'wrong_channel';
    end if;
  else
    return 'unsupported_mission';
  end if;

  if p_message_time < v_selection.selected_at
     or p_message_time < (v_selection.week_start::timestamp at time zone 'America/New_York')
     or p_message_time >=
        ((v_selection.week_start + 7)::timestamp at time zone 'America/New_York')
  then
    return 'outside_mission_window';
  end if;

  if exists (
    select 1
    from public.mission_progress
    where selection_id = p_selection_id
  ) then
    return 'already_verified';
  end if;

  insert into public.mission_progress (
    selection_id,
    verification_source,
    evidence_id,
    verified_by
  )
  values (
    p_selection_id,
    'discord_bot',
    p_message_id,
    'smart-verification'
  );

  return 'verified';
end;
$function$

