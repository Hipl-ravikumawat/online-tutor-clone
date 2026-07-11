# Pioneers Tutoring — Full Project Features

This inventory is derived from the current routes, controllers, models, services,
scheduled jobs, middleware and views. The application currently contains 42 route
modules with 414 declared HTTP endpoint handlers.

## 1. Authentication, Accounts and Access Control

- Login with either email address or username.
- Password hashing and verification with bcrypt.
- Forgot-password and reset-password workflow.
- Profile viewing and profile updates.
- Persistent database-backed login sessions.
- Four application roles: Admin, Tutor, Student and Content Manager.
- Route-level role authorization middleware.
- Active/deactivated/deleted account enforcement.
- Admin/tutor secret-login impersonation and return-to-original-user flow.
- Role-aware sidebar, navigation and dashboard experiences.
- Back-button/session protection middleware.
- Flash success and error notifications.

## 2. Dashboards and Reporting

- Separate dashboard behavior for administrators, tutors and students.
- User, student and tutor summaries.
- Upcoming lesson and calendar summaries.
- Financial and invoicing summary information.
- Assessment and learning progress information.
- Reward/points overview.
- Date and timezone-aware display formatting.
- Downloadable attendance report assets.

## 3. Student Management

- Create, view, update, list and soft-delete students.
- Active, inactive, trial and waiting account statuses.
- Student usernames and unique username generation.
- Student contact, address, birthday, school and grade information.
- NDIS number, account number, skill level and referrer fields.
- Student profile images and attachments.
- Student notes and private notes.
- Student-to-tutor assignment with default duration, price and billing settings.
- Student group tags.
- Student family-contact records.
- Student preference and communication settings.
- Student portal-contact selection.
- Student message history.
- Student attendance and notes history.
- Automatic-invoicing settings per student.
- Student points wallet.

## 4. Tutor and Staff Management

- Create, view, update, list and soft-delete tutors.
- Tutor qualifications, registration number and profile details.
- Tutor subjects and calendar color.
- Virtual meeting links.
- Tutor-to-student assignment views.
- Tutor payroll configuration.
- Tutor availability requests and approval state.
- Tutor leave requests.
- Tutor attendance notes and attachments.
- Tutor private notes.
- Tutor notification and daily-agenda preferences.
- Staff account and staff financial views.
- Staff automatic-invoicing/payroll settings.

## 5. Family Contacts

- Add, edit, list and delete family contacts associated with students.
- Person and company contact types.
- Contact relationship, email, phone and address details.
- Preferred invoice recipient configuration.
- Student portal-contact configuration.
- Email and SMS reminder preferences.
- Family contact attachments and notes.
- Family-account aggregation for billing and communication.

## 6. Schools, Grades and Grouping

- School CRUD with contact and address details.
- Grade CRUD.
- Student group-tag CRUD.
- Tag colors, descriptions and active status.
- Assign multiple students to a group tag.
- Topic and subtopic CRUD.
- Dynamic subtopic loading by selected topic.

## 7. Calendar and Lesson Scheduling

- Calendar views for Admin, Tutor and Student roles.
- Create, update, view, duplicate and cancel events.
- Event categories with colors and reminder settings.
- Event locations, including online and physical-location details.
- Tutor and substitute-tutor assignment.
- Assign one or multiple students to an event.
- Start date, start time, end time and duration management.
- Public and private event notes.
- Scheduling-conflict checking.
- Tutor leave warning acknowledgement.
- Timezone warning acknowledgement.
- Recurring events with daily, weekly, monthly and yearly options.
- Repeat-day and repeat-until settings.
- Indefinitely repeating event support.
- Student pricing options and per-student lesson prices.
- Event status, cancellation state and comments.
- Event-course content association.
- Calendar filters and role-aware event visibility.

## 8. Attendance, Notes and Attachments

- Record attendance for scheduled events.
- Per-student attendance status.
- Group notes and individual notes.
- Tutor and student attendance history.
- Add, edit and remove note attachments.
- Attendance summaries and reports.
- Attendance data linked to event, tutor, student and category records.
- Cancellation and no-show related data handling.

## 9. Learning Content Management

- Grade/topic/subtopic organized learning content.
- Create, edit, list, view and delete learning-content modules.
- Learning-content thumbnails and directories.
- Ordered lessons inside learning content.
- Ordered slides inside lessons.
- Slide descriptions, video URLs, uploaded video references and attachments.
- Slide duration and completion tracking.
- Ordered lesson practices.
- Text, image, select and drag/drop practice formats.
- Practice questions, audio, images, explanations and answer options.
- Correct-answer configuration.
- Timed practices.
- Lesson challenges and multiplication challenges.
- Content visibility for Admin, Tutor, Student and Content Manager roles.
- Version models for learning content, lessons, slides, practices and challenges.
- Versioning-script routes for existing content.

## 10. Programs

- Program CRUD.
- Assign tutors and students to programs through program workflows.
- Associate learning content and lessons with programs.
- Track program completion percentage.
- Skip selected content where allowed.
- Tutor and student-specific program views.
- Program progress presentation.

## 11. Assessments

