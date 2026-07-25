const assert = require('node:assert/strict');
const test = require('node:test');

process.env.AUTH_TOKEN_SECRET = 'test-secret-with-enough-entropy-for-unit-tests';

test('TokenService signs, verifies, and rejects tampered access tokens', () => {
  const { TokenService } = require('../dist/src/auth/token.service.js');
  const tokenService = new TokenService();
  const token = tokenService.signAccess({
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'youth@example.com',
    role: 'YOUTH_USER',
  });

  const payload = tokenService.verify(token, 'access');

  assert.equal(payload.sub, '00000000-0000-4000-8000-000000000001');
  assert.equal(payload.email, 'youth@example.com');
  assert.equal(payload.role, 'YOUTH_USER');
  assert.equal(payload.type, 'access');
  assert.equal(tokenService.verify(`${token}x`, 'access'), null);
  assert.equal(tokenService.verify(token, 'refresh'), null);
});

test('PasswordService hashes passwords with bcrypt and rejects wrong input', () => {
  const { PasswordService } = require('../dist/src/auth/password.service.js');
  const passwordService = new PasswordService();
  const hash = passwordService.hash('SkillBridge@123');

  assert.notEqual(hash, 'SkillBridge@123');
  assert.equal(hash.startsWith('$2'), true);
  assert.equal(passwordService.verify('SkillBridge@123', hash), true);
  assert.equal(passwordService.verify('wrong-password', hash), false);
});

test('EmailService uses Resend configuration names when email is not configured', async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  const { EmailService } = require('../dist/src/email/email.service.js');
  const emailService = new EmailService();

  const result = await emailService.send({
    to: ['test@example.com'],
    subject: 'Test email',
    text: 'Hello from SkillBridge.',
  });

  assert.equal(result.status, 'skipped');
  assert.match(result.reason, /RESEND_API_KEY/);
});

test('WhatsAppService reads provider settings from environment only', async () => {
  delete process.env.WHATSAPP_SYSTEM_PHONE;
  delete process.env.WHATSAPP_API_URL;
  delete process.env.WHATSAPP_API_TOKEN;
  const { WhatsAppService } = require('../dist/src/whatsapp/whatsapp.service.js');
  const whatsAppService = new WhatsAppService();

  const result = await whatsAppService.send({
    to: '250700000000',
    text: 'SkillBridge verification test.',
  });

  assert.equal(result.status, 'skipped');
  assert.match(result.reason, /WHATSAPP_SYSTEM_PHONE/);
});

test('NotificationsService selects Email when user has email, and WhatsApp when user has no email', () => {
  const { NotificationsService } = require('../dist/src/notifications/notifications.service.js');
  const service = new NotificationsService(null, null, null);

  const prefs = { emailEnabled: true, whatsappEnabled: true, inAppEnabled: true };

  // User with email -> expects EMAIL + IN_APP
  const userWithEmail = { email: 'user@example.com', phone: '+250780000000' };
  const channelsEmail = service.resolveChannelsForUser(userWithEmail, 'JOB_MATCH', prefs);
  assert.deepEqual(channelsEmail, ['IN_APP', 'EMAIL']);

  // User without email -> expects WHATSAPP + IN_APP
  const userWithoutEmail = { email: null, phone: '+250780000000' };
  const channelsWhatsapp = service.resolveChannelsForUser(userWithoutEmail, 'JOB_MATCH', prefs);
  assert.deepEqual(channelsWhatsapp, ['IN_APP', 'WHATSAPP']);
});

