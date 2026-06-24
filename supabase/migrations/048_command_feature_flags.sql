-- Per command level (RCC / PCC / SCC) toggles for monitor toolbar features.
-- System Administrator manages these in System Settings.

alter table public.system_settings
  add column if not exists command_feature_flags jsonb not null default '{
    "RCC": { "addCallResponse": true, "forceLocation": true, "generateReport": true },
    "PCC": { "addCallResponse": true, "forceLocation": false, "generateReport": true },
    "SCC": { "addCallResponse": true, "forceLocation": false, "generateReport": true }
  }'::jsonb;
