# Funno Learning Studio

A responsive teacher–student learning space. Funno gives each teacher a private activity studio with a shareable verification code; students sign in and enter that code to unlock assignments, quizzes and playful activities. Progress, submissions and teacher–student help stay scoped to the teacher's studio.

## Run the frontend

Open this folder with VS Code Live Server, or run `python -m http.server 5500` here and visit `http://127.0.0.1:5500`.

The opening screen is a simple sign-in or account creation form. Teachers receive a private Funno Studio and code automatically. Students create an account or sign in, then enter a teacher's verification code to join that studio. Supabase stores the data and row-level security scopes activities and results to the teacher–student relationship.

## Features

- Sign-in and account creation for teachers and students.
- Teacher Studio for publishing to a teacher's private workspace.
- A single private teacher studio with a shareable student verification code.
- Lesson library for links, files and notes.
- Assignments, projects, discussions and fun challenges with private file attachments, student submissions, teacher grading and feedback.
- Teacher check-ins, student updates, quick quizzes and results.
- Funno Playroom with a word scramble, number patterns and curiosity breaks. Student results are saved.
- Private messages between a learner and their teacher.
- Teacher progress view for connected students, assessments, check-ins, submissions and Funno activities.

## Supabase

Project: `lvuoqedkkviauyluqnju` (`smart classroom managment`). Apply the migrations in `supabase/migrations` to create the teacher–student schema, row-level security, quiz scoring, attendance, updates, assignment grading, private Storage, student access codes, teacher chat and activity attachments. `20261029180000_funno_single_studio_and_student_access.sql` adds automatic studio provisioning.

The local `supabase/.env` is Git-ignored and contains the project URL and browser-safe publishable key. Copy `supabase/.env.example` when setting up another machine. A secret/service-role key belongs only in Supabase's Edge Function secret store. The static frontend cannot read `.env`, so it uses the public publishable key in `api.js`; RLS policies protect database records.

Sign-in uses email and password. Choose Student or Teacher on the entry screen; the app checks that the selected account type matches the account saved in Supabase before opening the relevant workspace. The frontend no longer loads or sends Cloudflare Turnstile challenges.

## Teacher and student access

1. Create a teacher account in Funno with name, email, password and account type.
2. A teacher's **Student access code** page shows the private verification code to share.
3. Students create an account or sign in, open **Student progress**, enter their name and the teacher's code, and unlock that teacher's assignments, games and quizzes.
4. Teachers publish assignments, projects, discussions, fun challenges, quizzes, lessons and private file uploads from **Teacher Studio**. They can review student submissions and quiz results there.

Teacher permissions are limited to their private studio. Verification codes are only shown to teachers; students must sign in before joining with one. Email confirmation follows the Supabase project's Auth settings. Files stay in the private `classroom-files` bucket (10 MB limit). Reminders currently appear in the app; email and push notifications are not configured.
