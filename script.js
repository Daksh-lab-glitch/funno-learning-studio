const $ = (id) => document.getElementById(id);
const state = { students: [], resources: [], assignments: [], submissions: [], quizzes: [], results: [], attendance: [], announcements: [], profiles: [], classrooms: [], profile: null, student: null, messages: [], funResults: [], activeClassroomId: null, role: "student", resourceFilter: "all", assignmentFilter: "all", currentQuiz: null, currentAssignment: null, toastTimer: null, entryMode: "signin" };
const initials = (name = "?") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
const safeDate = (value) => value ? new Date(`${value}T12:00:00`) : null;
const dateText = (value) => { const date = safeDate(value); return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date"; };
function el(tag, text, className = "") { const node = document.createElement(tag); if (text !== undefined) node.textContent = String(text); if (className) node.className = className; return node; }
function showMessage(text, isError = false) { const node = $("app-message"); node.textContent = text; node.className = isError ? "error" : "success"; setTimeout(() => { node.textContent = ""; node.className = ""; }, 3500); }
function toast(message) { const node = $("toast"); node.textContent = message; node.classList.add("show"); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => node.classList.remove("show"), 2600); }
function showError(error, prefix = "Something went wrong") { showMessage(`${prefix}: ${error.message}`, true); }
function engagement(student) { const score = Number(student.attendance) * .3 + Number(student.assessment) * .3 + Number(student.participation) * .4; return { score: Math.round(score), state: score >= 80 ? "High" : score >= 60 ? "Moderate" : "Low" }; }
function roleName(student) { return student?.name || localStorage.getItem("bloom-student-name") || "Aanya Patel"; }
function currentStudent() { return state.student || (state.students.find((student) => String(student.id) === String(localStorage.getItem("bloom-student-id"))) || state.students[0] || null); }
function myName() { return state.role === "student" ? roleName(currentStudent()) : "Teacher"; }
function setRole(role) {
  state.role = state.profile?.role || role; localStorage.setItem("bloom-role", state.role);
  const student = currentStudent(); if (student) { localStorage.setItem("bloom-student-id", student.id); localStorage.setItem("bloom-student-name", student.name); }
  const roleLabel = $("role-label"); roleLabel.replaceChildren(document.createTextNode(role === "teacher" ? "Teacher view" : myName())); const roleHint = el("small", role === "teacher" ? "Switch to student view" : "Switch to teacher view"); roleLabel.append(roleHint);
  $("user-avatar").textContent = role === "teacher" ? "T" : initials(myName());
  $("role-switch").querySelector(".role-avatar").textContent = role === "teacher" ? "T" : initials(myName());
  $("role-switch").hidden = Boolean(state.profile);
  $("switch-account").hidden = !(state.profile?.role === "teacher" || state.profile?.role === "student");
  $("welcome-subtitle").textContent = role === "teacher" ? "A little curiosity goes a long way. Here’s your class at a glance." : `Welcome back, ${myName().split(" ")[0]}. Your learning story is right here.`;
  $("progress-intro").textContent = role === "teacher" ? "See the whole person, not just the numbers. Celebrate wins and spot where support helps." : "See your activity, celebrate what you have finished, and find your quiz results.";
  document.querySelectorAll(".teacher-only").forEach((node) => { node.hidden = state.role !== "teacher"; });
  document.querySelectorAll(".student-only").forEach((node) => { node.hidden = state.role !== "student"; });
  $("role-switch").hidden = true;
  $("class-picker-wrap").hidden = !(state.role === "teacher" && state.classrooms.length > 1);
  if (state.role === "student") document.querySelectorAll(".teacher-only").forEach((node) => { node.hidden = true; });
  $("switch-account").hidden = true;
  $("student-join-panel").hidden = !(state.profile?.role === "student" && !state.student);
  $("fun-score-label").textContent = state.role === "teacher" ? "Class activity results" : "Play streak";
  renderClassrooms(); renderFunResults();
  renderAll();
}
function setPage(pageId) {
  const page = $(pageId); if (!page) return;
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.page === pageId));
  document.querySelectorAll(".page").forEach((item) => item.classList.toggle("active", item.id === pageId));
  const nav = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
  $("page-title").textContent = nav ? nav.textContent.trim() : page.querySelector("h1")?.textContent.replace(/[.]/g, "") || "Overview";
  if (pageId === "recommendations") loadFeedbackSummary();
  if (pageId === "admin") renderAdmin();
  if (pageId === "help-chat") loadChat();
  if (pageId === "fun-zone") { if (state.role === "student") newScramble(); renderFunResults(); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function openModal(id) { const modal = $(id); modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); modal.querySelector("input,textarea,select,button")?.focus(); }
function closeModal(modal) { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }
function resourceIcon(type) { return type === "lesson" ? "▤" : type === "link" ? "↗" : "▧"; }

