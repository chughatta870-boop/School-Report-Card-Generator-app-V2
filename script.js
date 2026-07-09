/* ==========================================================================
   GHS 124/NB Report Card Generator
   Vanilla JS PWA — no build step, no frameworks.
   ========================================================================== */

(function () {
  "use strict";

  var WATERMARK_TEXT = "MIJAZ GHS124NB";
  var PASS_PERCENT = 33;
  var STORAGE_KEY = "ghs124_saved_cards";
  var DRAFT_KEY = "ghs124_draft_v1";

  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  var CLASSES = [
    { key: "kachi", label: "Kachi (Prep)" },
    { key: "1", label: "Class 1" },
    { key: "2", label: "Class 2" },
    { key: "3", label: "Class 3" },
    { key: "4", label: "Class 4" },
    { key: "5", label: "Class 5" },
    { key: "6", label: "Class 6" },
    { key: "7", label: "Class 7" },
    { key: "8", label: "Class 8" }
  ];

  var CLASS_SUBJECTS = {
    kachi: [["Urdu",50],["English",50],["Mathematics",50],["Islamiyat / Akhlaqiyat",50],["General Knowledge",50]],
    "1":   [["Urdu",50],["English",50],["Mathematics",50],["Islamiyat / Akhlaqiyat",50],["General Knowledge",50]],
    "2":   [["Urdu",50],["English",50],["Mathematics",50],["Islamiyat / Akhlaqiyat",50],["General Knowledge",50]],
    "3":   [["Urdu",100],["English",100],["Mathematics",100],["Science",100],["Islamiyat",50],["Social Studies",100]],
    "4":   [["Urdu",100],["English",100],["Mathematics",100],["Science",100],["Islamiyat",50],["Social Studies",100]],
    "5":   [["Urdu",100],["English",100],["Mathematics",100],["Science",100],["Islamiyat",50],["Social Studies",100]],
    "6":   [["Urdu",100],["English",100],["Mathematics",100],["Science",100],["Islamiyat",50],["Pakistan Studies",50],["Computer Science",50]],
    "7":   [["Urdu",100],["English",100],["Mathematics",100],["Science",100],["Islamiyat",50],["Pakistan Studies",50],["Computer Science",50]],
    "8":   [["Urdu",100],["English",100],["Mathematics",100],["Science",100],["Islamiyat",50],["Pakistan Studies",50],["Computer Science",50]]
  };

  var GRADE_SCALE = [
    { min: 90, grade: "A+" },
    { min: 80, grade: "A" },
    { min: 70, grade: "B" },
    { min: 60, grade: "C" },
    { min: 50, grade: "D" },
    { min: PASS_PERCENT, grade: "E" },
    { min: 0, grade: "F" }
  ];

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    schoolName: $("schoolName"), schoolMeta: $("schoolMeta"),
    studentName: $("studentName"), fatherName: $("fatherName"),
    classSelect: $("classSelect"), section: $("section"),
    rollNo: $("rollNo"), grNo: $("grNo"),
    issueDate: $("issueDate"), issueMonth: $("issueMonth"), issueYear: $("issueYear"),
    subjectsBody: $("subjectsBody"),
    addSubjectBtn: $("addSubjectBtn"),
    generateBtn: $("generateBtn"), resetBtn: $("resetBtn"),
    saveCardBtn: $("saveCardBtn"), downloadBtn: $("downloadBtn"),
    shareBtn: $("shareBtn"), printBtn: $("printBtn"),
    reportCard: $("reportCard"), watermarkLayer: $("watermarkLayer"),
    rcSchoolName: $("rcSchoolName"), rcSchoolMeta: $("rcSchoolMeta"),
    rcStudentName: $("rcStudentName"), rcFatherName: $("rcFatherName"),
    rcClass: $("rcClass"), rcSection: $("rcSection"),
    rcRollNo: $("rcRollNo"), rcDate: $("rcDate"),
    rcTableBody: $("rcTableBody"),
    rcSumT1Total: $("rcSumT1Total"), rcSumT1Obt: $("rcSumT1Obt"),
    rcSumT2Total: $("rcSumT2Total"), rcSumT2Obt: $("rcSumT2Obt"),
    rcSumT3Total: $("rcSumT3Total"), rcSumT3Obt: $("rcSumT3Obt"),
    rcSumGrand: $("rcSumGrand"), rcSumObtained: $("rcSumObtained"), rcSumPct: $("rcSumPct"), rcSumResult: $("rcSumResult"),
    rcTotalMarks: $("rcTotalMarks"), rcObtainedMarks: $("rcObtainedMarks"),
    rcPercentage: $("rcPercentage"), rcGrade: $("rcGrade"), rcOverallResult: $("rcOverallResult"),
    savedBtn: $("savedBtn"), savedDrawer: $("savedDrawer"), drawerBackdrop: $("drawerBackdrop"),
    closeDrawerBtn: $("closeDrawerBtn"), savedList: $("savedList"),
    toast: $("toast")
  };

  var subjectRows = [];   // [{id, name, total, t1, t2, t3}]
  var rowSeq = 0;

  /* ---------------------------- helpers ---------------------------- */

  function toast(msg, ms) {
    els.toast.textContent = msg;
    els.toast.setAttribute("data-show", "true");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      els.toast.setAttribute("data-show", "false");
    }, ms || 2400);
  }

  function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function gradeFor(pct) {
    for (var i = 0; i < GRADE_SCALE.length; i++) {
      if (pct >= GRADE_SCALE[i].min) return GRADE_SCALE[i].grade;
    }
    return "F";
  }

  /* ------------------------ populate selects ------------------------ */

  function populateSelects() {
    CLASSES.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.key; opt.textContent = c.label;
      els.classSelect.appendChild(opt);
    });
    MONTHS.forEach(function (m, i) {
      var opt = document.createElement("option");
      opt.value = String(i + 1); opt.textContent = m;
      els.issueMonth.appendChild(opt);
    });
    var today = new Date();
    els.issueDate.value = today.getDate();
    els.issueMonth.value = String(today.getMonth() + 1);
    els.issueYear.value = today.getFullYear();
  }

  /* ------------------------- subject rows ------------------------- */

  function loadClassDefaults(classKey, silent) {
    var list = CLASS_SUBJECTS[classKey] || CLASS_SUBJECTS["1"];
    subjectRows = list.map(function (pair) {
      return {
        id: "r" + (++rowSeq), name: pair[0],
        t1Total: pair[1], t1Obt: "",
        t2Total: pair[1], t2Obt: "",
        t3Total: pair[1], t3Obt: ""
      };
    });
    renderSubjectRows();
    if (!silent) updatePreview();
  }

  function renderSubjectRows() {
    els.subjectsBody.innerHTML = "";
    subjectRows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.dataset.id = row.id;
      tr.innerHTML =
        '<td><input type="text" class="f-name" value="' + esc(row.name) + '" placeholder="Subject name"></td>' +
        '<td><input type="number" class="f-t1total" min="0" value="' + esc(row.t1Total) + '"></td>' +
        '<td><input type="number" class="f-t1obt" min="0" value="' + esc(row.t1Obt) + '" placeholder="—"></td>' +
        '<td><input type="number" class="f-t2total" min="0" value="' + esc(row.t2Total) + '"></td>' +
        '<td><input type="number" class="f-t2obt" min="0" value="' + esc(row.t2Obt) + '" placeholder="—"></td>' +
        '<td><input type="number" class="f-t3total" min="0" value="' + esc(row.t3Total) + '"></td>' +
        '<td><input type="number" class="f-t3obt" min="0" value="' + esc(row.t3Obt) + '" placeholder="—"></td>' +
        '<td class="col-del"><button type="button" class="row-del-btn" aria-label="Remove subject">&times;</button></td>';
      els.subjectsBody.appendChild(tr);
    });
  }

  function syncRowsFromDOM() {
    var trs = els.subjectsBody.querySelectorAll("tr");
    var updated = [];
    trs.forEach(function (tr) {
      var id = tr.dataset.id;
      updated.push({
        id: id,
        name: tr.querySelector(".f-name").value.trim() || "Subject",
        t1Total: num(tr.querySelector(".f-t1total").value),
        t1Obt: tr.querySelector(".f-t1obt").value,
        t2Total: num(tr.querySelector(".f-t2total").value),
        t2Obt: tr.querySelector(".f-t2obt").value,
        t3Total: num(tr.querySelector(".f-t3total").value),
        t3Obt: tr.querySelector(".f-t3obt").value
      });
    });
    subjectRows = updated;
  }

  els.subjectsBody.addEventListener("input", function () {
    syncRowsFromDOM();
    updatePreview();
  });

  els.subjectsBody.addEventListener("click", function (e) {
    var btn = e.target.closest(".row-del-btn");
    if (!btn) return;
    var tr = btn.closest("tr");
    var id = tr.dataset.id;
    subjectRows = subjectRows.filter(function (r) { return r.id !== id; });
    renderSubjectRows();
    updatePreview();
  });

  els.addSubjectBtn.addEventListener("click", function () {
    subjectRows.push({
      id: "r" + (++rowSeq), name: "",
      t1Total: 100, t1Obt: "", t2Total: 100, t2Obt: "", t3Total: 100, t3Obt: ""
    });
    renderSubjectRows();
    els.subjectsBody.querySelector('tr:last-child .f-name').focus();
  });

  els.classSelect.addEventListener("change", function () {
    if (subjectRows.some(function (r) { return r.t1Obt || r.t2Obt || r.t3Obt; })) {
      if (!confirm("Load default subjects for this class? Any marks entered will be cleared.")) {
        return;
      }
    }
    loadClassDefaults(els.classSelect.value);
  });

  /* --------------------------- calculation --------------------------- */

  function computeRows() {
    return subjectRows.map(function (r) {
      var t1Total = num(r.t1Total), t2Total = num(r.t2Total), t3Total = num(r.t3Total);
      var t1Obt = r.t1Obt === "" || r.t1Obt == null ? null : num(r.t1Obt);
      var t2Obt = r.t2Obt === "" || r.t2Obt == null ? null : num(r.t2Obt);
      var t3Obt = r.t3Obt === "" || r.t3Obt == null ? null : num(r.t3Obt);

      var grandTotal = t1Total + t2Total + t3Total;
      var grandObtained = (t1Obt || 0) + (t2Obt || 0) + (t3Obt || 0);
      var anyEntered = t1Obt !== null || t2Obt !== null || t3Obt !== null;
      var pct = grandTotal > 0 ? (grandObtained / grandTotal) * 100 : 0;
      var result = anyEntered ? (pct >= PASS_PERCENT ? "Pass" : "Fail") : "—";

      return {
        name: r.name,
        t1Total: t1Total, t1Obt: t1Obt,
        t2Total: t2Total, t2Obt: t2Obt,
        t3Total: t3Total, t3Obt: t3Obt,
        grandTotal: grandTotal, grandObtained: grandObtained,
        pct: pct, result: result, anyEntered: anyEntered
      };
    });
  }

  function updatePreview() {
    els.rcSchoolName.textContent = els.schoolName.value.trim() || "Govt. High School 124/NB";
    els.rcSchoolMeta.textContent = els.schoolMeta.value.trim();
    els.rcStudentName.textContent = els.studentName.value.trim() || "—";
    els.rcFatherName.textContent = els.fatherName.value.trim() || "—";

    var classLabel = CLASSES.find(function (c) { return c.key === els.classSelect.value; });
    els.rcClass.textContent = (classLabel ? classLabel.label : "—") + (els.section.value.trim() ? "" : "");
    els.rcSection.textContent = els.section.value.trim() || "—";
    els.rcRollNo.textContent = els.rollNo.value.trim() || (els.grNo.value.trim() ? ("GR# " + els.grNo.value.trim()) : "—");

    var d = els.issueDate.value, m = els.issueMonth.value, y = els.issueYear.value;
    var monthName = m ? MONTHS[parseInt(m, 10) - 1] : "";
    els.rcDate.textContent = (d || monthName || y) ? ((d ? d + " " : "") + (monthName ? monthName + " " : "") + (y || "")) : "—";

    var rows = computeRows();
    els.rcTableBody.innerHTML = rows.map(function (r) {
      var resultClass = r.result === "Pass" ? "result-pass" : (r.result === "Fail" ? "result-fail" : "");
      return "<tr>" +
        '<td class="col-subject">' + esc(r.name) + "</td>" +
        "<td>" + r.t1Total + "</td>" +
        "<td>" + (r.t1Obt === null ? "—" : r.t1Obt) + "</td>" +
        "<td>" + r.t2Total + "</td>" +
        "<td>" + (r.t2Obt === null ? "—" : r.t2Obt) + "</td>" +
        "<td>" + r.t3Total + "</td>" +
        "<td>" + (r.t3Obt === null ? "—" : r.t3Obt) + "</td>" +
        "<td>" + r.grandTotal + "</td>" +
        "<td>" + r.grandObtained + "</td>" +
        "<td>" + r.pct.toFixed(1) + "%</td>" +
        '<td class="' + resultClass + '">' + r.result + "</td>" +
        "</tr>";
    }).join("");

    var sums = rows.reduce(function (acc, r) {
      acc.t1Total += r.t1Total; acc.t1Obt += (r.t1Obt || 0);
      acc.t2Total += r.t2Total; acc.t2Obt += (r.t2Obt || 0);
      acc.t3Total += r.t3Total; acc.t3Obt += (r.t3Obt || 0);
      acc.grand += r.grandTotal; acc.obtained += r.grandObtained;
      return acc;
    }, { t1Total: 0, t1Obt: 0, t2Total: 0, t2Obt: 0, t3Total: 0, t3Obt: 0, grand: 0, obtained: 0 });

    var overallPct = sums.grand > 0 ? (sums.obtained / sums.grand) * 100 : 0;
    var anyEnteredOverall = rows.some(function (r) { return r.anyEntered; });
    var anyFail = rows.some(function (r) { return r.result === "Fail"; });
    var overallResult = anyEnteredOverall ? ((overallPct >= PASS_PERCENT && !anyFail) ? "Pass" : "Fail") : "—";
    var grade = anyEnteredOverall ? gradeFor(overallPct) : "—";

    els.rcSumT1Total.textContent = sums.t1Total;
    els.rcSumT1Obt.textContent = sums.t1Obt;
    els.rcSumT2Total.textContent = sums.t2Total;
    els.rcSumT2Obt.textContent = sums.t2Obt;
    els.rcSumT3Total.textContent = sums.t3Total;
    els.rcSumT3Obt.textContent = sums.t3Obt;
    els.rcSumGrand.textContent = sums.grand;
    els.rcSumObtained.textContent = sums.obtained;
    els.rcSumPct.textContent = overallPct.toFixed(1) + "%";
    els.rcSumResult.textContent = overallResult;
    els.rcSumResult.className = overallResult === "Pass" ? "result-pass" : (overallResult === "Fail" ? "result-fail" : "");

    els.rcTotalMarks.textContent = sums.grand;
    els.rcObtainedMarks.textContent = sums.obtained;
    els.rcPercentage.textContent = overallPct.toFixed(1) + "%";
    els.rcGrade.textContent = grade;
    els.rcOverallResult.textContent = overallResult;
    els.rcOverallResult.style.color = overallResult === "Pass" ? "#0e6e4f" : (overallResult === "Fail" ? "#a3312a" : "");

    saveDraft();
  }

  /* --------------------------- watermark --------------------------- */

  function buildWatermark() {
    var layer = els.watermarkLayer;
    layer.innerHTML = "";
    var rect = els.reportCard.getBoundingClientRect();
    var w = Math.max(rect.width, 340);
    var h = Math.max(rect.height, 600);
    var colGap = 150, rowGap = 90;
    var cols = Math.ceil(w / colGap) + 2;
    var rows = Math.ceil(h / rowGap) + 2;
    var frag = document.createDocumentFragment();
    for (var row = 0; row < rows; row++) {
      var offsetX = (row % 2 === 0) ? 0 : colGap / 2;
      for (var col = 0; col < cols; col++) {
        var span = document.createElement("span");
        span.className = "watermark-tile";
        span.textContent = WATERMARK_TEXT;
        span.style.left = (col * colGap - colGap + offsetX) + "px";
        span.style.top = (row * rowGap - rowGap) + "px";
        frag.appendChild(span);
      }
    }
    layer.appendChild(frag);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildWatermark, 200);
  });

  /* ------------------------------ actions ------------------------------ */

  els.generateBtn.addEventListener("click", function () {
    syncRowsFromDOM();
    updatePreview();
    buildWatermark();
    els.reportCard.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Report card generated");
  });

  els.resetBtn.addEventListener("click", function () {
    if (!confirm("Start a new report card? Unsaved changes will be lost.")) return;
    els.studentName.value = ""; els.fatherName.value = "";
    els.section.value = ""; els.rollNo.value = ""; els.grNo.value = "";
    els.classSelect.value = "1";
    loadClassDefaults("1", true);
    updatePreview();
    buildWatermark();
    localStorage.removeItem(DRAFT_KEY);
    toast("Ready for a new report card");
  });

  els.printBtn.addEventListener("click", function () { window.print(); });

  function currentFileBaseName() {
    var name = (els.studentName.value.trim() || "student").replace(/[^\w\-]+/g, "_");
    var cls = els.classSelect.value;
    return "ReportCard_" + name + "_Class" + cls;
  }

  function renderToCanvas() {
    return html2canvas(els.reportCard, {
      scale: 2,
      backgroundColor: "#fbf9f4",
      useCORS: true
    });
  }

  els.downloadBtn.addEventListener("click", function () {
    if (typeof html2canvas === "undefined" || typeof window.jspdf === "undefined") {
      toast("Download needs an internet connection the first time.");
      return;
    }
    toast("Preparing PDF…", 4000);
    renderToCanvas().then(function (canvas) {
      var imgData = canvas.toDataURL("image/png");
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(currentFileBaseName() + ".pdf");
      toast("PDF downloaded");
    }).catch(function (err) {
      console.error(err);
      toast("Could not create PDF. Try again.");
    });
  });

  els.shareBtn.addEventListener("click", function () {
    if (typeof html2canvas === "undefined") {
      toast("Sharing needs an internet connection the first time.");
      return;
    }
    toast("Preparing to share…", 4000);
    renderToCanvas().then(function (canvas) {
      canvas.toBlob(function (blob) {
        if (!blob) { toast("Could not prepare image."); return; }
        var file = new File([blob], currentFileBaseName() + ".png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: "Report Card",
            text: els.studentName.value.trim() ? ("Report card — " + els.studentName.value.trim()) : "Report card"
          }).catch(function () {});
        } else {
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url; a.download = currentFileBaseName() + ".png";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
          toast("Sharing isn't supported here — image downloaded instead.");
        }
      }, "image/png");
    }).catch(function (err) {
      console.error(err);
      toast("Could not prepare image for sharing.");
    });
  });

  /* --------------------------- save / load --------------------------- */

  function gatherFormState() {
    syncRowsFromDOM();
    return {
      schoolName: els.schoolName.value, schoolMeta: els.schoolMeta.value,
      studentName: els.studentName.value, fatherName: els.fatherName.value,
      classKey: els.classSelect.value, section: els.section.value,
      rollNo: els.rollNo.value, grNo: els.grNo.value,
      issueDate: els.issueDate.value, issueMonth: els.issueMonth.value, issueYear: els.issueYear.value,
      subjects: subjectRows
    };
  }

  function applyFormState(state) {
    els.schoolName.value = state.schoolName || "Govt. High School 124/NB";
    els.schoolMeta.value = state.schoolMeta || "";
    els.studentName.value = state.studentName || "";
    els.fatherName.value = state.fatherName || "";
    els.classSelect.value = state.classKey || "1";
    els.section.value = state.section || "";
    els.rollNo.value = state.rollNo || "";
    els.grNo.value = state.grNo || "";
    els.issueDate.value = state.issueDate || "";
    els.issueMonth.value = state.issueMonth || "";
    els.issueYear.value = state.issueYear || "";
    subjectRows = (state.subjects || []).map(function (r) {
      return {
        id: "r" + (++rowSeq), name: r.name,
        t1Total: r.t1Total, t1Obt: r.t1Obt,
        t2Total: r.t2Total, t2Obt: r.t2Obt,
        t3Total: r.t3Total, t3Obt: r.t3Obt
      };
    });
    if (!subjectRows.length) loadClassDefaults(els.classSelect.value, true);
    else renderSubjectRows();
    updatePreview();
    buildWatermark();
  }

  function readSavedList() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) { return []; }
  }

  function writeSavedList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  els.saveCardBtn.addEventListener("click", function () {
    var state = gatherFormState();
    if (!state.studentName.trim()) {
      toast("Enter a student name before saving");
      return;
    }
    var list = readSavedList();
    var entry = {
      id: "c" + Date.now(),
      studentName: state.studentName.trim(),
      classKey: state.classKey,
      savedAt: new Date().toISOString(),
      state: state
    };
    list.unshift(entry);
    if (list.length > 200) list = list.slice(0, 200);
    writeSavedList(list);
    toast("Report card saved");
  });

  function classLabelFor(key) {
    var c = CLASSES.find(function (c) { return c.key === key; });
    return c ? c.label : key;
  }

  function renderSavedList() {
    var list = readSavedList();
    if (!list.length) {
      els.savedList.innerHTML = '<p class="saved-empty">No saved report cards yet.</p>';
      return;
    }
    els.savedList.innerHTML = list.map(function (entry) {
      var dt = new Date(entry.savedAt);
      var dtStr = dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return '<div class="saved-item" data-id="' + entry.id + '">' +
        '<div class="saved-item-name">' + esc(entry.studentName) + " — " + esc(classLabelFor(entry.classKey)) + "</div>" +
        '<div class="saved-item-meta">Saved ' + esc(dtStr) + "</div>" +
        '<div class="saved-item-actions">' +
        '<button class="btn btn-outline btn-small load-btn">Load</button>' +
        '<button class="btn btn-ghost btn-small del-btn">Delete</button>' +
        "</div></div>";
    }).join("");
  }

  els.savedList.addEventListener("click", function (e) {
    var item = e.target.closest(".saved-item");
    if (!item) return;
    var id = item.dataset.id;
    var list = readSavedList();
    var entry = list.find(function (x) { return x.id === id; });
    if (!entry) return;
    if (e.target.classList.contains("load-btn")) {
      applyFormState(entry.state);
      closeDrawer();
      toast("Loaded report card for " + entry.studentName);
    } else if (e.target.classList.contains("del-btn")) {
      if (!confirm("Delete this saved report card?")) return;
      writeSavedList(list.filter(function (x) { return x.id !== id; }));
      renderSavedList();
      toast("Deleted");
    }
  });

  function openDrawer() {
    renderSavedList();
    els.savedDrawer.setAttribute("data-open", "true");
    els.savedDrawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    els.savedDrawer.setAttribute("data-open", "false");
    els.savedDrawer.setAttribute("aria-hidden", "true");
  }
  els.savedBtn.addEventListener("click", openDrawer);
  els.closeDrawerBtn.addEventListener("click", closeDrawer);
  els.drawerBackdrop.addEventListener("click", closeDrawer);

  /* ------------------------------ draft ------------------------------ */

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(gatherFormState()));
    } catch (e) { /* ignore quota errors */ }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      var state = JSON.parse(raw);
      applyFormState(state);
      return true;
    } catch (e) { return false; }
  }

  /* -------------------------- form field wiring -------------------------- */

  [els.schoolName, els.schoolMeta, els.studentName, els.fatherName, els.section,
   els.rollNo, els.grNo, els.issueDate, els.issueMonth, els.issueYear].forEach(function (el) {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });

  /* --------------------------------- init --------------------------------- */

  function init() {
    populateSelects();
    els.classSelect.value = "1";
    if (!loadDraft()) {
      loadClassDefaults("1", true);
      updatePreview();
    }
    setTimeout(buildWatermark, 60);

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function (err) {
          console.warn("Service worker registration failed:", err);
        });
      });
    }
  }

  init();
})();
