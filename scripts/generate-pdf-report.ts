import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

interface TestCase {
  name: string;
  classname: string;
  time: number;
  status: 'passed' | 'failed' | 'skipped';
  failureMessage?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  suites: Record<string, TestCase[]>;
}

function parseJunitXml(filePath: string): TestSummary {
  const summary: TestSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    suites: {},
  };

  if (!fs.existsSync(filePath)) {
    return summary;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const testcaseRegex = /<testcase\s+([^>]+)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let match;

  while ((match = testcaseRegex.exec(content)) !== null) {
    const attrsStr = match[1];
    const bodyStr = match[2] || '';

    const nameMatch = attrsStr.match(/name="([^"]+)"/);
    const classMatch = attrsStr.match(/classname="([^"]+)"/);
    const timeMatch = attrsStr.match(/time="([^"]+)"/);

    const name = nameMatch ? nameMatch[1] : 'Unknown Test';
    const classname = classMatch ? classMatch[1] : 'General';
    const time = timeMatch ? parseFloat(timeMatch[1]) : 0;

    let status: 'passed' | 'failed' | 'skipped' = 'passed';
    let failureMessage: string | undefined;

    if (bodyStr.includes('<failure') || bodyStr.includes('<error')) {
      status = 'failed';
      const msgMatch = bodyStr.match(/message="([^"]+)"/);
      failureMessage = msgMatch ? msgMatch[1] : 'Assertion failed';
    } else if (bodyStr.includes('<skipped')) {
      status = 'skipped';
    }

    summary.total++;
    summary.duration += time;
    if (status === 'passed') summary.passed++;
    else if (status === 'failed') summary.failed++;
    else summary.skipped++;

    if (!summary.suites[classname]) {
      summary.suites[classname] = [];
    }
    summary.suites[classname].push({ name, classname, time, status, failureMessage });
  }

  return summary;
}

function buildHtmlReport(summary: TestSummary): string {
  const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '100';
  const now = new Date().toLocaleString();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Backend Automation Test Execution Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 40px; }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
    .title h1 { margin: 0 0 6px 0; font-size: 24px; color: #0f172a; }
    .title p { margin: 0; font-size: 13px; color: #64748b; }
    .badge { background: #3b82f6; color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 12px; text-transform: uppercase; }
    
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 30px 0; }
    .kpi { padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
    .kpi .num { font-size: 32px; font-weight: 700; margin-bottom: 4px; }
    .kpi .label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .kpi.total .num { color: #2563eb; }
    .kpi.passed .num { color: #16a34a; }
    .kpi.failed .num { color: #dc2626; }
    .kpi.rate .num { color: #0891b2; }

    .suite-card { margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .suite-header { background: #f8fafc; padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 16px; text-align: left; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    th { background: #fafafa; color: #64748b; font-weight: 500; font-size: 12px; }
    
    .status-pill { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-passed { background: #dcfce7; color: #15803d; }
    .status-failed { background: #fee2e2; color: #b91c1c; }
    .status-skipped { background: #fef3c7; color: #b45309; }

    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">
        <h1>Backend Test Automation Report</h1>
        <p>Framework: Playwright • Vitest • RabbitMQ • Axios | Executed: ${now}</p>
      </div>
      <div class="badge">Production Ready</div>
    </div>

    <div class="kpis">
      <div class="kpi total">
        <div class="num">${summary.total}</div>
        <div class="label">Total Tests</div>
      </div>
      <div class="kpi passed">
        <div class="num">${summary.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="kpi failed">
        <div class="num">${summary.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="kpi rate">
        <div class="num">${passRate}%</div>
        <div class="label">Pass Rate</div>
      </div>
    </div>

    <h2>Test Execution Breakdown</h2>
    ${Object.entries(summary.suites)
      .map(
        ([suite, tests]) => `
      <div class="suite-card">
        <div class="suite-header">Suite: ${suite} (${tests.length} tests)</div>
        <table>
          <thead>
            <tr><th>Test Description</th><th>Duration</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${tests
              .map(
                (t) => `
              <tr>
                <td>${t.name}</td>
                <td>${t.time.toFixed(3)}s</td>
                <td><span class="status-pill status-${t.status}">${t.status.toUpperCase()}</span></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      )
      .join('')}

    <div class="footer">
      Generated automatically by Backend Automation Framework &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
  `;
}

async function main() {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const junitFile = path.resolve(reportsDir, 'junit-report.xml');
  const summary = parseJunitXml(junitFile);

  const htmlContent = buildHtmlReport(summary);
  const htmlPath = path.resolve(reportsDir, 'backend-test-report.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`📄 HTML Report generated at: ${htmlPath}`);

  const pdfPath = path.resolve(reportsDir, 'backend-test-report.pdf');
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });
    await browser.close();
    console.log(`📄 PDF Executive Report generated at: ${pdfPath}`);
  } catch (err: any) {
    console.log(`ℹ️ PDF generation skipped (Chromium launch: ${err.message}). HTML report is available at: ${htmlPath}`);
  }
}

main().catch((err) => {
  console.error('Error generating PDF report:', err);
  process.exit(1);
});
