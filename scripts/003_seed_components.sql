-- Seed some initial test components
INSERT INTO public.components (name, description, guides_markdown, display_order) VALUES
(
  'Login & Authentication',
  'Test user registration, login, logout, and session management',
  '## Testing Guidelines

### What to Test
- User registration flow
- Login with valid/invalid credentials
- Password reset functionality
- Session persistence
- Logout functionality

### Test Scenarios
1. Register a new user with valid email
2. Try to register with an existing email
3. Login with correct credentials
4. Login with wrong password
5. Check session after page refresh',
  1
),
(
  'Dashboard Overview',
  'Test the main dashboard and navigation components',
  '## Testing Guidelines

### What to Test
- Dashboard loads correctly
- Navigation works between sections
- Data displays properly
- Responsive design on mobile

### Test Scenarios
1. Navigate to dashboard after login
2. Check all navigation links work
3. Verify data accuracy
4. Test on different screen sizes',
  2
),
(
  'Bug Submission Form',
  'Test the bug reporting functionality',
  '## Testing Guidelines

### What to Test
- Form validation
- Required fields enforcement
- Severity/priority selection
- Submission success/failure handling

### Test Scenarios
1. Submit a bug with all fields filled
2. Try to submit with missing required fields
3. Test different severity levels
4. Verify bug appears in list after submission',
  3
)
ON CONFLICT DO NOTHING;
