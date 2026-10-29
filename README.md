# Funno Learning Studio

A responsive learning space for schools, universities and other teaching groups. Funno includes private teacher portals for separate classes/courses, class-code enrollment, assignments, quizzes, a playful activity room, progress review and a private teacher–student help chat.

## Run the frontend

Open this folder with VS Code Live Server, or run `python -m http.server 5500` here and visit `http://127.0.0.1:5500`.

The opening screen requires a Supabase account. Teachers set up their school/institution and one or more class/course spaces; students create their own accounts and join using a code from their teacher. Classroom data is stored in Supabase and protected by classroom-scoped row-level security.

## Features

- Sign-in and account creation for teachers and students.
- Teacher portal for schools, universities, grades, classes, courses and student join codes.
- Lesson library for links, files and notes.
- Assignments with student submissions, teacher grading and private feedback.
- Teacher attendance, class announcements, quick quizzes and results.
- Funno Playroom with a word scramble, number patterns and curiosity breaks. Student results are saved.
- Private messages between a learner and the teacher who owns their class.
- Teacher progress view for the class roster, assessments, attendance, submissions and Funno activities.

## Supabase

Project: `lvuoqedkkviauyluqnju` (`smart classroom managment`). Apply the migrations in `supabase/migrations` to create the classroom schema, row-level security, quiz scoring, attendance, announcements, assignment grading, private Storage, multi-class portals, class enrollment and teacher chat. In particular, apply `20261029130000_funno_multiclass_teacher_portal.sql` before using these new screens.

The local `supabase/.env` is Git-ignored and contains the project URL and browser-safe publishable key. Copy `supabase/.env.example` when setting up another machine. A secret/service-role key belongs only in Supabase's Edge Function secret store. The static frontend cannot read `.env`, so it uses the public publishable key in `api.js`; RLS policies protect database records.

### Cloudflare Turnstile

1. Create a Turnstile widget in Cloudflare and allow your hosted domain plus `localhost`/`127.0.0.1` while developing.
2. Put the **site key** in `window.CLASSROOM_TURNSTILE_SITE_KEY` in `api.js`.
3. In Supabase Dashboard → **Authentication → Bot and Abuse Protection**, enable CAPTCHA, choose **Turnstile**, paste the matching **secret key**, and save.

The site key is public and belongs in the frontend. Keep the secret key out of `api.js`, `.env.example`, and Git. When the site key is configured, Funno requires a completed Turnstile check for sign-up/sign-in and Supabase verifies the token with the secret key.

## Set up a classroom

1. Create a teacher account in Funno and enter the school/institution plus the first class or university course.
2. Open **School & courses** to copy that class's join code or create more class/course spaces.
3. Each learner creates an account, selects Student and enters their teacher's code. Students see their enrolled class's work and their own results.
4. Teachers create assignments and quizzes, review work and use **Ask for help** to message each learner privately.

Teacher permissions are limited to class spaces owned by that teacher. Class join codes are only shown to teachers. Email confirmation follows the Supabase project's Auth settings. Files stay in the private `classroom-files` bucket (10 MB limit). Class reminders currently appear in the app; email and push notifications are not configured.