- Assessment CRUD.
- Assign a tutor and one or multiple students.
- Build assessments from learning content, lessons, practices and challenges.
- Duration-enabled assessments.
- Assessment task-type selection.
- Scheduled assessment dates.
- Assessment status management.
- Student assessment attempts.
- Save and resume assessment-related data.
- Detailed assessment results.
- Tutor and student assessment reports.
- Attempted-assessment summary and detail views.
- Text-answer and structured-answer reporting.
- Student assessment progress tracking.

## 12. Tutor Training

- Dedicated tutor-training content library.
- Tutor-training lessons, slides and practices.
- Ordered training content.
- Training slide completion tracking.
- Tutor-training assessments.
- Tutor assessment attempts and results.
- Detailed training-assessment reports.
- Training content version models and migration/version scripts.
- Admin and tutor role access.

## 13. Family Billing and Invoices

- Family account balances.
- Student and family transaction history.
- Payments, refunds, charges and discounts.
- Charge categories.
- Event-linked and category-linked charges.
- Tax lines and configurable sales tax.
- Payment-method tracking.
- Recurring financial transactions.
- Daily, weekly, monthly and yearly recurrence.
- Invoice generation for selected date ranges.
- Normal, condensed and expanded invoice layouts.
- Previous balance, payments, charges and invoice totals.
- Invoice numbering and formatting settings.
- Invoice due dates.
- Invoice email status and sent timestamps.
- Paid, archived, voided and deleted invoice states.
- Invoice PDF generation.
- Family invoice summaries.
- Automatic student invoicing.
- Automatic invoice summary jobs.
- Invoice reminder scheduled jobs.

## 14. Staff Billing, Payroll and Invoices

- Staff account balances and transaction history.
- Staff payments, refunds, charges and discounts.
- Tutor-linked event transactions.
- Staff invoice generation.
- Staff invoice PDF generation.
- Staff invoice paid, archived and void states.
- Tutor payroll schema and hourly-rate calculations.
- Staff automatic-invoicing configuration.
- Staff automatic-invoice jobs and summaries.
- Tutor role access to relevant staff invoice records.

## 15. Rewards and Points

- Configurable point values for attendance, questions, homework and participation.
- Bonus points.
- Student points balances.
- Point transaction and point history records.
- Point-assignment modification period.
- Reward-redemption gap configuration.
- Voucher CRUD.
- Voucher point requirements and equivalent monetary amounts.
- Voucher redemption and voucher history.
- Admin, Tutor and Student reward views.

## 16. Policies

- Policy CRUD.
- Policy attachment support.
- Active/inactive policy status.
- Tutor policy access.
- Track tutors who marked a policy as read and the read timestamp.

## 17. Messaging and Notifications

- Admin message workflows.
- Student message preferences.
- Student message-history views.
- Notification records and templates.
- Email templates and email service integration.
- SMS templates and Twilio service integration.
- Lesson registration and cancellation preference fields.
- Daily tutor agenda preference fields.
- Birthday-notification setting.
- Invoice and reminder notification infrastructure.

Email and SMS delivery require valid provider credentials in the environment.

## 18. Business Settings

- Organization name, phone and primary email.
- Birthday-email setting.
- Scheduling-conflict setting.
- Cancellation rules and notification behavior.
- Cancellation deadline and policy text.
- Configurable sales taxes and default tax.
- Family payment methods.
- Balance-date settings.
- Automatic late-fee and reminder settings.
- Invoice logo, name, numbering and next-number settings.
- Negative invoice behavior.
- Invoice footer and accent color.

## 19. Automation and Scheduled Jobs

- Node cron initialization at application startup.
- Automatic family invoicing job.
- Automatic staff invoicing job.
- Automatic invoicing summary email job.
- Invoice reminder job.
- Manually callable cron-job route.
- Configurable recurring-event creation behavior.

## 20. Files, Exports and Documents

- User, student, tutor and attendance attachments.
- Learning slide and content attachments.
- Policy attachments.
- PDF invoice generation.
- Excel workbook support in the application dependencies.
- Archive/ZIP generation support.
- Attendance report file serving.

## 21. Security and Operational Features

- Passwords stored as bcrypt hashes.
- HTTP-only, same-site session cookies.
- Secure cookies in production mode.
- MySQL-backed persistent sessions.
- Role-based route authorization.
- Account status and soft-delete enforcement.
- Request validation with express-validator request modules.
- Upload handling with Multer.
- Error pages for forbidden and missing routes.
- Environment-based mail, SMS, database and application configuration.
- Connection pooling.
- Relational MySQL/MariaDB persistence with typed model columns and normalized child/junction tables.

## 22. Demo Seeder

Run `npm run seed` to create connected fake data for users, academics, scheduling,
billing, rewards and settings. The seeder is idempotent and can be safely rerun.

All demo accounts use the password `Password@123`:

| Role | Login |
| --- | --- |
| Admin | `admin@demo.local` |
| Tutor | `tutor@demo.local` |
| Student | `student@demo.local` |
| Content Manager | `content@demo.local` |

The fake dataset includes a school, grade, topic, subtopic, group, tutor/student
assignment, preferences, availability, points wallet, voucher, calendar lesson,
charge, invoice, learning module, slide, practice, challenge, program, assessment,
policy and business settings.
