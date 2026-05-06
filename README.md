<div align="center">
    <img src="public/logos/logoplanning.webp" style="width: 76px; aspect-ratio: 1 / 1;" alt="City Planning" />
</div>
<h1 align="center" style="font-weight: bold;">City Planning Monitoring System</h1>
<p align="center" style="font-style: italic;">In development</p>

A website to be utilized by **Admins** and **Implementation Leads**. This is in hopes to streamline the process of processing the *AIP* and *Project Monitoring*

## Stack Utilized

- Next.js

### Libraries Used

#### UI

- shadcn
- tabler icons (to be implemented)

## Features
- AIP and Project Monitoring has excel-like editing
- Admin comments to catch issues
- Admins can generate links for Implementation Leads
- Implementation Leads can upload **AIP** and edit their 


## Completed Features
### Default Features
- Admin and Lead roles (login, logout)
- Profile Management (For admin: change profile picture, change password; For lead: set password upon login (verify))
- Lead account/link creation (Create and Delete, admin sets lead username (not yet implemented))
### Main Features
- Lead AIP upload and editing (edit first then a final upload where they will not be able to edit anymore; this appears in admin after submitting)
- Admin can edit AIP and Project Monitoring
- Admin can see which lead uploaded which AIP through a left sidebar (which will appear on the table)
- Admin can export AIP in given excel format
- Basic CRUD for tables
- Filters on table for admin
- Admins can see history of edits and restore all changes from and before a specific point in time
- Admins can leave comments on specific cells
- Notifications for new comments

## Missing Features
1. Validation + guardrails
- Required fields before submission (no empty fields)
- Format checks (dates, budget numbers, etc.)
- Prevent duplicate entries
2. Versioning Clarity
- Clear “submitted vs draft” (add a tab view within AIP and project monitoring for submitted and draft)
- Ability to compare versions (not just restore blindly)
3. Access + permission nuance
- Autosave
- No data loss on refresh/crash
