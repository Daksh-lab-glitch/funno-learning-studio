const projectUrl = Deno.env.get("SUPABASE_URL")!;
const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
const publishableKey = publishableKeysRaw
  ? JSON.parse(publishableKeysRaw).default
  : Deno.env.get("SUPABASE_ANON_KEY")!;
const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
const secretKey = secretKeysRaw
  ? JSON.parse(secretKeysRaw).default
  : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const usingNewSecret = Boolean(secretKeysRaw);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: usingNewSecret ? secretKey : publishableKey,
    ...(usingNewSecret ? {} : { Authorization: `Bearer ${secretKey}` }),
    "Content-Type": "application/json",
    ...extra,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return reply({ error: "Use POST for quiz submissions." }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const accessToken = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!accessToken) return reply({ error: "Sign in before submitting a quiz." }, 401);

  const authResponse = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!authResponse.ok) return reply({ error: "Your session is invalid or expired." }, 401);
  const user = await authResponse.json();

  let payload: { quiz_id?: number; answers?: number[] };
  try { payload = await request.json(); } catch { return reply({ error: "The quiz submission was not valid JSON." }, 400); }
  const quizId = Number(payload.quiz_id);
  const answers = payload.answers;
  if (!Number.isSafeInteger(quizId) || quizId < 1 || !Array.isArray(answers) || answers.length < 1 || answers.length > 20 || answers.some((item) => !Number.isSafeInteger(item) || item < 0)) {
    return reply({ error: "The quiz answers are incomplete or invalid." }, 400);
  }

  const studentResponse = await fetch(`${projectUrl}/rest/v1/students?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id,name,classroom_id`, { headers: adminHeaders() });
  if (!studentResponse.ok) return reply({ error: "Could not find your linked learner record." }, 500);
  const students = await studentResponse.json();
  if (students.length !== 1) return reply({ error: "Ask your teacher to link your account to a learner record first." }, 409);
  const student = students[0];

  const [quizResponse, keyResponse] = await Promise.all([
    fetch(`${projectUrl}/rest/v1/quizzes?id=eq.${quizId}&select=id,questions,classroom_id`, { headers: adminHeaders() }),
    fetch(`${projectUrl}/rest/v1/quiz_answer_keys?quiz_id=eq.${quizId}&select=answers`, { headers: adminHeaders() }),
  ]);
  if (!quizResponse.ok || !keyResponse.ok) return reply({ error: "Could not load the quiz for scoring." }, 500);
  const quizzes = await quizResponse.json();
  const keys = await keyResponse.json();
  if (quizzes.length !== 1 || keys.length !== 1) return reply({ error: "This quiz is not ready for submissions." }, 404);
  if (Number(quizzes[0].classroom_id) !== Number(student.classroom_id)) return reply({ error: "This quiz belongs to a different class." }, 403);
  const questions = quizzes[0].questions;
  const expectedAnswers = keys[0].answers;
  if (!Array.isArray(questions) || !Array.isArray(expectedAnswers) || questions.length !== expectedAnswers.length || answers.length !== questions.length) {
    return reply({ error: "Answer one choice for every quiz question." }, 400);
  }
  if (answers.some((choice, index) => choice >= questions[index].options.length)) return reply({ error: "One or more selected choices are invalid." }, 400);

  const correct = answers.reduce((total, choice, index) => total + (choice === Number(expectedAnswers[index]) ? 1 : 0), 0);
  const score = Math.round((correct / questions.length) * 100);
  const feedback = score >= 80 ? "Lovely work ✳" : "Keep practicing";
  const saved = await fetch(`${projectUrl}/rest/v1/quiz_results`, {
    method: "POST",
    headers: adminHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ quiz_id: quizId, student_id: student.id, student_name: student.name, score, feedback }),
  });
  if (!saved.ok) return reply({ error: "Your score could not be saved." }, 500);
  return reply({ score, correct, total: questions.length, feedback });
});
