# Funno Learning Studio

A responsive classroom interface for a teacher-managed class and student learning view. The visual direction uses a calm botanical palette, roomy cards and lightweight motion. It takes inspiration from common smart-classroom workflows—lesson and resource libraries, activities, gamified quizzes and progress snapshots—without copying the linked vendor page.

## Frontend preview

The frontend is in `index.html`, `style.css`, `addons.css`, `script.js`, and `api.js`. Open the folder with VS Code Live Server (or run `python -m http.server 5500` from this directory) and visit `http://127.0.0.1:5500`.

The app connects directly to the linked Supabase project using its publishable key and Supabase Auth. When signed out, it displays sample data and keeps preview edits in this browser. After sign-in, class data is saved in Supabase. The browser never contains a service-role key.

## Included frontend sections

- Overview with learner count, progress snapshot, resource count, activities and check-ins.
- Lessons and library for reusable lesson links, files and notes.
- Activities with due dates, written/file submissions, teacher grading and private feedback.
- Daily teacher attendance check-ins with learner-only attendance history.
- Class announcements, scheduled publishing and in-app reminder times.
- Quick quizzes with teacher authoring and student score history.
- Student progress with learner records and assessment results.
- Teaching insights and classroom feedback.
- Class settings for managing learner records.
- Password-confirmed learner account switching for shared devices. Only account email/name are remembered locally; passwords are never stored.

## Supabase project

Project: `lvuoqedkkviauyluqnju` (`smart classroom managment`). Five migrations in `supabase/migrations` create the classroom schema, harden policies, secure quiz scoring, and add attendance, announcements, assignment grading, private Storage and data-integrity checks. They are recorded in Supabase migration history.

The local `supabase/.env` is Git-ignored and contains only the project URL and browser-safe publishable key. Copy `supabase/.env.example` when setting up another machine. A real secret key belongs in the Supabase Edge Function secret store; add one to the ignored local `.env` only when running Edge Functions locally. The static frontend cannot read `.env`, so it uses the public publishable key in `api.js`. That key is safe to expose; the database RLS policies protect the data.

## Getting started with real class data

1. Open **Class settings** and create the first account. The first account in this new classroom is assigned the teacher role; later accounts are student accounts.
2. Add learner records from **Class settings**.
3. Have each learner create an account, then sign out and back in as the teacher. Use **Link a learner to their sign-in** to connect each student account to its roster record.
4. Students can then sign in and see their own progress, activity submissions and quiz results. Lesson resources and quizzes are available to signed-in class members. Quiz answers stay in a teacher-only table and scores are computed by the deployed `submit-quiz-result` Edge Function.

The role switch is for local preview only. Authenticated users get their role from the Supabase profile and RLS policies enforce teacher and student permissions. Supabase email confirmation settings may require users to confirm their address before their first sign-in. Storage uses a private `classroom-files` bucket with a 10 MB limit and PDF, Office document, text and common image file types. Class reminders currently appear in the dashboard/class board; email and push notifications are not configured.
