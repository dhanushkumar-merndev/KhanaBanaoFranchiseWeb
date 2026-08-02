-- Seed the invitation-only application's first administrator. The OAuth
-- callback links auth_user_id on the first Google login with this exact email.
insert into public.profiles (full_name, email, role, status)
values (
  'Khana Banao Admin',
  'khanabanaofranchise@gmail.com',
  'ADMIN',
  'ACTIVE'
)
on conflict (email) do update
set role = 'ADMIN',
    status = 'ACTIVE';
