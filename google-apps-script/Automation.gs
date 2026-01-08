/**
 * Automation Hub Functions
 * Handles automated workflows, email sequences, and task automation
 */

/**
 * Open Automation Hub
 */
function openAutomationHub() {
  const html = HtmlService.createHtmlOutputFromFile('AutomationHub')
    .setWidth(800)
    .setHeight(600)
    .setTitle('⚡ Automation Hub');

  SpreadsheetApp.getUi().showModalDialog(html, 'Automation Hub');
}

/**
 * Create automated email sequence
 */
function createEmailSequence(sequenceName, emails) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sequenceSheet = ss.getSheetByName('Email Sequences');

  if (!sequenceSheet) {
    sequenceSheet = ss.insertSheet('Email Sequences');
    const headers = ['Sequence Name', 'Day', 'Subject', 'Body', 'Active'];
    sequenceSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sequenceSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  emails.forEach((email, index) => {
    sequenceSheet.appendRow([
      sequenceName,
      email.day || (index + 1),
      email.subject,
      email.body,
      true
    ]);
  });

  logActivity('Email Sequence Created', `Created sequence: ${sequenceName}`);
}

/**
 * Send automated follow-up email
 */
function sendFollowUpEmail(contactEmail, contactName, templateName) {
  const emailEnabled = getSetting('Email Notifications');

  if (emailEnabled !== 'Yes') {
    Logger.log('Email notifications are disabled');
    return false;
  }

  const template = getEmailTemplate(templateName);

  if (!template) {
    Logger.log(`Template not found: ${templateName}`);
    return false;
  }

  // Replace placeholders
  let subject = template.subject.replace('{{NAME}}', contactName);
  let body = template.body
    .replace('{{NAME}}', contactName)
    .replace('{{COMPANY}}', getSetting('Company Name') || 'Our Company');

  try {
    MailApp.sendEmail({
      to: contactEmail,
      subject: subject,
      body: body
    });

    logActivity('Follow-up Email Sent', `To: ${contactEmail}, Template: ${templateName}`);
    return true;
  } catch (error) {
    Logger.log('Error sending follow-up email: ' + error.message);
    return false;
  }
}

/**
 * Get email template
 */
function getEmailTemplate(templateName) {
  const templates = {
    'Initial Seller Contact': {
      subject: 'Thank you for your inquiry, {{NAME}}',
      body: 'Hi {{NAME}},\n\nThank you for reaching out to {{COMPANY}}. We received your information and would love to discuss your property.\n\nWhen would be a good time for a quick call?\n\nBest regards,\n{{COMPANY}} Team'
    },
    'Seller Follow-up Day 3': {
      subject: 'Following up on your property',
      body: 'Hi {{NAME}},\n\nI wanted to follow up on our previous conversation about your property. Have you had a chance to think about our offer?\n\nI\'d be happy to answer any questions you might have.\n\nBest regards,\n{{COMPANY}} Team'
    },
    'Buyer New Deal Alert': {
      subject: 'New Investment Opportunity - {{PROPERTY_ADDRESS}}',
      body: 'Hi {{NAME}},\n\nWe have a new property that matches your criteria:\n\nAddress: {{PROPERTY_ADDRESS}}\nPrice: {{PRICE}}\nARV: {{ARV}}\nProfit Potential: {{PROFIT}}\n\nInterested? Let\'s talk!\n\nBest regards,\n{{COMPANY}} Team'
    }
  };

  return templates[templateName] || null;
}

/**
 * Create automated task when deal stage changes
 */
function createAutomatedTask(dealId, newStage) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let tasksSheet = ss.getSheetByName('Automated Tasks');

  if (!tasksSheet) {
    tasksSheet = ss.insertSheet('Automated Tasks');
    const headers = ['Task ID', 'Deal ID', 'Task', 'Due Date', 'Assigned To', 'Status', 'Created Date'];
    tasksSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    tasksSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  const tasks = getTasksForStage(newStage);

  tasks.forEach(task => {
    const taskId = 'TASK-' + generateId();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + task.daysUntilDue);

    tasksSheet.appendRow([
      taskId,
      dealId,
      task.description,
      dueDate,
      task.assignedTo || 'Unassigned',
      'Pending',
      new Date()
    ]);
  });

  logActivity('Automated Tasks Created', `For deal: ${dealId}, Stage: ${newStage}`);
}

/**
 * Get tasks for specific deal stage
 */
