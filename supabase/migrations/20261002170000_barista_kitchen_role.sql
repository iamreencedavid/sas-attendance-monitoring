-- New role for staff who work both the bar and the kitchen.
alter type public.staff_role add value 'barista_kitchen' after 'kitchen';
