-- TEST ONLY: preserve job, Vault secret, recovery cursor, run history and data.
select cron.alter_job((select jobid from cron.job where jobname='kcny-post-media-hourly-024'),active:=false);
select jobname,schedule,active from cron.job where jobname='kcny-post-media-hourly-024';
