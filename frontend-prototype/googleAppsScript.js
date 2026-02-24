/**
 * GOOGLE APPS SCRIPT FOR VALLEY VERDE FORM BACKEND
 * 
 * Instructions:
 * 1. Open your Google Sheet linked to the Survey Form.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Set up a Trigger: Edit > Current Project's Triggers > Add Trigger.
 *    - Function: onFormSubmit
 *    - Event Type: On form submit
 */

function onFormSubmit(e) {
  // 1. Ingest Data
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = e.range; 
  var row = range.getRow();
  
  // Assuming column structure matches the PDF order roughly
  // Adjust indexes based on actual columns in your sheet (0-based for arrays, 1-based for sheets)
  var responses = e.values; // Array of string values
  
  // Map columns (Example indices - UPDATE THESE TO MATCH YOUR SHEET)
  var emailIdx = 1; 
  var foodInsecurityIdx = 3;
  var otherBarriersIdx = 6;
  var otherResourcesIdx = 8;
  var crisisIdx = 12; // "Immediate Crisis" checkbox column
  
  var email = responses[emailIdx];
  var otherBarrierText = responses[otherBarriersIdx];
  var crisisStatus = responses[crisisIdx];

  // 2. Auto-Verification Flagging
  if (email && email.includes("@")) {
    // Assuming 'Verified' is the last column, e.g., Column Z
    var lastCol = sheet.getLastColumn();
    // Check if the last column is "Verified", if not, create header
    if (sheet.getRange(1, lastCol).getValue() !== "System_Verified") {
       sheet.getRange(1, lastCol + 1).setValue("System_Verified");
       sheet.getRange(1, lastCol + 2).setValue("Auto_Tags");
    }
    
    // Set Verified to TRUE in the row
    var verifyCol = getHeaderCol(sheet, "System_Verified");
    sheet.getRange(row, verifyCol).setValue("TRUE");
  }

  // 3. Regex Categorization for "Other"
  var tags = [];
  if (otherBarrierText) {
    var text = otherBarrierText.toLowerCase();
    
    if (text.match(/gluten|celiac|wheat|dairy|allergy/)) tags.push("Dietary");
    if (text.match(/staff|rude|language|english/)) tags.push("Service_Quality");
    if (text.match(/time|bus|walk|car/)) tags.push("Transport");
    if (text.match(/organic|fresh|rotten/)) tags.push("Food_Quality");
    
    // Write tags to sheet
    if (tags.length > 0) {
      var tagCol = getHeaderCol(sheet, "Auto_Tags");
      sheet.getRange(row, tagCol).setValue(tags.join(", "));
    }
  }

  // 5. Crisis Alert Email
  // If the respondent indicated strict crisis or Food Insecurity is 10/10
  if ((crisisStatus && crisisStatus.toString().toLowerCase().includes("crisis")) || responses[foodInsecurityIdx] == "10") {
    sendCrisisAlert(email || "Anonymous", responses[foodInsecurityIdx]);
  }
}

function sendCrisisAlert(userEmail, level) {
  var recipient = "admin@valleyverde.org"; // CHANGE THIS
  var subject = "URGENT: Community Food Crisis Alert";
  var body = "A respondent has indicated immediate food crisis.\n\n" +
             "Respondent: " + userEmail + "\n" +
             "Insecurity Level: " + level + "/10\n\n" +
             "Please check the dashboard for details.";
             
  MailApp.sendEmail(recipient, subject, body);
}

// Helper to find column by header name
function getHeaderCol(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === name) return i + 1;
  }
  return sheet.getLastColumn() + 1;
}
