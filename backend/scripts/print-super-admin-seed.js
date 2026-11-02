import bcrypt from 'bcryptjs';
import readline from 'node:readline';

const sqlValue = (value) => `'${value.replaceAll("'", "''")}'`;

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function askHidden(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error('Run this command in an interactive terminal so the password can be entered privately.');
  }
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    process.stdout.write(prompt);
    let value = '';

    const cleanup = () => {
      input.off('keypress', onKeypress);
      input.setRawMode(false);
    };
    const onKeypress = (character, key) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.stdout.write('\n');
        reject(new Error('Cancelled.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
      } else if (key.name === 'backspace') {
        value = value.slice(0, -1);
      } else if (!key.ctrl && !key.meta) {
        value += character;
      }
    };
    input.on('keypress', onKeypress);
  });
}

try {
  const userCode = await ask('Super Admin ID: ');
  const name = await ask('Full name: ');
  const mobile = await ask('10-digit mobile number: ');
  const email = await ask('Email (optional): ');
  const password = await askHidden('Password (minimum 6 characters): ');

  if (!userCode || !name || !/^\d{10}$/.test(mobile) || password.length < 6) {
    throw new Error('ID, name, a valid 10-digit mobile number, and a password of at least 6 characters are required.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const emailValue = email ? sqlValue(email) : 'NULL';
  console.log('\nRun this SQL once in the configured application database:\n');
  console.log(`INSERT INTO app_users (role, user_code, name, mobile, email, password_hash, profile)
VALUES ('SUPER_ADMIN', ${sqlValue(userCode)}, ${sqlValue(name)}, ${sqlValue(mobile)}, ${emailValue}, ${sqlValue(passwordHash)}, '{}'::jsonb);`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
