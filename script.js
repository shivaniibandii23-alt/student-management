const STORAGE_KEY = "studentHubRecords";

const studentForm = document.getElementById("studentForm");
const studentTableBody = document.getElementById("studentTableBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const courseFilter = document.getElementById("courseFilter");
const formMessage = document.getElementById("formMessage");
const toast = document.getElementById("toast");

let students = loadStudents();
let toastTimer;

function loadStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Could not read saved student records:", error);
    return [];
  }
}

function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    return true;
  } catch (error) {
    showToast("Could not save data in this browser.");
    return false;
  }
}

function makeId() {
  return "student-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function setFormMessage(message = "", type = "") {
  formMessage.textContent = message;
  formMessage.className = "form-message" + (type ? " " + type : "");
}

function getFormValues() {
  const marksValue = document.getElementById("studentMarks").value.trim();
  return {
    studentId: document.getElementById("studentId").value.trim(),
    name: document.getElementById("studentName").value.trim(),
    email: document.getElementById("studentEmail").value.trim(),
    phone: document.getElementById("studentPhone").value.trim(),
    course: document.getElementById("studentCourse").value,
    year: document.getElementById("studentYear").value,
    gender: document.getElementById("studentGender").value,
    marks: marksValue === "" ? null : Number(marksValue)
  };
}

function validateStudent(student, editingId) {
  if (!student.studentId || !student.name || !student.course || !student.year) {
    return "Please fill in all required fields.";
  }
  const duplicate = students.some(item =>
    item.studentId.toLowerCase() === student.studentId.toLowerCase() &&
    item.id !== editingId
  );
  if (duplicate) return "This Student ID already exists. Please use a unique ID.";
  if (student.marks !== null && (!Number.isFinite(student.marks) || student.marks < 0 || student.marks > 100)) {
    return "Marks must be a number between 0 and 100.";
  }
  return "";
}

studentForm.addEventListener("submit", event => {
  event.preventDefault();

  const editingId = document.getElementById("editingId").value;
  const student = getFormValues();
  const error = validateStudent(student, editingId);

  if (error) {
    setFormMessage(error, "error");
    return;
  }

  if (editingId) {
    const index = students.findIndex(item => item.id === editingId);
    if (index === -1) {
      setFormMessage("Could not find this student record. Please try again.", "error");
      return;
    }
    students[index] = { ...students[index], ...student, updatedAt: new Date().toISOString() };
    if (!saveStudents()) return;
    resetForm();
    renderStudents();
    showToast("Student details updated successfully.");
  } else {
    students.unshift({ id: makeId(), ...student, createdAt: new Date().toISOString() });
    if (!saveStudents()) {
      students.shift();
      return;
    }
    resetForm();
    renderStudents();
    showToast("Student added successfully.");
  }
});

function resetForm() {
  studentForm.reset();
  document.getElementById("editingId").value = "";
  document.getElementById("formTitle").textContent = "Add New Student";
  document.getElementById("saveStudentBtn").textContent = "Save Student";
  document.getElementById("cancelEditBtn").classList.add("hidden");
  setFormMessage();
}

document.getElementById("resetFormBtn").addEventListener("click", () => {
  // Let the browser reset the form first, then return to add mode.
  setTimeout(resetForm, 0);
});

document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

