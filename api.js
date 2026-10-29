// Public project configuration. A publishable key is browser-safe; row-level
// security governs access. Never put a Supabase service-role key in this file.
window.CLASSROOM_SUPABASE_URL = window.CLASSROOM_SUPABASE_URL || "https://lvuoqedkkviauyluqnju.supabase.co";
window.CLASSROOM_SUPABASE_KEY = window.CLASSROOM_SUPABASE_KEY || "sb_publishable_HWLlokI0MzFclcdEuxizhA_xXe8iKsJ";
(() => {
  const url = window.CLASSROOM_SUPABASE_URL.replace(/\/$/, "");
  const key = window.CLASSROOM_SUPABASE_KEY;
  let accessToken = null;
  let activeClassroomId = null;
  try { accessToken = JSON.parse(localStorage.getItem("funno-auth-session") || "null")?.access_token || null; } catch { accessToken = null; }
  const headers = () => ({ apikey: key, Authorization: `Bearer ${accessToken || key}`, "Content-Type": "application/json" });
  let localMode = false;
  const localFileUrls = new Map();
  const demo = {
    students: [
      { id: 1, name: "Aanya Patel", attendance: 96, assessment: 88, participation: 92 },
      { id: 2, name: "Ishaan Mehta", attendance: 82, assessment: 73, participation: 78 },
      { id: 3, name: "Mira Sharma", attendance: 72, assessment: 55, participation: 63 },
      { id: 4, name: "Kabir Rao", attendance: 91, assessment: 84, participation: 86 },
    ],
    resources: [
      { id: 1, title: "The wonderful world of plants", type: "lesson", description: "A gentle introduction to how plants grow and what they need.", url: "https://www.britannica.com/plant/plant" },
      { id: 2, title: "Fraction kitchen: a quick video", type: "link", description: "Explore halves, thirds and quarters in everyday recipes.", url: "https://www.khanacademy.org/math" },
      { id: 3, title: "Friday reflection prompts", type: "file", description: "Three questions to help learners celebrate what they tried this week.", url: null },
    ],
    assignments: [
      { id: 1, title: "A tiny garden journal", description: "Sketch or describe one plant you noticed this week. What might it need to grow?", due_date: "2026-10-30" },
      { id: 2, title: "Fractions in the kitchen", description: "Choose a recipe and find one example of a fraction in its ingredients.", due_date: "2026-11-02" },
    ],
    submissions: [], attendance: [], announcements: [], funResults: [],
    quizzes: [
      { id: 1, title: "Plant life check-in", questions: [
        { prompt: "Which part of a plant usually takes in water from the soil?", options: ["Roots", "Flower", "Fruit", "Leaf"], answer: 0 },
        { prompt: "What do plants use sunlight for?", options: ["Making food", "Finding soil", "Making seeds move", "Drinking water"], answer: 0 },
        { prompt: "Which of these can help a seed begin to grow?", options: ["Water", "A shoe", "A pebble only", "A book"], answer: 0 },
      ] },
      { id: 2, title: "Fraction friends", questions: [
        { prompt: "How many quarters make one whole?", options: ["Two", "Three", "Four", "Five"], answer: 2 },
        { prompt: "Which fraction is the same as one half?", options: ["2/4", "1/3", "3/5", "1/4"], answer: 0 },
      ] },
    ],
    results: [], feedback: [],
  };
  let modeReady;
  function loadLocal() {
    localMode = true;
    try {
      const saved = JSON.parse(localStorage.getItem("bloom-preview-data") || "null");
      if (saved && typeof saved === "object") Object.keys(demo).forEach((key) => { if (Array.isArray(saved[key])) demo[key] = saved[key]; });
    } catch { /* Keep the in-memory sample content when local storage is unavailable. */ }
  }
  function saveLocal() {
    try { localStorage.setItem("bloom-preview-data", JSON.stringify(demo)); } catch { /* In-memory preview remains usable. */ }
  }
  async function rawRequest(path, options = {}) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: { ...headers(), ...(options.body ? { Prefer: "return=representation" } : {}), ...options.headers },
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.details || body.hint || `Supabase request failed (${response.status})`);
    return body;
  }
  async function selectMode() {
    localMode = !accessToken;
    if (localMode) { loadLocal(); return; }
    try {
      await rawRequest("students?select=id&limit=1");
      await rawRequest("resources?select=id&limit=1");
      await rawRequest("quizzes?select=id&limit=1");
      await rawRequest("assignments?select=id&limit=1");
      await rawRequest("submissions?select=id&limit=1");
      await rawRequest("quiz_results?select=id&limit=1");
      await rawRequest("feedback?select=id&limit=1");
      await rawRequest("attendance_entries?select=id&limit=1");
      await rawRequest("announcements?select=id&limit=1");
    } catch {
      throw new Error("Could not reach the Funno Supabase tables. Check the migration and your account session.");
    }
  }
  modeReady = selectMode();
  const list = (table) => demo[table];
  const nextId = (table) => Math.max(0, ...list(table).map((row) => Number(row.id) || 0)) + 1;
  window.ClassroomAPI = {
    ready() { return modeReady; },
    async signIn(email, password) {
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Could not sign in.");
      accessToken = data.access_token; localStorage.setItem("funno-auth-session", JSON.stringify(data)); modeReady = selectMode(); await modeReady; return data;
    },
    async signUp(email, password, displayName) {
      const response = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password, data: { display_name: displayName } }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Could not create account.");
      if (data.access_token) { accessToken = data.access_token; localStorage.setItem("funno-auth-session", JSON.stringify(data)); modeReady = selectMode(); await modeReady; }
      return data;
    },
    async signOut() {
      if (accessToken) await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${accessToken}` } }).catch(() => {});
      accessToken = null; localStorage.removeItem("funno-auth-session"); localMode = true; loadLocal(); modeReady = Promise.resolve();
    },
    async getMyProfile() { await modeReady; if (localMode) return null; const session = JSON.parse(localStorage.getItem("funno-auth-session") || "{}"); const rows = await rawRequest(`user_profiles?id=eq.${encodeURIComponent(session.user?.id || "")}&select=*`); return rows[0] || null; },
    setActiveClassroom(id) { activeClassroomId = id ? Number(id) : null; },
    async getClassrooms() { await modeReady; if (localMode) return []; const [rooms, codes] = await Promise.all([rawRequest("classrooms?select=id,institution_id,teacher_id,name,education_level,grade,course,created_at,institutions(name,institution_type)&order=created_at.asc"), rawRequest("rpc/my_class_codes", { method: "POST", body: "{}" })]); return rooms.map((room) => ({ ...room, join_code: codes.find((code) => String(code.classroom_id) === String(room.id))?.join_code || null })); },
    async getInstitutions() { await modeReady; return localMode ? [] : rawRequest("institutions?select=*&order=name.asc"); },
    async getMyStudent() { await modeReady; if (localMode) return null; const session = JSON.parse(localStorage.getItem("funno-auth-session") || "{}"); const rows = await rawRequest(`students?auth_user_id=eq.${encodeURIComponent(session.user?.id || "")}&select=*&limit=1`); return rows[0] || null; },
    async requestTeacherRole() { await modeReady; if (localMode) throw new Error("Teacher accounts need a Supabase connection."); return rawRequest("rpc/request_teacher_role", { method: "POST", body: "{}" }); },
    async createInstitution(value) { await modeReady; if (localMode) throw new Error("Create a teacher account to add an institution."); const rows = await rawRequest("institutions", { method: "POST", body: JSON.stringify(value) }); return rows[0]; },
    async createClassroom(value) { await modeReady; if (localMode) throw new Error("Create a teacher account to add a class."); const rows = await rawRequest("classrooms?select=id,institution_id,teacher_id,name,education_level,grade,course,created_at", { method: "POST", body: JSON.stringify(value) }); const codes = await rawRequest("rpc/my_class_codes", { method: "POST", body: "{}" }); return { ...rows[0], join_code: codes.find((code) => String(code.classroom_id) === String(rows[0].id))?.join_code || null }; },
    async joinClass(inviteCode, learnerName) { await modeReady; if (localMode) throw new Error("Sign in to join your teacher’s class."); return rawRequest("rpc/join_class", { method: "POST", body: JSON.stringify({ invite_code: inviteCode, learner_name: learnerName }) }); },
    async getProfiles() { await modeReady; return localMode ? [] : rawRequest("user_profiles?select=id,email,display_name,role&order=display_name.asc"); },
    async linkStudentAccount(id, authUserId) { await modeReady; if (localMode) return null; return rawRequest(`students?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ auth_user_id: authUserId || null }) }); },
    async getStudents() { await modeReady; if (localMode) return list("students"); const session = JSON.parse(localStorage.getItem("funno-auth-session") || "{}"); const filter = activeClassroomId ? `classroom_id=eq.${encodeURIComponent(activeClassroomId)}` : `auth_user_id=eq.${encodeURIComponent(session.user?.id || "")}`; return rawRequest(`students?select=*&${filter}&order=id.asc`); },
    async addStudent(student) { await modeReady; if (localMode) { const row = { ...student, id: nextId("students") }; demo.students.push(row); saveLocal(); return row; } return rawRequest("students", { method: "POST", body: JSON.stringify({ ...student, classroom_id: activeClassroomId }) }); },
    async updateStudent(id, student) { await modeReady; if (localMode) { const row = list("students").find((item) => String(item.id) === String(id)); if (row) Object.assign(row, student); saveLocal(); return row; } return rawRequest(`students?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(student) }); },
    async deleteStudent(id) { await modeReady; if (localMode) { demo.students = list("students").filter((item) => String(item.id) !== String(id)); saveLocal(); return null; } return rawRequest(`students?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); },
    async getResources() { await modeReady; return localMode ? list("resources") : rawRequest(`resources?select=*&classroom_id=eq.${encodeURIComponent(activeClassroomId || -1)}&order=created_at.desc`); },
    async addResource(value) { await modeReady; if (localMode) { const row = { ...value, id: nextId("resources"), created_at: new Date().toISOString() }; demo.resources.unshift(row); saveLocal(); return row; } return rawRequest("resources", { method: "POST", body: JSON.stringify({ ...value, classroom_id: activeClassroomId }) }); },
    async deleteResource(id) { await modeReady; if (localMode) { demo.resources = list("resources").filter((item) => String(item.id) !== String(id)); saveLocal(); return null; } return rawRequest(`resources?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); },
    async getAssignments() { await modeReady; return localMode ? list("assignments") : rawRequest(`assignments?select=*&classroom_id=eq.${encodeURIComponent(activeClassroomId || -1)}&order=created_at.desc`); },
    async addAssignment(value) { await modeReady; if (localMode) { const row = { ...value, id: nextId("assignments"), max_points: value.max_points || 100, created_at: new Date().toISOString() }; demo.assignments.unshift(row); saveLocal(); return row; } return rawRequest("assignments", { method: "POST", body: JSON.stringify({ ...value, classroom_id: activeClassroomId }) }); },
    async getSubmissions() { await modeReady; if (localMode) return list("submissions"); const ids = window.FunnoStudentIds || []; return ids.length ? rawRequest(`submissions?select=*&student_id=in.(${ids.map(encodeURIComponent).join(",")})&order=created_at.desc`) : []; },
    async submitAssignment(value) { await modeReady; if (localMode) { const row = { ...value, id: nextId("submissions"), created_at: new Date().toISOString() }; demo.submissions.push(row); saveLocal(); return row; } return rawRequest("submissions", { method: "POST", body: JSON.stringify(value) }); },
    async updateSubmission(id, value) { await modeReady; if (localMode) { const row = list("submissions").find((item) => String(item.id) === String(id)); if (row) Object.assign(row, value); saveLocal(); return row; } return rawRequest(`submissions?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(value) }); },
    async uploadFile(file, path) {
      await modeReady;
      if (localMode) { const blobUrl = URL.createObjectURL(file); localFileUrls.set(path, blobUrl); return { path, url: blobUrl }; }
      const response = await fetch(`${url}/storage/v1/object/classroom-files/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }, body: file });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || data.error || `Upload failed (${response.status})`); return { path, url: null };
    },
    async getFileUrl(path) {
      if (!path) return null; await modeReady;
      if (localMode) return localFileUrls.get(path) || (path.startsWith("blob:") || /^https?:/.test(path) ? path : null);
      const response = await fetch(`${url}/storage/v1/object/sign/classroom-files/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "POST", headers: headers(), body: JSON.stringify({ expiresIn: 3600 }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || `Could not open file (${response.status})`); return data.signedURL?.startsWith("http") ? data.signedURL : `${url}/storage/v1${data.signedURL}`;
    },
    async deleteFile(path) { if (!path) return null; if (localMode) { const old = localFileUrls.get(path); if (old) URL.revokeObjectURL(old); localFileUrls.delete(path); return null; } const response = await fetch(`${url}/storage/v1/object/classroom-files`, { method: "DELETE", headers: headers(), body: JSON.stringify({ prefixes: [path] }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || "Could not delete file"); return data; },
    async getAnnouncements() { await modeReady; return localMode ? list("announcements") : rawRequest(`announcements?select=*&classroom_id=eq.${encodeURIComponent(activeClassroomId || -1)}&order=published_at.desc`); },
    async addAnnouncement(value) { await modeReady; if (localMode) { const row = { ...value, id: nextId("announcements"), created_at: new Date().toISOString() }; demo.announcements.unshift(row); saveLocal(); return row; } return rawRequest("announcements", { method: "POST", body: JSON.stringify({ ...value, classroom_id: activeClassroomId }) }); },
    async deleteAnnouncement(id) { await modeReady; if (localMode) { demo.announcements = list("announcements").filter((x) => String(x.id) !== String(id)); saveLocal(); return null; } return rawRequest(`announcements?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); },
    async getAttendance(date) { await modeReady; return localMode ? list("attendance").filter((row) => row.class_date === date) : rawRequest(`attendance_entries?select=*&class_date=eq.${encodeURIComponent(date)}&order=student_id.asc`); },
    async getAttendanceHistory() { await modeReady; if (localMode) return list("attendance"); const ids = window.FunnoStudentIds || []; return ids.length ? rawRequest(`attendance_entries?select=*&student_id=in.(${ids.map(encodeURIComponent).join(",")})&order=class_date.desc&limit=100`) : []; },
    async saveAttendance(rows) { await modeReady; if (localMode) { rows.forEach((row) => { const old = demo.attendance.find((x) => x.student_id === row.student_id && x.class_date === row.class_date); if (old) Object.assign(old, row); else demo.attendance.push({ ...row, id: nextId("attendance") }); }); saveLocal(); return rows; } return rawRequest("attendance_entries?on_conflict=student_id,class_date", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(rows) }); },
    async getQuizzes() { await modeReady; return localMode ? list("quizzes") : rawRequest(`quizzes?select=*&classroom_id=eq.${encodeURIComponent(activeClassroomId || -1)}&order=created_at.desc`); },
    async addQuiz(value) {
      await modeReady;
      if (localMode) { const row = { ...value, id: nextId("quizzes"), created_at: new Date().toISOString() }; demo.quizzes.unshift(row); saveLocal(); return row; }
      const questions = value.questions.map(({ prompt, options }) => ({ prompt, options }));
      const created = await rawRequest("quizzes", { method: "POST", body: JSON.stringify({ title: value.title, classroom_id: activeClassroomId, questions }) });
      const quiz = created[0];
      try {
        await rawRequest("quiz_answer_keys", { method: "POST", body: JSON.stringify({ quiz_id: quiz.id, classroom_id: activeClassroomId, answers: value.questions.map((question) => question.answer) }) });
      } catch (error) {
        await rawRequest(`quizzes?id=eq.${encodeURIComponent(quiz.id)}`, { method: "DELETE" }).catch(() => {});
        throw error;
      }
      return quiz;
    },
    async getResults() { await modeReady; if (localMode) return list("results"); const ids = window.FunnoStudentIds || []; return ids.length ? rawRequest(`quiz_results?select=*&student_id=in.(${ids.map(encodeURIComponent).join(",")})&order=created_at.desc`) : []; },
    async getMessages(studentId = null) { await modeReady; if (localMode) return []; const query = studentId ? `student_id=eq.${encodeURIComponent(studentId)}` : activeClassroomId ? `classroom_id=eq.${encodeURIComponent(activeClassroomId)}` : "id=eq.-1"; return rawRequest(`class_messages?select=*&${query}&order=created_at.asc&limit=300`); },
    async sendMessage(studentId, body) { await modeReady; if (localMode) throw new Error("Sign in to message your teacher."); return rawRequest("class_messages", { method: "POST", body: JSON.stringify({ student_id: studentId, classroom_id: activeClassroomId, body }) }); },
    async getFunResults() { await modeReady; if (localMode) return demo.funResults; return activeClassroomId ? rawRequest(`fun_activity_results?select=*&classroom_id=eq.${encodeURIComponent(activeClassroomId)}&order=created_at.desc&limit=100`) : []; },
    async saveFunResult(value) { await modeReady; if (localMode) { demo.funResults ||= []; demo.funResults.unshift({ ...value, id: nextId("funResults"), created_at: new Date().toISOString() }); saveLocal(); return demo.funResults[0]; } return rawRequest("fun_activity_results", { method: "POST", body: JSON.stringify({ ...value, classroom_id: activeClassroomId }) }); },
    async submitQuiz(value) {
      await modeReady;
      if (localMode) {
        const quiz = list("quizzes").find((item) => String(item.id) === String(value.quiz_id));
        const correct = (value.answers || []).reduce((total, answer, index) => total + (Number(answer) === Number(quiz?.questions?.[index]?.answer) ? 1 : 0), 0);
        const score = quiz?.questions?.length ? Math.round(correct / quiz.questions.length * 100) : 0;
        const row = { quiz_id: value.quiz_id, student_id: value.student_id, student_name: value.student_name, score, feedback: score >= 80 ? "Lovely work ✳" : "Keep practicing", id: nextId("results"), created_at: new Date().toISOString() };
        demo.results.unshift(row); saveLocal(); return { score, correct, total: quiz?.questions?.length || 0, feedback: row.feedback };
      }
      const response = await fetch(`${url}/functions/v1/submit-quiz-result`, { method: "POST", headers: headers(), body: JSON.stringify({ quiz_id: value.quiz_id, answers: value.answers }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Quiz scoring failed (${response.status})`);
      return result;
    },
    async getEngagement(id) { const students = await this.getStudents(), student = students.find((item) => String(item.id) === String(id)); if (!student) throw new Error("Student not found"); return classify(student.attendance, student.assessment, student.participation); },
    async submitFeedback(rating, comment) { await modeReady; if (localMode) { demo.feedback.push({ id: nextId("feedback"), rating, comment }); saveLocal(); return null; } return rawRequest("feedback", { method: "POST", body: JSON.stringify({ rating, comment }) }); },
    async getFeedbackSummary() { await modeReady; const rows = localMode ? list("feedback") : await rawRequest("feedback?select=rating"); return { count: rows.length, average_rating: rows.length ? Number((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length).toFixed(2)) : null }; },
    async getAdminStats() { const [learners, feedback, resources, assignments, results] = await Promise.all([this.getStudents(), this.getFeedbackSummary(), this.getResources(), this.getAssignments(), this.getResults()]); const counts = { High: 0, Moderate: 0, Low: 0, "Insufficient Data": 0 }; learners.forEach((student) => counts[classify(student.attendance, student.assessment, student.participation).state]++); return { student_count: learners.length, engagement_counts: counts, feedback_count: feedback.count, resource_count: resources.length, assignment_count: assignments.length, result_count: results.length }; },
    isPreviewMode() { return localMode; },
  };
  function classify(attendance, assessment, participation) {
    if ([attendance, assessment, participation].some((value) => value === null || value === undefined)) return { state: "Insufficient Data", evidence: "Not enough progress information yet.", recommendation: "Give this learner time to settle in and check in together.", mode: "classroom snapshot" };
    const score = Number(attendance) * .3 + Number(assessment) * .3 + Number(participation) * .4;
    const state = score >= 80 ? "High" : score >= 60 ? "Moderate" : "Low";
    return { state, score: Math.round(score), evidence: `A ${Math.round(score)}% classroom progress snapshot, based on attendance, assessment and participation.`, recommendation: state === "High" ? "Celebrate this steady progress and offer an interesting new challenge." : state === "Moderate" ? "Share a quick word of encouragement and notice which activity feels engaging." : "A friendly one-to-one check-in can help you learn what kind of support would feel useful.", mode: "classroom snapshot" };
  }
})();
