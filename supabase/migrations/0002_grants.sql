-- Report Studio: explicit table privileges.
-- Some Supabase projects don't give the API roles access to new tables automatically. Row level security
-- (in 0001_init.sql) still decides which rows each person can see; these grants only let the API reach the tables.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
