# Funno Learning Studio

A responsive teacher–student learning space. Funno gives each teacher a private activity studio with a shareable verification code; students sign in and enter that code to unlock assignments, quizzes and playful activities. Progress, submissions and teacher–student help stay scoped to the teacher's studio.

## Run the frontend

Open this folder with VS Code Live Server, or run `python -m http.server 5500` here and visit `http://127.0.0.1:5500`.

The opening screen is a simple sign-in or account creation form. Teachers receive a private Funno Studio and choose a unique code. Students enter the teacher's code during signup or every sign-in; the code links their account to that teacher's studio. Supabase row-level security limits classroom records, activities, updates, quizzes, games and results to that teacher–student relationship.

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
- Teacher-only Learning patterns in Teaching insights, using an on-device unsupervised K-means model to group similar engagement signals.

## Learning pattern model

The Teaching insights page runs a small K-means model in the teacher's browser over the currently selected studio's RLS-scoped learners. It uses attendance, assessment, participation, quiz averages and activity completion. The model needs at least three learners; unavailable quiz or assignment signals are treated as unknown. It does not send or store feature data or predictions. Groups are descriptive prompts for supportive teacher check-ins, not diagnoses, grades or automated decisions. Students do not see the teacher-only grouping.

## Supabase

Project: `lvuoqedkkviauyluqnju` (`smart classroom managment`). Apply the migrations in `supabase/migrations` to create the teacher–student schema, row-level security, quiz scoring, attendance, updates, assignment grading, private Storage, student access codes, teacher chat and activity attachments. `20261029180000_funno_single_studio_and_student_access.sql` adds automatic studio provisioning.

The local `supabase/.env` is Git-ignored and contains the project URL and browser-safe publishable key. Copy `supabase/.env.example` when setting up another machine. A secret/service-role key belongs only in Supabase's Edge Function secret store. The static frontend cannot read `.env`, so it uses the public publishable key in `api.js`; RLS policies protect database records.

Sign-in uses email and password. Choose Student or Teacher on the entry screen; the app checks that the selected account type matches the account saved in Supabase before opening the relevant workspace. The frontend no longer loads or sends Cloudflare Turnstile challenges.

## Teacher and student access

1. Create a teacher account in Funno with name, email, password and account type.
2. A teacher's **Student access code** page shows the private verification code to share; each teacher can set a unique 6–12 character code using letters and numbers.
3. Students enter their teacher's code when they create an account or sign in. The code joins them to that teacher's studio; a different teacher's code is rejected for an already-linked student account.
4. Teachers publish assignments, projects, discussions, fun challenges, quizzes, lessons and private file uploads from **Teacher Studio**. They can review student submissions and quiz results there.

Teacher permissions are limited to their own private studio. Students cannot read another teacher's classes or activities through the Supabase Data API; row-level security enforces the same boundary as the frontend gates. Verification codes are only shown to their teacher; students must sign in before joining with one. Email confirmation follows the Supabase project's Auth settings. Files stay in the private `classroom-files` bucket (10 MB limit). Reminders currently appear in the app; email and push notifications are not configured.