function renderDashboard() {
  const counts = { High: 0, Moderate: 0, Low: 0 }; state.students.forEach((student) => counts[engagement(student).state]++);
  $("total-students").textContent = state.students.length;
  $("total-resources").textContent = state.resources.length;
  $("student-stat-note").textContent = state.students.length ? "Ready to learn" : "Add your first learner";
  const scores = state.results.map((r) => Number(r.score)).filter(Number.isFinite);
  const assessmentScores = state.students.map((s) => Number(s.assessment)).filter(Number.isFinite);
  const allScores = scores.length ? scores : assessmentScores;
  $("average-progress").textContent = allScores.length ? `${Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)}%` : "—";
  const openAssignments = state.assignments.filter((a) => !state.submissions.some((sub) => String(sub.assignment_id) === String(a.id) && sub.student_name === myName()));
  $("pending-count").textContent = openAssignments.length;
  const bars = $("engagement-bars"); bars.replaceChildren();
  Object.entries(counts).forEach(([label, value]) => {
    const row = el("div", undefined, "progress-row"), desc = el("div", undefined, "progress-label");
    desc.append(el("span", label), el("strong", `${value} ${value === 1 ? "learner" : "learners"}`));
    const track = el("div", undefined, "progress-track"), fill = el("div", undefined, "progress-fill"); fill.style.width = `${state.students.length ? value / state.students.length * 100 : 0}%`; track.append(fill); row.append(desc, track); bars.append(row);
  });
  const upcoming = $("upcoming-list"); upcoming.replaceChildren();
  const upcomingItems = [...state.assignments].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")).slice(0, 3);
  if (!upcomingItems.length) upcoming.append(el("div", "A nice, open space for your next activity.", "empty-state"));
  upcomingItems.forEach((assignment) => {
    const item = el("div", undefined, "upcoming-item"), date = el("div", undefined, "date-block"), parsed = safeDate(assignment.due_date);
    date.append(el("span", parsed?.toLocaleDateString(undefined, { month: "short" }) || "NEXT"), el("b", parsed?.toLocaleDateString(undefined, { day: "numeric" }) || "✳"));
    const detail = el("div"); detail.append(el("b", assignment.title), el("small", `Due ${dateText(assignment.due_date)}`)); item.append(date, detail); upcoming.append(item);
  });
  const attention = $("attention-list"); attention.replaceChildren();
  const needsCheckin = state.students.filter((s) => engagement(s).state === "Low").slice(0, 4);
  if (!needsCheckin.length) attention.append(el("p", state.students.length ? "No urgent check-ins in this snapshot. Keep celebrating each learner’s progress." : "Add learners to see a helpful progress snapshot.", "empty-state"));
  needsCheckin.forEach((student) => { const card = el("div", undefined, "attention-card"), avatar = el("span", initials(student.name), "role-avatar"), detail = el("span"); detail.append(el("b", student.name), el("small", `${engagement(student).score}% snapshot · a friendly check-in can help`)); card.append(avatar, detail); attention.append(card); });
}
function renderResources() {
  const list = $("resource-list"), query = $("resource-search").value.trim().toLowerCase(); list.replaceChildren();
  const records = state.resources.filter((r) => (state.resourceFilter === "all" || r.type === state.resourceFilter) && `${r.title} ${r.description || ""}`.toLowerCase().includes(query));
  if (!records.length) { list.append(el("div", "Your library is ready for its first lesson, link or helpful note.", "empty-state")); return; }
  records.forEach((resource) => {
    const card = el("article", undefined, "resource-card"), top = el("div", undefined, "resource-top"); top.append(el("span", resourceIcon(resource.type), "resource-icon"), el("span", resource.type || "file", "resource-type"));
    card.append(top, el("h3", resource.title), el("p", resource.description || "A classroom resource to revisit together."));
    const actions = el("div", undefined, "resource-actions"); if (resource.url) { const link = el("a", "Open resource ↗", "mini-button"); link.href = resource.url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.style.textDecoration = "none"; actions.append(link); } if (resource.file_name) actions.append(el("small", resource.file_name, "muted-note"));
    if (state.role === "teacher") { const remove = el("button", "Remove", "mini-button"); remove.type = "button"; remove.addEventListener("click", () => removeResource(resource.id)); actions.append(remove); }
    card.append(actions); list.append(card);
  });
}
function mySubmission(assignment) { const student = currentStudent(); return state.submissions.find((sub) => String(sub.assignment_id) === String(assignment.id) && (student && String(sub.student_id) === String(student.id) || sub.student_name === myName())); }
function hasSubmitted(assignment, name = myName()) { return state.submissions.some((sub) => String(sub.assignment_id) === String(assignment.id) && (String(sub.student_id) === String(currentStudent()?.id) || sub.student_name === name)); }
function renderAssignments() {
  const list = $("assignment-list"); list.replaceChildren();
  const filtered = state.assignments.filter((a) => state.assignmentFilter === "all" || (state.assignmentFilter === "open" ? !hasSubmitted(a) : hasSubmitted(a)));
  if (!filtered.length) { list.append(el("div", state.assignmentFilter === "submitted" ? "When you complete an activity, it will show up here." : "No activities yet. A fresh start is full of possibility.", "empty-state")); return; }
  filtered.forEach((assignment) => {
    const card = el("article", undefined, "assignment-card"), icon = el("span", "✳", "assignment-symbol"), main = el("div", undefined, "assignment-main");
    main.append(el("h3", assignment.title), el("p", assignment.description || "Your teacher has added a new classroom activity."));
    const submission = mySubmission(assignment), complete = Boolean(submission), status = el("span", submission?.status === "graded" ? `Graded · ${submission.grade ?? "—"}/${assignment.max_points || 100}` : complete ? "Submitted · awaiting review" : "Ready when you are", `status-pill ${complete ? "done" : ""}`), meta = el("span", `Due ${dateText(assignment.due_date)} · ${assignment.max_points || 100} points`, "assignment-meta");
    card.append(el("span", (assignment.activity_type || "assignment").replaceAll("_", " "), "activity-kind"), icon, main); if (state.role === "student") { const submit = el("button", complete && submission?.status !== "graded" ? "Edit submission" : "Submit work →", "mini-button"); submit.disabled = submission?.status === "graded"; submit.addEventListener("click", () => openSubmission(assignment, submission)); card.append(submit, status); if (assignment.attachment_path) { const open = el("a", `Open teacher file · ${assignment.file_name || "attachment"}`, "text-link"); open.href = assignment.attachment_url || "#"; open.target = "_blank"; open.rel = "noopener"; card.append(open); } if (submission?.teacher_feedback) card.append(el("p", `Teacher note: ${submission.teacher_feedback}`, "submission-feedback")); } else { card.append(meta); if (assignment.attachment_path) card.append(el("small", `Attached: ${assignment.file_name || "file"}`, "muted-note")); }
    list.append(card);
  });
}
function renderQuizzes() {
  const list = $("quiz-list"); list.replaceChildren();
  if (!state.quizzes.length) list.append(el("div", "Your teacher can add a small check-in quiz here whenever the class is ready.", "empty-state"));
  state.quizzes.forEach((quiz) => { const card = el("article", undefined, "quiz-card"); card.append(el("span", `${Array.isArray(quiz.questions) ? quiz.questions.length : 0} QUICK QUESTIONS`, "quiz-badge"), el("h3", quiz.title), el("p", "A no-pressure moment to practice what you know.")); const action = el("button", state.role === "teacher" ? "Preview challenge →" : "Give it a try →", "button button-primary"); action.addEventListener("click", () => startQuiz(quiz)); card.append(action); list.append(card); });
  renderResults();
}
function renderResults() {
  const table = $("result-table"); table.replaceChildren(); const myResults = state.results.filter((result) => state.role === "teacher" || result.student_name === myName());
  if (!myResults.length) { const row = el("tr"), cell = el("td", state.role === "teacher" ? "Quiz results will appear as learners explore challenges." : "Your results will appear here after your first quiz."); cell.colSpan = 5; row.append(cell); table.append(row); return; }
  myResults.forEach((result) => { const quiz = state.quizzes.find((item) => String(item.id) === String(result.quiz_id)), row = el("tr"); [quiz?.title || "Quick challenge", result.student_name || "Learner"].forEach((value) => row.append(el("td", value))); row.append(el("td", `${result.score}%`, "score-pill"), el("td", result.created_at ? new Date(result.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Just now"), el("td", result.feedback || (result.score >= 80 ? "Lovely work ✳" : "Keep practicing"))); table.append(row); });
  const mine = $("my-results-list"); if (mine) { mine.replaceChildren(); state.results.filter((r) => r.student_name === myName()).slice(0, 4).forEach((result) => { const quiz = state.quizzes.find((q) => String(q.id) === String(result.quiz_id)); const item = el("div", undefined, "upcoming-item"); item.append(el("span", `${result.score}%`, "score-pill"), el("b", quiz?.title || "Quick challenge")); mine.append(item); }); }
}
function renderStudents(search = "") {
  const table = $("student-table"); table.replaceChildren(); const term = search.toLowerCase();
  const visible = state.students.filter((student) => (state.role === "teacher" || String(student.id) === String(currentStudent()?.id)) && student.name.toLowerCase().includes(term));
  if (!visible.length) { const row = el("tr"), cell = el("td", state.role === "student" ? "Choose a learner record in teacher view to see its progress." : "No learners found yet. Add one in class settings when you’re ready."); cell.colSpan = 6; row.append(cell); table.append(row); }
  visible.forEach((student) => {
    const progress = engagement(student), result = state.results.find((r) => String(r.student_id) === String(student.id)), quiz = result && state.quizzes.find((q) => String(q.id) === String(result.quiz_id)), row = el("tr"), name = el("td"), person = el("div", undefined, "student-row-name"); person.append(el("span", initials(student.name), "role-avatar"), el("b", student.name)); name.append(person); row.append(name);
    [student.attendance, student.assessment, student.participation].forEach((value) => row.append(el("td", `${value}%`)));
    const badgeCell = el("td"); badgeCell.append(el("span", `${progress.state} · ${progress.score}%`, `badge ${progress.state.toLowerCase()}`)); row.append(badgeCell, el("td", result ? `${quiz?.title || "Quiz"} · ${result.score}%` : "No quiz yet")); table.append(row);
  });
  $("high-count").textContent = state.students.filter((s) => engagement(s).state === "High").length;
  $("moderate-count").textContent = state.students.filter((s) => engagement(s).state === "Moderate").length;
  $("low-count").textContent = state.students.filter((s) => engagement(s).state === "Low").length;
  const results = $("my-results"); results.hidden = state.role !== "student";
}
function renderRecommendations() {
  const list = $("recommendation-list"); list.replaceChildren();
  const records = state.role === "teacher" ? state.students : state.students.filter((s) => String(s.id) === String(currentStudent()?.id));
  if (!records.length) { list.append(el("div", "When learner progress is available, thoughtful next steps will appear here.", "empty-state")); return; }
  records.forEach((student) => {
    const { state: level, score } = engagement(student), card = el("article", undefined, "recommendation-card");
    const advice = level === "High" ? "Celebrate this steady progress and offer an interesting new challenge." : level === "Moderate" ? "Share a quick word of encouragement and notice which activity feels engaging." : "A friendly one-to-one check-in can help identify the support that feels useful.";
    card.append(el("span", `${level} · ${score}% snapshot`, `badge ${level.toLowerCase()}`), el("h3", student.name), el("p", `Attendance ${student.attendance}% · assessment ${student.assessment}% · participation ${student.participation}%`), el("p", advice)); list.append(card);
  });
}
function renderAdmin() {
  const table = $("admin-student-table"); if (!table) return; table.replaceChildren();
  if (!state.students.length) { const row = el("tr"), cell = el("td", "Your class roster is ready for its first learner."); cell.colSpan = 3; row.append(cell); table.append(row); }
  state.students.forEach((student) => { const row = el("tr"), person = el("td", undefined, "student-row-name"); person.append(el("span", initials(student.name), "role-avatar"), el("b", student.name)); const progress = el("td", `${engagement(student).state} · ${engagement(student).score}%`, `badge ${engagement(student).state.toLowerCase()}`); const actions = el("td"), edit = el("button", "Edit", "mini-button"), remove = el("button", "Remove", "mini-button"); edit.addEventListener("click", () => editStudent(student)); remove.addEventListener("click", () => deleteStudent(student.id)); actions.append(edit, remove); row.append(person, progress, actions); table.append(row); });
  $("admin-summary").textContent = `${state.students.length} learners · ${state.resources.length} resources · ${state.assignments.length} activities · ${state.results.length} quiz results`;
  renderAccountLinks();
}
function renderAccountLinks() {
  const panel = $("account-link-panel"), container = $("account-link-list"); if (!panel || !container) return;
  panel.hidden = !(state.profile?.role === "teacher"); container.replaceChildren();
  if (panel.hidden) return;
  const accounts = state.profiles.filter((profile) => profile.role === "student");
  state.students.forEach((student) => {
    const row = el("div", undefined, "account-link-row"), who = el("span", student.name), select = document.createElement("select"), save = el("button", "Link account", "mini-button");
    const none = el("option", "No account linked"); none.value = ""; select.append(none);
    accounts.forEach((profile) => { const option = el("option", `${profile.display_name} · ${profile.email}`); option.value = profile.id; option.selected = profile.id === student.auth_user_id; select.append(option); });
    save.addEventListener("click", async () => { try { await ClassroomAPI.linkStudentAccount(student.id, select.value || null); await refreshData(); toast("Student sign-in linked."); } catch (error) { showError(error, "Could not link account"); } });
    row.append(who, select, save); container.append(row);
  });
  if (!state.students.length) container.append(el("p", "Add a learner to your roster before linking their account.", "empty-state"));
  if (state.students.length && !accounts.length) container.append(el("p", "Student accounts will appear here after students sign up.", "empty-state"));
}
function renderAll() { renderDashboard(); renderResources(); renderAssignments(); renderQuizzes(); renderStudents($("student-search")?.value || ""); renderRecommendations(); renderAdmin(); renderAttendance(); renderAnnouncements(); renderSubmissionReviews(); renderTeacherStudio(); $("assignment-nav-count").hidden = !state.assignments.length; }

function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function renderAttendance(){const dateInput=$("attendance-date");if(!dateInput)return;const date=dateInput.value||todayISO();if(!dateInput.value)dateInput.value=date;const table=$("attendance-table");table.replaceChildren();const records=state.role==="teacher"?state.students:state.students.filter((s)=>String(s.id)===String(currentStudent()?.id)),selected=state.attendance.filter((a)=>a.class_date===date);if(!records.length){const row=el("tr"),cell=el("td","Learner profiles will appear here once the teacher adds and links the class.");cell.colSpan=3;row.append(cell);table.append(row);}records.forEach((student)=>{const entry=selected.find((a)=>String(a.student_id)===String(student.id)),row=el("tr");row.append(el("td",student.name));const statusCell=el("td");if(state.role==="teacher"){const select=document.createElement("select");select.dataset.attendanceStudent=student.id;["present","absent","late","excused"].forEach((status)=>{const option=el("option",status[0].toUpperCase()+status.slice(1));option.value=status;option.selected=entry?.status===status;select.append(option);});statusCell.append(select);}else statusCell.append(el("span",entry?entry.status[0].toUpperCase()+entry.status.slice(1):"Not marked","status-pill"));const noteCell=el("td");if(state.role==="teacher"){const input=document.createElement("input");input.dataset.attendanceNote=student.id;input.maxLength=500;input.placeholder="Optional note";input.value=entry?.note||"";noteCell.append(input);}else noteCell.textContent=entry?.note||"—";row.append(statusCell,noteCell);table.append(row);});$("attendance-summary").textContent=state.role==="teacher"?`${selected.filter((x)=>x.status==="present").length} present · ${selected.length} marked · ${records.length} learners`:"Your class check-in history is visible here.";const history=$("attendance-history-table");history.replaceChildren();const rows=state.attendance.filter((a)=>state.role==="teacher"||String(a.student_id)===String(currentStudent()?.id)).slice(0,50);if(!rows.length){const row=el("tr"),cell=el("td","Attendance check-ins will show here.");cell.colSpan=4;row.append(cell);history.append(row);}rows.forEach((entry)=>{const student=state.students.find((s)=>String(s.id)===String(entry.student_id)),row=el("tr");row.append(el("td",entry.class_date),el("td",student?.name||"Learner"),el("td",entry.status),el("td",entry.note||"—"));history.append(row);});}
function renderAnnouncements(){const list=$("announcement-list"),dash=$("dashboard-announcements");if(!list||!dash)return;list.replaceChildren();dash.replaceChildren();const now=Date.now(),visible=state.announcements.filter((a)=>state.role==="teacher"||new Date(a.published_at||0).getTime()<=now).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0));if(!visible.length){list.append(el("div","Your class board is ready for its first note.","empty-state"));dash.append(el("p","No class notes yet. This space is ready for a helpful update.","empty-state"));return;}visible.forEach((item)=>{const card=el("article",undefined,"surface announcement-card"),date=new Date(item.published_at||Date.now());card.append(el("div",item.published_at&&date>now?"SCHEDULED":"CLASS NOTE","eyebrow"),el("h2",item.title),el("p",item.body),el("small",`${date.toLocaleString()}${item.reminder_at?` · Reminder ${new Date(item.reminder_at).toLocaleString()}`:""}`));if(state.role==="teacher"){const remove=el("button","Remove","mini-button");remove.addEventListener("click",async()=>{try{await ClassroomAPI.deleteAnnouncement(item.id);await refreshData();toast("Announcement removed.");}catch(error){showError(error,"Could not remove announcement");}});card.append(remove);}list.append(card);});const first=visible.find((a)=>new Date(a.published_at||0)<=now)||visible[0];dash.append(el("b",first.title),el("p",first.body),el("small",first.reminder_at&&new Date(first.reminder_at)>now?`Reminder scheduled for ${new Date(first.reminder_at).toLocaleString()}`:new Date(first.published_at||Date.now()).toLocaleDateString()));}
async function saveAttendance(){const date=$("attendance-date").value,rows=[...document.querySelectorAll("[data-attendance-student]")].map((select)=>({student_id:Number(select.dataset.attendanceStudent),class_date:date,status:select.value,note:document.querySelector(`[data-attendance-note="${select.dataset.attendanceStudent}"]`)?.value.trim()||null}));try{await ClassroomAPI.saveAttendance(rows);state.attendance=await ClassroomAPI.getAttendanceHistory();renderAttendance();toast("Attendance saved for the class.");}catch(error){showError(error,"Could not save attendance");}}
async function addAnnouncement(event){event.preventDefault();const publish=$("announcement-publish-at").value,reminder=$("announcement-reminder-at").value,value={title:$("announcement-headline").value.trim(),body:$("announcement-body").value.trim(),published_at:publish?new Date(publish).toISOString():new Date().toISOString(),reminder_at:reminder?new Date(reminder).toISOString():null};try{await ClassroomAPI.addAnnouncement(value);event.target.reset();closeModal($("announcement-modal"));await refreshData();toast("Class board updated.");}catch(error){showError(error,"Could not post announcement");}}
function savedAccounts(){try{return JSON.parse(localStorage.getItem("funno-known-accounts")||"[]");}catch{return[];}}
function rememberAccount(profile){if(!profile?.email)return;const accounts=savedAccounts().filter((a)=>a.email.toLowerCase()!==profile.email.toLowerCase());accounts.unshift({email:profile.email,display_name:profile.display_name,role:profile.role});localStorage.setItem("funno-known-accounts",JSON.stringify(accounts.slice(0,8)));}
function renderAccountPicker(){const select=$("switch-account-picker");if(!select)return;select.replaceChildren(el("option","Choose an account"));savedAccounts().forEach((account)=>{const option=el("option",`${account.display_name||account.email} · ${account.role||"account"}`);option.value=account.email;select.append(option);});}
async function switchAccount(event){event.preventDefault();const email=$("switch-account-email").value.trim(),password=$("switch-account-password").value;$("switch-account-message").textContent="Signing in…";try{await ClassroomAPI.signIn(email,password);await refreshData();if(!state.profile)throw new Error("The account profile could not be loaded.");$("switch-account-password").value="";$("switch-account-message").textContent="";closeModal($("switch-account-modal"));toast(`Signed in as ${state.profile.display_name||email}.`);}catch(error){$("switch-account-message").textContent=error.message;}}

function renderClassrooms() {
  const list = $("classroom-list"), picker = $("class-picker"); if (!list || !picker) return;
  list.replaceChildren(); picker.replaceChildren();
  state.classrooms.forEach((room) => {
    const option = el("option", room.name); option.value = room.id; option.selected = String(room.id) === String(state.activeClassroomId); picker.append(option);
    const card = el("article", undefined, "classroom-item"), institution = room.institutions?.name || "Learning space", level = room.education_level === "university" ? room.course : room.grade;
    card.append(el("h3", room.name), el("p", `${institution} · ${level || room.education_level}`));
    if (state.role === "teacher" && room.join_code) { card.append(el("span", room.join_code, "class-code")); const copy = el("button", "Copy student code", "mini-button"); copy.type = "button"; copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(room.join_code); toast("Class code copied."); } catch { toast(`Share this class code: ${room.join_code}`); } }); card.append(document.createElement("br"), copy); }
    list.append(card);
  });
  if (!state.classrooms.length) list.append(el("p", state.role === "teacher" ? "Create your first school class or university course." : "Join with the code your teacher shared.", "empty-state"));
  $("class-picker-wrap").hidden = state.role !== "teacher" || state.classrooms.length < 2;
  const active = state.classrooms.find((room) => String(room.id) === String(state.activeClassroomId));
  if ($("studio-class-name")) { $("studio-class-name").textContent = active?.name || "Create your first class or course"; $("studio-class-detail").textContent = active ? `${active.institutions?.name || "Learning space"} · ${active.course || active.grade || active.education_level}. New materials will be shared with this class only.` : "Set up a class in School & courses, then return here to publish learning materials."; }
  if ($("assignment-target-class")) $("assignment-target-class").textContent = active?.name || "your selected class";
}
function renderChatStudentOptions() {
  const select = $("chat-student-select"), wrap = $("chat-student-wrap"); if (!select || !wrap) return;
  select.replaceChildren(); state.students.forEach((student) => { const option = el("option", student.name); option.value = student.id; select.append(option); });
  wrap.hidden = state.role !== "teacher";
  if (state.role === "student") $("chat-title").textContent = state.profile?.display_name ? `A conversation with your teacher` : "A conversation with your teacher";
}
function renderTeacherStudio() {
  const list = $("studio-recent-list"); if (!list) return; list.replaceChildren();
  const items = [
    ...state.assignments.map((item) => ({ ...item, kind: item.activity_type || "assignment", date: item.created_at })),
    ...state.quizzes.map((item) => ({ ...item, kind: "quiz", date: item.created_at })),
    ...state.resources.map((item) => ({ ...item, kind: item.type || "lesson", date: item.created_at }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8);
  if (!items.length) { list.append(el("p", "Your class studio is ready. Create the first activity, quiz or lesson above.", "empty-state")); return; }
  items.forEach((item) => { const row = el("div", undefined, "studio-recent-item"); row.append(el("span", item.kind.replaceAll("_", " "), "studio-kind"), el("b", item.title), el("small", item.date ? new Date(item.date).toLocaleDateString() : "Just created")); list.append(row); });
}
function chatTargetId() { return state.role === "teacher" ? Number($("chat-student-select").value) || null : currentStudent()?.id || null; }
async function loadChat() {
  const thread = $("chat-thread"); if (!thread || !state.profile) return;
  const studentId = chatTargetId(); thread.replaceChildren();
  if (!studentId) { thread.append(el("p", state.role === "teacher" ? "Add a learner or choose one of your students to start a private conversation." : "Join your class to send a private message to your teacher.", "empty-state")); return; }
  try {
    state.messages = await ClassroomAPI.getMessages(studentId);
    if (!state.messages.length) thread.append(el("p", "No messages yet. Your teacher is ready to help whenever you need it.", "empty-state"));
    state.messages.forEach((message) => { const bubble = el("article", undefined, `chat-message${message.sender_id === state.profile.id ? " mine" : ""}`), target = state.students.find((student) => String(student.id) === String(studentId)); bubble.append(document.createTextNode(message.body), el("small", `${message.sender_id === state.profile.id ? "You" : state.role === "teacher" ? target?.name || "Learner" : "Teacher"} · ${new Date(message.created_at).toLocaleString()}`)); thread.append(bubble); });
    thread.scrollTop = thread.scrollHeight;
  } catch (error) { thread.append(el("p", `Could not load messages: ${error.message}`, "empty-state")); }
}
async function sendChatMessage(event) {
  event.preventDefault(); const body = $("chat-message").value.trim(), studentId = chatTargetId();
  if (!studentId || !body) return;
  try { await ClassroomAPI.sendMessage(studentId, body); $("chat-message").value = ""; await loadChat(); }
  catch (error) { showError(error, "Message not sent"); }
}
const wordPools = {
  science: ["PLANET", "ORBIT", "ATOM", "ENERGY", "NATURE"],
  maths: ["FRACTION", "VECTOR", "NUMBER", "PATTERN", "ANGLE"],
  languages: ["POETRY", "STORY", "LETTER", "RHYTHM", "AUTHOR"],
  general: ["CURIOUS", "GARDEN", "PUZZLE", "FRIENDS", "BRIGHT"]
};
function currentWordPool() { const text = `${currentStudent()?.course || ""} ${currentStudent()?.grade || ""}`.toLowerCase(); return /bio|science|chem|phys|nature/.test(text) ? wordPools.science : /math|number|stat|comput|engineer/.test(text) ? wordPools.maths : /language|english|literature|history|humanit/.test(text) ? wordPools.languages : wordPools.general; }
function newScramble() { const pool = currentWordPool(), answer = pool[Math.floor(Math.random() * pool.length)]; let letters = answer.split(""); for (let i = letters.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [letters[i], letters[j]] = [letters[j], letters[i]]; } if (letters.join("") === answer) letters.reverse(); state.scrambleAnswer = answer; $("scramble-word").textContent = letters.join(" · "); $("scramble-answer").value = ""; $("scramble-message").textContent = ""; }
async function scoreFun(type, score) { const student = currentStudent(); if (!student) { toast("Join your class first to save your progress."); return; } try { await ClassroomAPI.saveFunResult({ student_id: student.id, activity_type: type, score }); state.funResults = await ClassroomAPI.getFunResults(); renderFunResults(); } catch (error) { showError(error, "Could not save activity"); } }
async function checkScramble() { if (!state.scrambleAnswer) newScramble(); const correct = $("scramble-answer").value.trim().toUpperCase() === state.scrambleAnswer; $("scramble-message").textContent = correct ? "You got it! A lovely bit of wordplay ✨" : "Not quite yet—have another go!"; if (correct) { await scoreFun("word-scramble", 100); newScramble(); } }
async function renderFunResults() { const list = $("fun-results-list"); if (!list) return; list.replaceChildren(); const rows = state.funResults.filter((item) => state.role === "teacher" || String(item.student_id) === String(currentStudent()?.id)); $("fun-streak").textContent = rows.length; if (!rows.length) list.append(el("p", "Your first word, pattern or curiosity activity will appear here.", "empty-state")); rows.slice(0, 8).forEach((item) => { const student = state.students.find((record) => String(record.id) === String(item.student_id)), name = state.role === "teacher" ? `${student?.name || "Learner"} · ` : ""; list.append(el("p", `${name}${item.activity_type.replaceAll("-", " ")} · ${item.score}% · ${new Date(item.created_at).toLocaleDateString()}`)); }); }
async function joinClassFromPortal(event) { event.preventDefault(); const note = $("student-join-message"); note.textContent = "Joining class…"; try { await ClassroomAPI.joinClass($("join-class-code").value.trim().toUpperCase(), $("join-student-name").value.trim()); await refreshData(); note.textContent = "You’re in! Your class activities are ready."; toast("Welcome to your class!"); } catch (error) { note.textContent = error.message; } }
async function createClassroomFromPortal(event) { event.preventDefault(); const note = $("classroom-message"); note.textContent = "Creating class space…"; try { const institutionName = $("institution-name").value.trim(), institutionType = $("institution-type").value, existing = await ClassroomAPI.getInstitutions(), institution = existing.find((item) => item.name.toLowerCase() === institutionName.toLowerCase() && item.institution_type === institutionType) || await ClassroomAPI.createInstitution({ name: institutionName, institution_type: institutionType }), room = await ClassroomAPI.createClassroom({ institution_id: institution.id, name: $("classroom-name").value.trim(), education_level: $("education-level").value, grade: $("education-level").value === "school" ? $("classroom-grade").value.trim() : null, course: $("education-level").value === "university" ? $("classroom-course").value.trim() : null }); localStorage.setItem(`funno-class-${state.profile.id}`, room.id); $("classroom-form").reset(); await refreshData(); note.textContent = `Class space created. Student code: ${room.join_code}`; toast("Your class is ready."); } catch (error) { note.textContent = error.message; } }

async function refreshData() {
  try {
    await ClassroomAPI.ready();
    state.profile = await ClassroomAPI.getMyProfile();
    if (!state.profile) { $("entry-gate").hidden = false; return; }
    if (readPendingOnboarding()) { await completePendingOnboarding(); state.profile = await ClassroomAPI.getMyProfile(); }
    if (state.profile.role === "teacher") state.classrooms = await ClassroomAPI.getClassrooms();
    else { state.student = await ClassroomAPI.getMyStudent(); state.classrooms = await ClassroomAPI.getClassrooms(); }
    const savedClass = localStorage.getItem(`funno-class-${state.profile.id}`);
    state.activeClassroomId = state.profile.role === "student" ? Number(state.student?.classroom_id) || null : Number(savedClass) || Number(state.classrooms[0]?.id) || null;
    if (state.activeClassroomId && !state.classrooms.some((c) => String(c.id) === String(state.activeClassroomId))) state.activeClassroomId = Number(state.classrooms[0]?.id) || null;
    ClassroomAPI.setActiveClassroom(state.activeClassroomId);
    if (state.profile.role === "student" && state.student?.id) localStorage.setItem("bloom-student-id", state.student.id);
    const students = await ClassroomAPI.getStudents();
    window.FunnoStudentIds = students.map((s) => s.id);
    const [resources, assignments, submissions, quizzes, results, announcements, attendance, funResults] = await Promise.all([
      ClassroomAPI.getResources(), ClassroomAPI.getAssignments(), ClassroomAPI.getSubmissions(), ClassroomAPI.getQuizzes(), ClassroomAPI.getResults(), ClassroomAPI.getAnnouncements(), ClassroomAPI.getAttendanceHistory(), ClassroomAPI.getFunResults(),
    ]);
    state.students = students; state.resources = await Promise.all(resources.map(async (r) => ({ ...r, url: r.storage_path ? await ClassroomAPI.getFileUrl(r.storage_path).catch(() => null) : r.url }))); state.assignments = await Promise.all(assignments.map(async (a) => ({ ...a, attachment_url: a.attachment_path ? await ClassroomAPI.getFileUrl(a.attachment_path).catch(() => null) : null }))); state.submissions = submissions; state.quizzes = quizzes; state.results = results; state.announcements = announcements; state.attendance = attendance;
    state.funResults = funResults;
    state.profiles = state.profile?.role === "teacher" ? await ClassroomAPI.getProfiles() : [];
    if (state.profile?.email) rememberAccount(state.profile);
    state.role = state.profile.role;
    $("auth-status").textContent = `Signed in as ${state.profile.display_name} · ${state.profile.role}. Your class data is saving in Supabase.`;
    $("auth-status").className = ""; $("auth-message").textContent = ""; $("auth-signout").hidden = false;
    $("auth-form").hidden = true; $("entry-gate").hidden = true;
    if (state.profile.role === "student" && !state.student) setPage("students");
    if (state.profile.role === "teacher" && !state.classrooms.length) setPage("portal");
    renderChatStudentOptions();
    setRole(state.role);
  } catch (error) { showMessage(`Could not connect to Supabase: ${error.message}`, true); }
}
function renderStudentSelect() { /* Student mode uses the selected/local first learner record. */ }
async function addResource(event) {
  event.preventDefault(); const file = $("resource-file").files[0]; let path = null;
  try { let url = $("resource-url").value.trim() || null; const value = { title: $("resource-title").value.trim(), type: file ? "file" : $("resource-type").value, url, description: $("resource-description").value.trim() || null, storage_path: null, file_name: null, file_size_bytes: null }; if (file) { if (file.size > 10 * 1024 * 1024) throw new Error("Please choose a file smaller than 10 MB."); path = `resources/${state.activeClassroomId}/${crypto.randomUUID()}/${safeFileName(file.name)}`; const uploaded = await ClassroomAPI.uploadFile(file, path); value.storage_path = path; value.file_name = file.name; value.file_size_bytes = file.size; if (uploaded.url) url = value.url = uploaded.url; } await ClassroomAPI.addResource(value); event.target.reset(); closeModal($("resource-modal")); await refreshData(); toast("Resource saved to your class library."); } catch (error) { if (path) await ClassroomAPI.deleteFile(path).catch(() => {}); showError(error, "Could not save resource"); }
}
function safeFileName(name) { return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "upload"; }
async function removeResource(id) { try { const resource = state.resources.find((r) => String(r.id) === String(id)); await ClassroomAPI.deleteResource(id); if (resource?.storage_path) await ClassroomAPI.deleteFile(resource.storage_path); await refreshData(); toast("Resource removed."); } catch (error) { showError(error, "Could not remove resource"); } }
async function addAssignment(event) {
  event.preventDefault(); const file = $("assignment-file").files[0], path = file ? `resources/${state.activeClassroomId}/assignments/${crypto.randomUUID()}/${safeFileName(file.name)}` : null;
  const value = { title: $("assignment-title").value.trim(), activity_type: $("assignment-kind").value, description: $("assignment-description").value.trim() || null, due_date: $("assignment-due").value || null, max_points: Number($("assignment-points").value), attachment_path: path, file_name: file?.name || null, file_size_bytes: file?.size || null };
  try { if (!state.activeClassroomId) throw new Error("Create or select a class/course first."); if (file) { if (file.size > 10 * 1024 * 1024) throw new Error("Please choose a file smaller than 10 MB."); await ClassroomAPI.uploadFile(file, path); } await ClassroomAPI.addAssignment(value); event.target.reset(); closeModal($("assignment-modal")); await refreshData(); toast("Activity published to the selected class."); } catch (error) { if (path) await ClassroomAPI.deleteFile(path).catch(() => {}); showError(error, "Could not save activity"); }
}
async function completeAssignment(assignment) {
  const student = currentStudent(); if (!student) { toast("Ask your teacher to add your learner profile first."); return; }
  try { await ClassroomAPI.submitAssignment({ assignment_id: assignment.id, student_id: student.id, student_name: student.name, response: "Completed" }); await refreshData(); toast("Nice work — activity marked complete!"); } catch (error) { showError(error, "Could not record activity"); }
}
function openSubmission(assignment, submission) { if (!currentStudent()) { toast("Ask your teacher to link your learner account first."); return; } state.currentAssignment = assignment; $("submission-title").textContent = assignment.title; $("submission-instructions").textContent = assignment.description || "Share your work with your teacher."; $("submission-response").value = submission?.response || ""; $("submission-file").value = ""; $("submission-message").textContent = submission?.file_name ? `Current file: ${submission.file_name}` : ""; openModal("submission-modal"); }
async function saveSubmission(event) { event.preventDefault(); const student = currentStudent(), assignment = state.currentAssignment; if (!student || !assignment) return; const old = mySubmission(assignment), file = $("submission-file").files[0]; let path = old?.file_path || null;
  try { if (file) { if (file.size > 10 * 1024 * 1024) throw new Error("Please choose a file smaller than 10 MB."); path = `submissions/${student.id}/${assignment.id}/${crypto.randomUUID()}_${safeFileName(file.name)}`; await ClassroomAPI.uploadFile(file, path); }
    const value = { assignment_id: assignment.id, student_id: student.id, student_name: student.name, response: $("submission-response").value.trim(), file_path: path, file_name: file?.name || old?.file_name || null, submitted_at: new Date().toISOString(), status: "submitted" };
    if (old) await ClassroomAPI.updateSubmission(old.id, { response: value.response, file_path: value.file_path, file_name: value.file_name, submitted_at: value.submitted_at }); else await ClassroomAPI.submitAssignment(value);
    if (file && old?.file_path) await ClassroomAPI.deleteFile(old.file_path).catch(() => {}); closeModal($("submission-modal")); await refreshData(); toast("Your work is with your teacher now.");
  } catch (error) { if (file && path && path !== old?.file_path) await ClassroomAPI.deleteFile(path).catch(() => {}); showError(error, "Could not submit your work"); }
}
function renderSubmissionReviews() { const table = $("submission-review-table"); if (!table) return; table.replaceChildren(); if (!state.submissions.length) { const row = el("tr"), cell = el("td", "Learner work will appear here when students submit an activity."); cell.colSpan = 6; row.append(cell); table.append(row); return; }
  state.submissions.forEach((sub) => { const assignment = state.assignments.find((a) => String(a.id) === String(sub.assignment_id)), row = el("tr"); row.append(el("td", assignment?.title || "Activity"), el("td", sub.student_name || "Learner")); const work = el("td", sub.response || "No written response"); if (sub.file_path) { const file = el("button", sub.file_name || "Open attachment", "mini-button"); file.addEventListener("click", async () => { try { const link = await ClassroomAPI.getFileUrl(sub.file_path); window.open(link, "_blank", "noopener"); } catch (error) { showError(error, "Could not open attachment"); } }); work.append(document.createElement("br"), file); } row.append(work); const gradeCell = el("td"), grade = document.createElement("input"); grade.type = "number"; grade.min = "0"; grade.max = String(assignment?.max_points || 100); grade.step = "0.01"; grade.placeholder = `/${assignment?.max_points || 100}`; grade.value = sub.grade ?? ""; gradeCell.append(grade); const feedbackCell = el("td"), feedback = document.createElement("textarea"); feedback.maxLength = 1000; feedback.rows = 2; feedback.value = sub.teacher_feedback || ""; feedbackCell.append(feedback); const actions = el("td"), save = el("button", "Save grade", "mini-button"); save.addEventListener("click", async () => { const max = Number(assignment?.max_points || 100); if (!grade.value.trim()) { toast("Enter a score before saving feedback."); return; } const n = Number(grade.value); if (!Number.isFinite(n) || n < 0 || n > max) { toast(`Enter a score from 0 to ${max}.`); return; } try { await ClassroomAPI.updateSubmission(sub.id, { grade: n, teacher_feedback: feedback.value.trim() || null, status: "graded", graded_at: new Date().toISOString() }); await refreshData(); toast("Feedback saved for the learner."); } catch (error) { showError(error, "Could not save grade"); } }); actions.append(save); row.append(gradeCell, feedbackCell, actions); table.append(row); });
}
function addQuestionCard(index) {
  const card = el("div", undefined, "question-card"); card.dataset.question = "true"; card.append(el("div", `QUESTION ${index + 1}`, "question-index"));
  const question = el("label", "Question"), questionInput = el("input"); questionInput.required = true; questionInput.maxLength = 240; questionInput.placeholder = "What would you like to ask?"; question.append(questionInput); card.append(question);
  const options = el("div", undefined, "question-options"); [0,1,2,3].forEach((optionIndex) => { const label = el("label", `Choice ${optionIndex + 1}`), input = el("input"); input.required = true; input.maxLength = 120; input.placeholder = "Answer choice"; input.dataset.option = optionIndex; label.append(input); options.append(label); });
  const correctLabel = el("label", "Correct choice"), correct = document.createElement("select"); correct.dataset.correct = "true"; ["Choice 1","Choice 2","Choice 3","Choice 4"].forEach((name, choiceIndex) => { const option = el("option", name); option.value = String(choiceIndex); correct.append(option); }); correctLabel.append(correct); card.append(options, correctLabel); $("question-builder").append(card);
}
async function createQuiz(event) {
  event.preventDefault(); const questions = [...document.querySelectorAll(".question-card")].map((card) => ({ prompt: card.querySelector("label input").value.trim(), options: [...card.querySelectorAll("[data-option]")].map((input) => input.value.trim()), answer: Number(card.querySelector("[data-correct]").value) }));
  if (!questions.length) { toast("Add at least one question first."); return; }
  try { await ClassroomAPI.addQuiz({ title: $("quiz-title").value.trim(), questions }); event.target.reset(); $("question-builder").replaceChildren(); addQuestionCard(0); closeModal($("quiz-modal")); await refreshData(); toast("Your quick quiz is ready for the class."); } catch (error) { showError(error, "Could not save quiz"); }
}
function startQuiz(quiz) {
  if (state.role === "teacher") { toast("Switch to student view to try this quiz."); return; }
  state.currentQuiz = quiz; $("play-title").textContent = quiz.title; $("quiz-message").textContent = ""; $("play-questions").replaceChildren();
  (quiz.questions || []).forEach((question, index) => { const block = el("div", undefined, "play-question"); block.append(el("h3", `${index + 1}. ${question.prompt}`)); const options = el("div", undefined, "play-options"); question.options.forEach((option, optionIndex) => { const label = el("label", undefined, "play-option"), input = document.createElement("input"); input.type = "radio"; input.name = `q-${index}`; input.value = String(optionIndex); input.required = true; label.append(input, document.createTextNode(option)); options.append(label); }); block.append(options); $("play-questions").append(block); }); openModal("play-modal");
}
async function submitQuiz() {
  const quiz = state.currentQuiz, questions = quiz?.questions || [], values = questions.map((_, index) => document.querySelector(`input[name="q-${index}"]:checked`));
  if (values.some((item) => !item)) { $("quiz-message").textContent = "Pick one answer for each question when you’re ready."; return; }
  const student = currentStudent();
  if (!student) { $("quiz-message").textContent = "Ask your teacher to add your learner profile first."; return; }
  try { const result = await ClassroomAPI.submitQuiz({ quiz_id: quiz.id, answers: values.map((item) => Number(item.value)), student_id: student.id, student_name: student.name }); closeModal($("play-modal")); await refreshData(); toast(`You got ${result.correct} of ${result.total} — ${result.score}%. Lovely effort!`); } catch (error) { showError(error, "Could not save your result"); }
}
async function addStudent(event) {
  event.preventDefault(); const student = { name: $("student-name").value.trim(), attendance: Number($("attendance").value), assessment: Number($("assessment").value), participation: Number($("participation").value) };
  try { await ClassroomAPI.addStudent(student); event.target.reset(); $("attendance").value = 90; $("assessment").value = 75; $("participation").value = 80; await refreshData(); toast("Learner added to your class."); } catch (error) { showError(error, "Could not add learner"); }
}
async function editStudent(student) {
  const name = prompt("Learner name", student.name); if (name === null) return; const attendance = prompt("Attendance percentage", student.attendance); if (attendance === null) return; const assessment = prompt("Assessment percentage", student.assessment); if (assessment === null) return; const participation = prompt("Participation percentage", student.participation); if (participation === null) return;
  const values = [attendance, assessment, participation].map(Number); if (!name.trim() || values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) { toast("Please use a name and percentages between 0 and 100."); return; }
  try { await ClassroomAPI.updateStudent(student.id, { name: name.trim(), attendance: values[0], assessment: values[1], participation: values[2] }); await refreshData(); toast("Learner record updated."); } catch (error) { showError(error, "Could not update learner"); }
}
async function deleteStudent(id) { if (!confirm("Remove this learner from your class?")) return; try { await ClassroomAPI.deleteStudent(id); await refreshData(); toast("Learner removed."); } catch (error) { showError(error, "Could not remove learner"); } }
async function feedbackSummary() {
  try { const summary = await ClassroomAPI.getFeedbackSummary(); $("feedback-summary").textContent = `${summary.count} ${summary.count === 1 ? "thought shared" : "thoughts shared"} · average ${summary.average_rating ?? "—"}/5`; } catch (error) { $("feedback-summary").textContent = `Could not load feedback: ${error.message}`; }
}
async function submitFeedback(event) {
  event.preventDefault(); try { await ClassroomAPI.submitFeedback(Number($("rating").value), $("feedback-text").value.trim()); $("feedback-message").textContent = "Thanks for helping Funno grow."; event.target.reset(); await feedbackSummary(); } catch (error) { $("feedback-message").textContent = `Could not share feedback: ${error.message}`; }
}
function setEntryMode(mode) {
  state.entryMode = mode;
  $("entry-signin-tab").classList.toggle("active", mode === "signin"); $("entry-signup-tab").classList.toggle("active", mode === "signup");
  $("entry-signup-fields").hidden = mode !== "signup"; $("entry-submit").textContent = mode === "signup" ? "Create my account →" : "Sign in →";
  $("entry-name").required = mode === "signup";
  updateEntryRole();
}
function updateEntryRole() {
  const role = $("entry-role").value, signingIn = state.entryMode === "signin";
  $("signup-next-step").textContent = role === "teacher"
    ? signingIn ? "Teacher sign-in opens your teaching dashboard, classes and student results." : "Teacher accounts open the teacher portal to create classes and courses."
    : signingIn ? "Student sign-in opens your class activities and personal results." : "Student accounts join a class after sign-up using a teacher’s code.";
}
function updateClassroomFields() {
  const level = $("education-level").value, university = level === "university";
  $("grade-field").hidden = level !== "school"; $("course-field").hidden = !university;
  $("classroom-grade").required = level === "school"; $("classroom-course").required = university;
}
function readPendingOnboarding() { try { return JSON.parse(localStorage.getItem("funno-pending-onboarding") || "null"); } catch { return null; } }
async function completePendingOnboarding() {
  const pending = readPendingOnboarding(); if (!pending) return;
  const profile = await ClassroomAPI.getMyProfile();
  if (!profile || profile.email.toLowerCase() !== String(pending.email || "").toLowerCase()) return;
  if (pending.role === "teacher" && profile.role !== "teacher") await ClassroomAPI.requestTeacherRole();
  localStorage.removeItem("funno-pending-onboarding");
}
async function authenticateEntry(event) {
  event.preventDefault(); const message = $("entry-message"), email = $("entry-email").value.trim(), password = $("entry-password").value;
  message.textContent = "Connecting securely…"; $("entry-auth-form").setAttribute("aria-busy", "true");
  try {
    const selectedRole = $("entry-role").value;
    if (state.entryMode === "signup") {
      const name = $("entry-name").value.trim(), pending = { role: selectedRole, email: email.toLowerCase() };
      localStorage.setItem("funno-pending-onboarding", JSON.stringify(pending));
      const result = await ClassroomAPI.signUp(email, password, name);
      if (!result.access_token) { message.textContent = `Account created as ${selectedRole}. Confirm your email, then choose ${selectedRole} here to sign in.`; return; }
      await completePendingOnboarding();
    } else {
      await ClassroomAPI.signIn(email, password);
      await completePendingOnboarding();
    }
    const profile = await ClassroomAPI.getMyProfile();
    if (!profile) throw new Error("We couldn’t load your account profile. Check the Supabase migration and try again.");
    if (profile.role !== selectedRole) {
      await ClassroomAPI.signOut();
      throw new Error(`This email belongs to a ${profile.role} account. Choose ${profile.role} above and sign in again.`);
    }
    $("entry-password").value = ""; await refreshData();
    if (!state.profile) throw new Error("We couldn’t load your account profile. Check the Supabase migration and try again.");
    toast(state.profile.role === "teacher" ? (state.classrooms.length ? "Your teacher studio is ready." : "Start by creating a class or course.") : state.student ? "Welcome to your class." : "Join a class using the code from your teacher.");
  } catch (error) {
    let session = null; try { session = JSON.parse(localStorage.getItem("funno-auth-session") || "null"); } catch { session = null; }
    if (session?.access_token) {
      await refreshData();
      if (state.profile?.role === "student" && !state.student) $("student-join-message").textContent = error.message;
      else if (state.profile?.role === "teacher") { $("classroom-message").textContent = `${error.message} You can finish the setup below.`; setPage("portal"); }
      else message.textContent = error.message;
    } else message.textContent = error.message;
  }
  finally { $("entry-auth-form").removeAttribute("aria-busy"); }
}
async function signOut() {
  try { await ClassroomAPI.signOut(); state.profile = null; state.student = null; state.classrooms = []; state.profiles = []; state.role = "student"; $("entry-gate").hidden = false; setEntryMode("signin"); await refreshData(); $("entry-email").focus(); toast("You’re signed out of Funno."); }
  catch (error) { showError(error, "Could not sign out"); }
}
function bindUI() {
  document.querySelectorAll(".nav-btn").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.go)));
  document.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.open)));
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(backdrop); }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal-backdrop.open").forEach(closeModal); });
  $("role-switch").addEventListener("click", () => { const next = state.role === "teacher" ? "student" : "teacher"; setRole(next); toast(next === "student" ? "Student view is ready. Choose a learner from the class list in teacher view." : "You’re back in teacher view."); });
  $("save-attendance").addEventListener("click", saveAttendance); $("attendance-date").addEventListener("change", renderAttendance);
  $("submission-form").addEventListener("submit", saveSubmission); $("announcement-form").addEventListener("submit", addAnnouncement);
  $("switch-account").addEventListener("click", () => { renderAccountPicker(); openModal("switch-account-modal"); });
  $("switch-account-picker").addEventListener("change", (event) => { if (event.target.value) $("switch-account-email").value = event.target.value; });
  $("switch-account-form").addEventListener("submit", switchAccount);
  $("entry-auth-form").addEventListener("submit", authenticateEntry);
  $("entry-signin-tab").addEventListener("click", () => setEntryMode("signin")); $("entry-signup-tab").addEventListener("click", () => setEntryMode("signup"));
  $("entry-role").addEventListener("change", updateEntryRole);
  $("education-level").addEventListener("change", updateClassroomFields);
  $("classroom-form").addEventListener("submit", createClassroomFromPortal); $("student-join-form").addEventListener("submit", joinClassFromPortal);
  $("class-picker").addEventListener("change", async (event) => { state.activeClassroomId = Number(event.target.value) || null; localStorage.setItem(`funno-class-${state.profile.id}`, state.activeClassroomId); ClassroomAPI.setActiveClassroom(state.activeClassroomId); await refreshData(); });
  $("chat-form").addEventListener("submit", sendChatMessage); $("refresh-chat").addEventListener("click", loadChat); $("chat-student-select").addEventListener("change", loadChat);
  $("check-scramble").addEventListener("click", checkScramble);
  document.querySelectorAll(".pattern-answer").forEach((button) => button.addEventListener("click", async () => { const correct = button.dataset.answer === "15"; $("pattern-message").textContent = correct ? "That’s it! You spotted the +3 pattern ✨" : "Try adding the same number each time."; if (correct) await scoreFun("number-pattern", 100); }));
  $("curiosity-done").addEventListener("click", async () => { $("curiosity-message").textContent = "Wonderful noticing. Tell your teacher what you found!"; await scoreFun("curiosity-break", 100); });
  $("clear-saved-accounts").addEventListener("click", () => { localStorage.removeItem("funno-known-accounts"); renderAccountPicker(); toast("Saved email list cleared."); });
  $("resource-search").addEventListener("input", renderResources); $("student-search").addEventListener("input", (event) => renderStudents(event.target.value));
  $("resource-filters").addEventListener("click", (event) => { const button = event.target.closest("[data-filter]"); if (!button) return; state.resourceFilter = button.dataset.filter; $("resource-filters").querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip === button)); renderResources(); });
  $("assignment-filters").addEventListener("click", (event) => { const button = event.target.closest("[data-filter]"); if (!button) return; state.assignmentFilter = button.dataset.filter; $("assignment-filters").querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip === button)); renderAssignments(); });
  $("resource-form").addEventListener("submit", addResource); $("assignment-form").addEventListener("submit", addAssignment); $("quiz-form").addEventListener("submit", createQuiz); $("add-student-form").addEventListener("submit", addStudent); $("feedback-form").addEventListener("submit", submitFeedback); $("submit-quiz").addEventListener("click", submitQuiz);
  $("auth-signout").addEventListener("click", signOut);
  $("add-question").addEventListener("click", () => addQuestionCard(document.querySelectorAll(".question-card").length));
  document.querySelectorAll("[data-filter]").forEach((button) => { if (button.classList.contains("chip")) button.type = "button"; });
}

const now = new Date(); $("today-date").textContent = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
bindUI(); addQuestionCard(0); setEntryMode("signin"); updateClassroomFields(); setRole("student"); refreshData();
setInterval(() => { if (state.profile && $("help-chat").classList.contains("active")) loadChat(); }, 15000);
