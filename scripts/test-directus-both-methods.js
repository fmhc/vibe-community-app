#!/usr/bin/env node

// 🔍 Test Both Directus Authentication Methods
// Helps determine if we should use email/password or static token

import { createDirectus, rest, authentication, staticToken, readUser } from '@directus/sdk';
import 'dotenv/config';

console.log('🔍 Testing Both Directus Authentication Methods...');
console.log('===============================================');

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const DIRECTUS_KEY = process.env.DIRECTUS_KEY;
const DIRECTUS_SECRET = process.env.DIRECTUS_SECRET;

console.log('📋 Current Environment:');
console.log(`   DIRECTUS_URL: ${DIRECTUS_URL}`);
console.log(`   DIRECTUS_KEY: ${DIRECTUS_KEY?.slice(0, 8)}... (${DIRECTUS_KEY?.includes('@') ? 'EMAIL FORMAT' : 'TOKEN FORMAT'})`);
console.log(`   DIRECTUS_SECRET: ${DIRECTUS_SECRET ? 'SET' : 'NOT SET'}`);
console.log('');

async function testEmailPasswordAuth() {
    console.log('📧 Method 1: Email/Password Authentication');
    console.log(`   Using KEY as email: ${DIRECTUS_KEY}`);
    console.log(`   Using SECRET as password: ${DIRECTUS_SECRET ? 'YES' : 'NO'}`);
    
    if (!DIRECTUS_SECRET) {
        console.log('   ❌ No DIRECTUS_SECRET provided for password auth');
        return false;
    }
    
    try {
        const client = createDirectus(DIRECTUS_URL)
            .with(rest())
            .with(authentication());

        // Try login with KEY as email and SECRET as password
        const authResult = await client.login(DIRECTUS_KEY, DIRECTUS_SECRET);
        
        if (authResult?.access_token) {
            console.log('   ✅ Email/password authentication SUCCESSFUL!');
            
            // Test user query
            const user = await client.request(readUser('me'));
            console.log(`   👤 Authenticated as: ${user.email || user.id}`);
            
            return { success: true, method: 'email_password', user };
        } else {
            console.log('   ❌ No access token received');
            return false;
        }
    } catch (error) {
        console.log('   ❌ Email/password authentication failed');
        console.log(`   📄 Error details: ${JSON.stringify(error, null, 2)}`);
        return false;
    }
}

async function testStaticTokenAuth() {
    console.log('🔑 Method 2: Static Token Authentication');
    console.log(`   Using KEY as static token: ${DIRECTUS_KEY?.slice(0, 8)}...`);
    
    try {
        const client = createDirectus(DIRECTUS_URL)
            .with(rest())
            .with(staticToken(DIRECTUS_KEY));

        // Test user query with static token
        const user = await client.request(readUser('me'));
        
        console.log('   ✅ Static token authentication SUCCESSFUL!');
        console.log(`   👤 Authenticated as: ${user.email || user.id}`);
        
        return { success: true, method: 'static_token', user };
    } catch (error) {
        console.log('   ❌ Static token authentication failed');
        console.log(`   📄 Error details: ${JSON.stringify(error, null, 2)}`);
        return false;
    }
}

async function main() {
    const emailResult = await testEmailPasswordAuth();
    console.log('');
    const tokenResult = await testStaticTokenAuth();
    
    console.log('');
    console.log('📊 Results Summary:');
    console.log('===================');
    
    if (emailResult && tokenResult) {
        console.log('🎉 BOTH methods work! This is unusual but possible.');
        console.log('   📧 Email/password: ✅ Working');
        console.log('   🔑 Static token: ✅ Working');
        console.log('');
        console.log('💡 Recommendation: Use email/password (your original method)');
        console.log('   since that\'s what worked before.');
    } else if (emailResult) {
        console.log('📧 Email/password authentication is working!');
        console.log('   ✅ This is likely your original setup');
        console.log('   ✅ Keep using login() method in DirectusService');
        console.log('');
        console.log('🔧 Action needed: Revert DirectusService to use login() instead of staticToken()');
    } else if (tokenResult) {
        console.log('🔑 Static token authentication is working!');
        console.log('   ✅ Current DirectusService setup is correct');
        console.log('   ✅ You have a valid static API token');
        console.log('');
        console.log('💡 This suggests you switched from email/password to static token');
    } else {
        console.log('❌ NEITHER method is working!');
        console.log('   📋 Possible issues:');
        console.log('     • Invalid credentials');
        console.log('     • User account deactivated');
        console.log('     • Directus server configuration changed');
        console.log('     • Network connectivity issues');
    }
    
    console.log('');
    console.log('🎯 Next Steps:');
    if (emailResult) {
        console.log('   1. Revert DirectusService to use email/password authentication');
        console.log('   2. Update production with original DIRECTUS_KEY and DIRECTUS_SECRET');
    } else if (tokenResult) {
        console.log('   1. Keep current DirectusService static token setup');
        console.log('   2. Update production DIRECTUS_KEY to static token');
    } else {
        console.log('   1. Check your Directus admin panel');
        console.log('   2. Verify user account is active');
        console.log('   3. Generate new credentials');
    }
}

main().catch(console.error); 