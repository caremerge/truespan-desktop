const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Custom signing function for eSigner.com cloud code signing
 * This script is called by electron-builder during the build process
 * 
 * Environment variables required:
 * - ESIGNER_USERNAME: Your eSigner.com username
 * - ESIGNER_PASSWORD: Your eSigner.com password
 * - ESIGNER_CREDENTIAL_ID: Your credential ID from eSigner
 * - ESIGNER_TOTP_SECRET: Your TOTP secret (the secret code from eSigner portal)
 */

// Load .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const match = trimmedLine.match(/^\s*([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // Only set if not already in environment
        if (!process.env[key] && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Load environment variables from .env file
loadEnvFile();

exports.default = async function(configuration) {
  if (process.env.SKIP_SIGNING === '1' || process.env.SKIP_SIGNING === 'true') {
    console.log(`\n🔕 Skipping signing for ${path.basename(configuration.path)} (SKIP_SIGNING enabled)\n`);
    return;
  }

  // The file to be signed
  const fileToSign = configuration.path;
  
  console.log(`\n🔐 Signing ${path.basename(fileToSign)} with eSigner.com...`);
  
  // Check for required environment variables
  const requiredVars = [
    'ESIGNER_USERNAME',
    'ESIGNER_PASSWORD', 
    'ESIGNER_CREDENTIAL_ID',
    'ESIGNER_TOTP_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease set these variables in your .env file or environment.');
    throw new Error('Missing eSigner credentials');
  }

  try {
    // Path to CodeSignTool directory
    const codeSignToolDir = process.env.CODESIGNTOOL_DIR || 
      'C:\\Users\\ryanm\\CodeSignTool-v1.3.2-windows';
    
    // Build the signing command
    // CodeSignTool.bat must be run from its own directory
    const command = `cd /d "${codeSignToolDir}" && CodeSignTool.bat sign ` +
      `-username="${process.env.ESIGNER_USERNAME}" ` +
      `-password="${process.env.ESIGNER_PASSWORD}" ` +
      `-credential_id="${process.env.ESIGNER_CREDENTIAL_ID}" ` +
      `-totp_secret="${process.env.ESIGNER_TOTP_SECRET}" ` +
      `-program_name="Truespan Neighborhood" ` +
      `-input_file_path="${fileToSign}" ` +
      `-override=true`;

    // Execute the signing command
    execSync(command, { 
      stdio: 'inherit',
      shell: 'cmd.exe' // Use cmd.exe instead of PowerShell for batch files
    });
    
    console.log(`✅ Successfully signed ${path.basename(fileToSign)}\n`);
  } catch (error) {
    console.error(`❌ Failed to sign ${path.basename(fileToSign)}`);
    console.error('Error:', error.message);
    throw error;
  }
};

