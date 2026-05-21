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

- [ ] Fix monitoring export
- [ ] add super admin login bg gradient
- [ ] Add lead links manager icons to buttons
- [ ] Add loading states

## External

- [x] Start neon database
  - [x] Import database tables/fields (Neon PgSQL)
  - [x] Create CDN or a host for the profile pictures (Cloudflare R2 - 10gb Storage)
  - [ ] Connect Neon and R2 to system
- [ ] Host online

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