document.getElementById("addStudentTopBtn").addEventListener("click", () => {
  document.getElementById("studentFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("studentId").focus({ preventScroll: true });
});

function startEdit(id) {
  const student = students.find(item => item.id === id);
  if (!student) return;

  document.getElementById("editingId").value = student.id;
  document.getElementById("studentId").value = student.studentId;
  document.getElementById("studentName").value = student.name;
  document.getElementById("studentEmail").value = student.email;
  document.getElementById("studentPhone").value = student.phone;
  document.getElementById("studentCourse").value = student.course;
  document.getElementById("studentYear").value = student.year;
  document.getElementById("studentGender").value = student.gender;
  document.getElementById("studentMarks").value = student.marks ?? "";
  document.getElementById("formTitle").textContent = "Edit Student";
  document.getElementById("saveStudentBtn").textContent = "Update Student";
  document.getElementById("cancelEditBtn").classList.remove("hidden");
  setFormMessage("Editing " + student.name + ".", "success");
  document.getElementById("studentFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteStudent(id) {
  const student = students.find(item => item.id === id);
  if (!student) return;
  if (!confirm(`Delete the record for ${student.name} (${student.studentId})?`)) return;

  const previous = students;
  students = students.filter(item => item.id !== id);
  if (!saveStudents()) {
    students = previous;
    return;
  }
  if (document.getElementById("editingId").value === id) resetForm();
  renderStudents();
  showToast("Student record deleted.");
}

function getFilteredStudents() {
  const search = searchInput.value.trim().toLowerCase();
  const course = courseFilter.value;
  return students.filter(student => {
    const matchesSearch = [
      student.studentId, student.name, student.email, student.phone,
      student.course, student.year, student.gender
    ].some(value => String(value ?? "").toLowerCase().includes(search));
    return matchesSearch && (!course || student.course === course);
  });
}

function renderCourseFilter() {
  const currentValue = courseFilter.value;
  const courses = [...new Set(students.map(student => student.course).filter(Boolean))].sort();
  courseFilter.innerHTML = '<option value="">All courses</option>' +
    courses.map(course => `<option value="${escapeHTML(course)}">${escapeHTML(course)}</option>`).join("");
  if (courses.includes(currentValue)) courseFilter.value = currentValue;
}

function renderStats() {
  document.getElementById("totalStudents").textContent = students.length;
  document.getElementById("totalCourses").textContent = new Set(students.map(student => student.course)).size;
  const marks = students.filter(student => typeof student.marks === "number" && Number.isFinite(student.marks))
    .map(student => student.marks);
  document.getElementById("averageMarks").textContent = marks.length
    ? (marks.reduce((sum, mark) => sum + mark, 0) / marks.length).toFixed(1) + "%"
    : "—";
}

function renderStudents() {
  renderCourseFilter();
  renderStats();
  const filtered = getFilteredStudents();

  studentTableBody.innerHTML = filtered.map(student => {
    const initials = student.name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
    const contact = student.email
      ? `<div>${escapeHTML(student.email)}</div><div class="subtext">${escapeHTML(student.phone || "No phone")}</div>`
      : `<div>${escapeHTML(student.phone || "No contact details")}</div>`;
    return `
      <tr>
        <td>
          <div class="student-cell">
            <div class="avatar">${escapeHTML(initials || "?")}</div>
            <div>
              <div class="student-name">${escapeHTML(student.name)}</div>
              <div class="student-email">${escapeHTML(student.gender || "Gender not specified")}</div>
            </div>
          </div>
        </td>
        <td><span class="id-pill">${escapeHTML(student.studentId)}</span></td>
        <td><div class="course-name">${escapeHTML(student.course)}</div><div class="subtext">${escapeHTML(student.year)}</div></td>
        <td>${contact}</td>
        <td>${student.marks === null || student.marks === undefined ? '<span class="subtext">Not entered</span>' : `<span class="marks-pill">${escapeHTML(student.marks)}%</span>`}</td>
        <td>
          <div class="action-group">
            <button class="icon-btn" type="button" data-action="edit" data-id="${escapeHTML(student.id)}" aria-label="Edit ${escapeHTML(student.name)}" title="Edit">✎</button>
            <button class="icon-btn delete" type="button" data-action="delete" data-id="${escapeHTML(student.id)}" aria-label="Delete ${escapeHTML(student.name)}" title="Delete">×</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  emptyState.classList.toggle("hidden", filtered.length > 0);
  document.getElementById("recordCount").textContent =
    `Showing ${filtered.length} of ${students.length} student${students.length === 1 ? "" : "s"}`;
}

studentTableBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "edit") startEdit(id);
  if (button.dataset.action === "delete") deleteStudent(id);
});

searchInput.addEventListener("input", renderStudents);
courseFilter.addEventListener("change", renderStudents);

document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (!students.length) {
    showToast("There are no records to clear.");
    return;
  }
  if (!confirm("Delete ALL student records? This action cannot be undone.")) return;

  const previous = students;
  students = [];
  if (!saveStudents()) {
    students = previous;
    return;
  }
  resetForm();
  renderStudents();
  showToast("All student records have been cleared.");
});

// Add a few sample records the first time so learners can explore the table.
// Remove this block if you prefer the project to start with an empty list.
if (students.length === 0 && !localStorage.getItem(STORAGE_KEY)) {
  students = [
    { id: makeId(), studentId: "STU101", name: "Ananya Reddy", email: "ananya@example.com", phone: "9876543210", course: "B.Tech CSE", year: "3rd Year", gender: "Female", marks: 88, createdAt: new Date().toISOString() },
    { id: makeId(), studentId: "STU102", name: "Rahul Kumar", email: "rahul@example.com", phone: "9123456780", course: "BCA", year: "2nd Year", gender: "Male", marks: 76, createdAt: new Date().toISOString() },
    { id: makeId(), studentId: "STU103", name: "Priya Sharma", email: "priya@example.com", phone: "9988776655", course: "B.Tech ECE", year: "4th Year", gender: "Female", marks: 92, createdAt: new Date().toISOString() }
  ];
  saveStudents();
}

renderStudents();
