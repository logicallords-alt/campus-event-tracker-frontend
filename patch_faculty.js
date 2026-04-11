const fs = require('fs');
const filePath = './frontend/src/pages/FacultyDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the Phone row and insert Duration after it
const phoneRow = `                                   <span className="text-muted">Phone</span>    <span>{event.student_id?.phone}</span>`;
const durationRow = `
                                   <span className="text-muted">Duration</span> <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{event.num_days || 1} day{(event.num_days || 1) > 1 ? 's' : ''}</span>`;

if (content.includes(phoneRow + durationRow)) {
  console.log('Duration row already added. Skipping.');
  process.exit(0);
}

if (!content.includes(phoneRow)) {
  // Try to find any variant
  const idx = content.indexOf('event.student_id?.phone');
  if (idx === -1) {
    console.error('Cannot locate the Phone row in file!');
    process.exit(1);
  }
  // Get exact line
  const lineStart = content.lastIndexOf('\n', idx) + 1;
  const lineEnd = content.indexOf('\n', idx);
  const exactLine = content.substring(lineStart, lineEnd);
  console.log('Exact line found:', JSON.stringify(exactLine));
  
  content = content.substring(0, lineEnd) + durationRow + content.substring(lineEnd);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patch applied using fallback method!');
  process.exit(0);
}

content = content.replace(phoneRow, phoneRow + durationRow);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch applied successfully!');
