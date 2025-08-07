-- Assign admin role to existing user  
INSERT INTO public.user_roles (user_id, role) 
VALUES ('19166743-4298-43f7-a63a-4afc8c3c624a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update profile status to approved
UPDATE public.profiles 
SET status = 'approved' 
WHERE id = '19166743-4298-43f7-a63a-4afc8c3c624a';