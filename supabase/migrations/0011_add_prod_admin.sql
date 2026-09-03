-- Seed the production administrator. Like 0008, the row is created with
-- auth_user_id = null; the OAuth callback links it on the first Google login
-- with this exact email.
insert into public.profiles (full_name, email, role, status)
values (
  'Khana Banao Admin',
  'khanabanao.prod@gmail.com',
  'ADMIN',
  'ACTIVE'
)
on conflict (email) do update
set role = 'ADMIN',
    status = 'ACTIVE';
