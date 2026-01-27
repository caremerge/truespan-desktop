const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const shouldSkip = () => {
  const flag = (process.env.SKIP_APPX_SIGNING || '').toLowerCase();
  return flag === '1' || flag === 'true';
};

const findAppx = (distDir) => {
  if (!fs.existsSync(distDir)) {
    return null;
  }
  const entries = fs.readdirSync(distDir)
    .filter((entry) => entry.toLowerCase().endsWith('.appx'))
    .map((entry) => path.join(distDir, entry));
  if (!entries.length) {
    return null;
  }
  entries.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return entries[0];
};

const findSigntool = () => {
  if (process.env.SIGNTOOL_PATH && fs.existsSync(process.env.SIGNTOOL_PATH)) {
    return process.env.SIGNTOOL_PATH;
  }

  const roots = [
    process.env['ProgramFiles(x86)'],
    process.env.ProgramFiles,
  ].filter(Boolean);

  for (const root of roots) {
    const base = path.join(root, 'Windows Kits', '10', 'bin');
    if (!fs.existsSync(base)) {
      continue;
    }
    const versions = fs.readdirSync(base)
      .filter((entry) => /^\d+\.\d+\.\d+\.\d+$/.test(entry))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .reverse();
    for (const version of versions) {
      const candidate = path.join(base, version, 'x64', 'signtool.exe');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
};

const buildArgs = ({ appxPath, certPath, certPassword, thumbprint, timestampUrl }) => {
  const args = ['sign', '/fd', 'SHA256', '/tr', timestampUrl, '/td', 'SHA256'];
  if (thumbprint) {
    args.push('/sha1', thumbprint);
  } else {
    args.push('/f', certPath);
    if (certPassword) {
      args.push('/p', certPassword);
    }
  }
  args.push(appxPath);
  return args;
};

const main = () => {
  if (process.platform !== 'win32') {
    console.log('Skipping AppX signing: not on Windows.');
    return;
  }

  if (shouldSkip()) {
    console.log('Skipping AppX signing: SKIP_APPX_SIGNING enabled.');
    return;
  }

  const distDir = path.join(__dirname, '..', 'dist');
  const appxPath = findAppx(distDir);
  if (!appxPath) {
    throw new Error('No .appx file found in dist/.');
  }

  const thumbprint = process.env.APPX_CERT_THUMBPRINT;
  const certPath = process.env.APPX_CERT_PATH;
  const certPassword = process.env.APPX_CERT_PASSWORD;

  if (!thumbprint && !certPath) {
    console.log('Skipping AppX signing: no APPX_CERT_THUMBPRINT or APPX_CERT_PATH set.');
    console.log(`Built AppX: ${appxPath}`);
    return;
  }

  const signtoolPath = findSigntool();
  if (!signtoolPath) {
    throw new Error('signtool.exe not found. Install Windows SDK or set SIGNTOOL_PATH.');
  }

  if (certPath && !fs.existsSync(certPath)) {
    throw new Error(`APPX_CERT_PATH does not exist: ${certPath}`);
  }

  const timestampUrl = process.env.APPX_TIMESTAMP_URL || 'http://timestamp.digicert.com';
  const args = buildArgs({
    appxPath,
    certPath,
    certPassword,
    thumbprint,
    timestampUrl,
  });

  console.log(`Signing AppX: ${appxPath}`);
  execFileSync(signtoolPath, args, { stdio: 'inherit' });
  console.log('✅ AppX signing complete.');
};

try {
  main();
} catch (error) {
  console.error('❌ AppX signing failed.');
  console.error(error.message || error);
  process.exit(1);
}
