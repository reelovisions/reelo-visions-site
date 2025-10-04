# Reelo Receptionist – Admin Roadmap

## Current (v0.1)
- Gated admin page at /admin/app.html
- Create appt (First/Last/Phone/Address split; quarter-hour start/end)
- Appt type (Service/Quote/Install) stored in `notes.appt_type`
- List (active/all), CSV, cancel/update, service area admin

## Next sprint (v0.2)
- Client-side validation (ZIP format, 10-digit phone)
- Auto-refresh list after create/cancel/update
- Local time display (already done) + timezone note in UI

## Future (v2, for Jobber/ServiceTitan)
- Normalize schema: first/last, street/city/state, start/end, appt_type
- New RPCs: create_my_appointment_v2, list_my_appointments_v2
- Webhook/adapter for CRM calendar availability

## Links
- Live (GitHub Pages, if enabled): /admin/app.html
- SQL plan for v2: /option2_migrations.sql (kept outside repo for now)
