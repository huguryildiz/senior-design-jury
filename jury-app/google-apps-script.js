// ============================================================
// EE 492 Poster Presentation Evaluation – Google Apps Script
// Paste this code into Google Apps Script and deploy as Web App.
// ============================================================

const SHEET_NAME = "Evaluations";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet with headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Juror Name", "Department / Institution", "Timestamp",
        "Group No", "Group Name",
        "Design (20)", "Technical (40)", "Delivery (30)", "Teamwork (10)",
        "Total (100)", "Comments"
      ]);
      sheet.getRange(1, 1, 1, 11)
        .setFontWeight("bold")
        .setBackground("#1d4ed8")
        .setFontColor("white");
      sheet.setFrozenRows(1);
    }

    // Append one row per project
    data.rows.forEach(row => {
      sheet.appendRow([
        row.juryName,
        row.juryDept,
        row.timestamp,
        row.projectId,
        row.projectName,
        row.design,
        row.technical,
        row.delivery,
        row.teamwork,
        row.total,
        row.comments
      ]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
