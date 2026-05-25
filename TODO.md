<!-- Preview with Ctrl+Shift+V -->

# Missing Features

- project monitoring export is still not the same design projmonit.xlsx, it is actually corrupted at the moment. Please refer to how AIP did its export but use projmonit.xlsx as the excel sheet format. thank you. The idea is, you first convert proj monit2.xlsx then find the cells you can put the monitoring data in then put it there then parse it again to xlsx from base64 to retain the design but the data changed.
- Make the project tables spann fully downwards (like how excel is, there is no more add row button, just empty rows to edit)

# Test Credentials

- Admin: admin@example.com 12345678
- Leads
- Super Admin: superadmin@example.com superadmin
  > [!TIP]
  > use https://bcrypt-generator.com/ for changing passwords in db

# TODO

## System

- [x] Fix monitoring export (Possible causes below)
  - Monitoring and AIP are different formats
  - **Solution:**
- [x] ProjTables - change submitted, draft to complete, incomplete
- [ ] add super admin login bg gradient
- [ ] Add lead links manager icons to buttons
- [ ] Add loading states
- [ ] Fix print to output the XLSX; not the website view

## External

- [ ] _To solve lead upload **submit problem**:_ Identify which AIP fields need to be filled out by Implementation Lead
  - Alternatively, what fields do Admins need to fill out?

### Done (May 25, 2026)

- [x] Start neon database
  - [x] Import database tables/fields (Neon PgSQL)
  - [x] Create CDN or a host for the profile pictures (Vercel Blob)
    <!-- Getting an ORM (Prisma) is not needed for a small project -->
    <!-- ORMs help shorten queries (SELECT id, name, etc WHERE id = 0; users.GetbyId(20)) -->
    ~~- [ ] Get Prisma~~
    <!-- lib/db.ts, lib/types.ts - Connection, Type safety of tables -->
  - [x] Connect Neon
  <!-- lib/r2.ts was replaced by the Vercel Blob upload route -->
  - [x] Connect Blob to system
  - [x] Host online (https://city-planning-system.vercel.app/login)
  <!-- Connection established, functions remaining -->
  - [x] Convert API routes to Neon/Blob

# Current Features

- Super admin
  - Create admin accounts
- Admin
  - Account
    - Change name
    - Change password
  - AIP/Monitoring
    - (**AIP**) export
    - import (lead uploads)
    - print
    - comments
- Lead
  - Upload
  - Basic CRUD
