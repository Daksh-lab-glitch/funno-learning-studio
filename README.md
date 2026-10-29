# Funno Learning Studio

A responsive learning space for schools, universities and other teaching groups. Funno includes private teacher portals for separate classes/courses, class-code enrollment, assignments, quizzes, a playful activity room, progress review and a private teacher–student help chat.

## Run the frontend

Open this folder with VS Code Live Server, or run `python -m http.server 5500` here and visit `http://127.0.0.1:5500`.

The opening screen is a simple sign-in or account creation form. After signing up, teachers set up one or more school classes or university courses in the teacher portal; students join a class using the code from their teacher. Classroom data is stored in Supabase and protected by classroom-scoped row-level security.

## Features

- Sign-in and account creation for teachers and students.
- Teacher Studio for publishing to the currently selected class or course.
- Teacher portal for schools, universities, grades, classes, courses and student join codes.
- Lesson library for links, files and notes.
- Assignments, projects, discussions and fun challenges with private file attachments, student submissions, teacher grading and feedback.
- Teacher attendance, class announcements, quick quizzes and results.
- Funno Playroom with a word scramble, number patterns and curiosity breaks. Student results are saved.
- Private messages between a learner and the teacher who owns their class.
- Teacher progress view for the class roster, assessments, attendance, submissions and Funno activities.

## Supabase

Project: `lvuoqedkkviauyluqnju` (`smart classroom managment`). Apply the migrations in `supabase/migrations` to create the classroom schema, row-level security, quiz scoring, attendance, announcements, assignment grading, private Storage, multi-class portals, class enrollment, teacher chat and Teacher Studio activity attachments. The latest teacher studio migration is `20261029160000_funno_teacher_studio.sql`.

The local `supabase/.env` is Git-ignored and contains the project URL and browser-safe publishable key. Copy `supabase/.env.example` when setting up another machine. A secret/service-role key belongs only in Supabase's Edge Function secret store. The static frontend cannot read `.env`, so it uses the public publishable key in `api.js`; RLS policies protect database records.

Sign-in uses email and password. Choose Student or Teacher on the entry screen; the app checks that the selected account type matches the account saved in Supabase before opening the relevant workspace. The frontend no longer loads or sends Cloudflare Turnstile challenges.

## Set up a classroom

1. Create a teacher account in Funno with name, email, password and account type.
2. Open **School & courses** to create one or more class/course spaces and copy each private join code.
3. Each learner creates an account, chooses Student, then joins with the code from their teacher. Students see their enrolled class's work and their own results.
4. Teachers choose a class from the top bar and publish assignments, projects, discussions, fun challenges, quizzes, lessons and private file uploads from **Teacher Studio**.

Teacher permissions are limited to class spaces owned by that teacher. Class join codes are only shown to teachers. Email confirmation follows the Supabase project's Auth settings. Files stay in the private `classroom-files` bucket (10 MB limit). Class reminders currently appear in the app; email and push notifications are not configured.
