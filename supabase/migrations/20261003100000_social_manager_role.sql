-- New role for the staff member who runs the shop's social media. Punches like regular staff.
alter type public.staff_role add value 'social_manager' after 'supervisor';
