<!-- Preview with Ctrl+Shift+V -->

# Test Credentials

- Admin: admin@example.com 12345678
- Leads: (requires link)
- Super Admin: superadmin@example.com superadmin
  > [!TIP]+
  > use https://bcrypt-generator.com/ for changing passwords in db

# TODO

## System

- [ ] Fix print to output the XLSX; not the website view
- [ ] Put departments inline link generator, reduce link box width
- [ ] _To solve lead upload **submit problem**:_ Identify which AIP fields need to be filled out by Implementation Lead
  - Alternatively, what fields do Admins need to fill out?

### Done (May 26, 2026)

- [x] add super admin login bg gradient (exactly like admin login)

### Done (May 25, 2026)

- [x] Fix monitoring export (Possible causes below)
  - Monitoring and AIP are different formats
  - **Solution:**
- [x] ProjTables - change submitted, draft to complete, incomplete
- [x] Add dark mode to lead bg
- [x] Add loading state to important parts
- [x] Add department before generating a link
- [x] Add lead links manager icons to buttons

## External

- None

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