function getTasksForStage(stage) {
  const taskTemplates = {
    'Under Contract': [
      { description: 'Send contract to seller', daysUntilDue: 1, assignedTo: 'Acquisition Manager' },
      { description: 'Order title search', daysUntilDue: 2, assignedTo: 'Admin' },
      { description: 'Schedule property inspection', daysUntilDue: 3, assignedTo: 'Acquisition Manager' }
    ],
    'Marketed': [
      { description: 'Create property marketing flyer', daysUntilDue: 1, assignedTo: 'Marketing' },
      { description: 'Send to buyers list', daysUntilDue: 1, assignedTo: 'Disposition Manager' },
      { description: 'Post to Facebook groups', daysUntilDue: 1, assignedTo: 'Marketing' },
      { description: 'Schedule property showings', daysUntilDue: 2, assignedTo: 'Disposition Manager' }
    ],
    'Assigned': [
      { description: 'Send assignment contract to buyer', daysUntilDue: 1, assignedTo: 'Disposition Manager' },
      { description: 'Collect earnest money from buyer', daysUntilDue: 2, assignedTo: 'Finance' },
      { description: 'Coordinate with title company', daysUntilDue: 3, assignedTo: 'Admin' }
    ],
    'Closing': [
      { description: 'Confirm closing date with all parties', daysUntilDue: 1, assignedTo: 'Admin' },
      { description: 'Review HUD/settlement statement', daysUntilDue: 1, assignedTo: 'Finance' },
      { description: 'Prepare final documents', daysUntilDue: 2, assignedTo: 'Admin' }
    ]
  };

  return taskTemplates[stage] || [];
}

/**
 * Send daily task reminders
 */
function sendDailyTaskReminders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tasksSheet = ss.getSheetByName('Automated Tasks');

  if (!tasksSheet) return;

  const data = tasksSheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const teamSheet = ss.getSheetByName('Team Members');
  const teamData = teamSheet ? teamSheet.getDataRange().getValues() : [];

  // Group tasks by assignee
  const tasksByAssignee = {};

  for (let i = 1; i < data.length; i++) {
    const dueDate = new Date(data[i][3]);
    dueDate.setHours(0, 0, 0, 0);
    const status = data[i][5];
    const assignedTo = data[i][4];

    // Check if task is due today or overdue
    if (status === 'Pending' && dueDate <= today) {
      if (!tasksByAssignee[assignedTo]) {
        tasksByAssignee[assignedTo] = [];
      }

      tasksByAssignee[assignedTo].push({
        task: data[i][2],
        dealId: data[i][1],
        dueDate: data[i][3]
      });
    }
  }

  // Send reminder emails
  for (let assignee in tasksByAssignee) {
    const email = getTeamMemberEmail(assignee, teamData);

    if (email) {
      sendTaskReminderEmail(email, assignee, tasksByAssignee[assignee]);
    }
  }

  logActivity('Daily Task Reminders Sent', `Sent to ${Object.keys(tasksByAssignee).length} team members`);
}

/**
 * Get team member email
 */
function getTeamMemberEmail(name, teamData) {
  for (let i = 1; i < teamData.length; i++) {
    if (teamData[i][1] === name) {
      return teamData[i][3]; // Email column
    }
  }
  return null;
}

/**
 * Send task reminder email
 */
function sendTaskReminderEmail(email, name, tasks) {
  let body = `Hi ${name},\n\nYou have ${tasks.length} task(s) due today or overdue:\n\n`;

  tasks.forEach((task, index) => {
    body += `${index + 1}. ${task.task} (Deal: ${task.dealId}) - Due: ${formatDate(task.dueDate)}\n`;
  });

  body += '\nPlease update the status in the Automated Tasks sheet when complete.\n\nBest regards,\nQuantum RE Analyzer';

  try {
    MailApp.sendEmail({
      to: email,
      subject: `Task Reminder: ${tasks.length} task(s) due`,
      body: body
    });
  } catch (error) {
    Logger.log('Error sending task reminder: ' + error.message);
  }
}

/**
 * Auto-assign deals to team members
 */
function autoAssignDeal(dealType) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teamSheet = ss.getSheetByName('Team Members');

  if (!teamSheet) return null;

  const teamData = teamSheet.getDataRange().getValues();

  // Find appropriate team member based on deal type
  const roleMapping = {
    'Wholesaling': 'Disposition Manager',
    'Sub2': 'Acquisition Manager',
    'Fix & Flip': 'Acquisition Manager',
    'Buy & Hold': 'Acquisition Manager'
  };

  const targetRole = roleMapping[dealType] || 'Admin';

  for (let i = 1; i < teamData.length; i++) {
    if (teamData[i][2] === targetRole && teamData[i][6] === true) { // Role and Active
      return teamData[i][1]; // Return name
    }
  }

  return null;
}

/**
 * Setup time-based triggers
 */
function setupAutomationTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendDailyTaskReminders') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create daily trigger for task reminders (9 AM)
  ScriptApp.newTrigger('sendDailyTaskReminders')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  SpreadsheetApp.getUi().alert('Automation Triggers Setup',
    'Daily task reminders will be sent at 9 AM.',
    SpreadsheetApp.getUi().ButtonSet.OK);

  logActivity('Automation Triggers Setup', 'Daily task reminders configured');
}

/**
 * Disable automation triggers
 */
function disableAutomationTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  SpreadsheetApp.getUi().alert('Automation Disabled',
    'All automation triggers have been disabled.',
    SpreadsheetApp.getUi().ButtonSet.OK);

  logActivity('Automation Triggers Disabled', 'All triggers removed');
}
