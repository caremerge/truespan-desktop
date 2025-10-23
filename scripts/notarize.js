const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Check for required environment variables
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('⚠️  Skipping notarization: Missing Apple credentials');
    console.log('   App will be signed but not notarized');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`\n🔐 Starting notarization for ${appName}...`);
  console.log(`   App path: ${appPath}`);
  console.log(`   Apple ID: ${process.env.APPLE_ID}`);
  console.log(`   Team ID: ${process.env.APPLE_TEAM_ID}`);

  try {
    // Notarize the app
    await notarize({
      appBundleId: 'com.truespanliving.desktop',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    
    console.log(`✅ Successfully notarized ${appName}`);
    
    // Verify notarization with spctl
    console.log('\n🔍 Verifying notarization...');
    try {
      const spctlOutput = execSync(`spctl -a -vv -t install "${appPath}"`, { encoding: 'utf8' });
      console.log('   spctl output:', spctlOutput);
      
      if (spctlOutput.includes('source=Notarized Developer ID')) {
        console.log('✅ Verified: App is properly notarized');
      } else {
        console.log('⚠️  Warning: Notarization verification unclear');
      }
    } catch (spctlError) {
      console.log('   spctl output:', spctlError.stdout || spctlError.message);
      if (spctlError.stdout && spctlError.stdout.includes('source=Notarized Developer ID')) {
        console.log('✅ Verified: App is properly notarized');
      } else {
        console.log('⚠️  Could not verify notarization status');
      }
    }
    
    // Staple the notarization ticket
    console.log('\n📎 Stapling notarization ticket...');
    try {
      execSync(`xcrun stapler staple "${appPath}"`, { encoding: 'utf8' });
      console.log('✅ Successfully stapled ticket to app');
    } catch (stapleError) {
      console.log('⚠️  Stapling may have failed:', stapleError.message);
      console.log('   This might be okay if the ticket was already stapled');
    }
    
    console.log('\n✅ Notarization complete!\n');
  } catch (error) {
    console.error('\n❌ Notarization failed:');
    console.error('   Error:', error.message);
    console.error('\n⚠️  Continuing without notarization...');
    console.error('   App is signed but users may see a warning on first launch\n');
    // Don't throw - allow build to continue
  }
};

