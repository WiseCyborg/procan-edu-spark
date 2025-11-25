-- Add progress-milestone email template
INSERT INTO email_templates (
  template_name,
  subject_line,
  html_content,
  variables,
  is_active
) VALUES (
  'progress-milestone',
  'Great Progress! You''re {{.MilestonePercentage}}% Complete',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .milestone-badge { background: white; border: 3px solid #10b981; border-radius: 50%; width: 120px; height: 120px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #10b981; }
    .progress-bar { background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden; margin: 20px 0; }
    .progress-fill { background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 100%; transition: width 0.3s ease; }
    .stats { display: flex; justify-content: space-around; margin: 30px 0; }
    .stat { text-align: center; }
    .stat-number { font-size: 28px; font-weight: bold; color: #10b981; }
    .stat-label { font-size: 14px; color: #6b7280; }
    .cta-button { display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Great Progress, {{.FirstName}}!</h1>
    </div>
    <div class="content">
      <div class="milestone-badge">
        {{.MilestonePercentage}}%
      </div>
      <h2 style="text-align: center; color: #10b981;">You''ve Reached a Major Milestone!</h2>
      <p style="text-align: center; font-size: 16px;">Keep up the amazing work! You''re well on your way to becoming a certified cannabis professional.</p>
      
      <div class="progress-bar">
        <div class="progress-fill" style="width: {{.MilestonePercentage}}%;"></div>
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-number">{{.ModulesCompleted}}</div>
          <div class="stat-label">Modules Completed</div>
        </div>
        <div class="stat">
          <div class="stat-number">{{.ModulesRemaining}}</div>
          <div class="stat-label">Modules Remaining</div>
        </div>
        <div class="stat">
          <div class="stat-number">{{.TotalModules}}</div>
          <div class="stat-label">Total Modules</div>
        </div>
      </div>
      
      <p style="font-size: 16px; margin-top: 30px;"><strong>What''s Next?</strong></p>
      <p>Continue your training journey to unlock your professional certification. You''re {{.MilestonePercentage}}% of the way there!</p>
      
      <div style="text-align: center;">
        <a href="{{.DashboardUrl}}" class="cta-button">Continue Training →</a>
      </div>
      
      <p style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <strong>💡 Pro Tip:</strong> Students who complete modules consistently are 3x more likely to pass their certification exam on the first try!
      </p>
    </div>
    <div class="footer">
      <p>© 2024 ProCann Edu. All rights reserved.</p>
      <p>You''re receiving this email because you''re enrolled in a certification course.</p>
    </div>
  </div>
</body>
</html>',
  '{"FirstName": "string", "MilestonePercentage": "number", "ModulesCompleted": "number", "ModulesRemaining": "number", "TotalModules": "number", "DashboardUrl": "string"}'::jsonb,
  true
) ON CONFLICT (template_name) DO UPDATE SET
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables,
  updated_at = now();