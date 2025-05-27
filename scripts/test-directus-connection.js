#!/usr/bin/env node

// 🔍 Directus Connection Diagnostic Script
// This script tests the Directus connection using the same credentials as your app

import { createDirectus, rest, authentication, staticToken, readUser } from '@directus/sdk';
import 'dotenv/config';

console.log('🔍 Testing Directus Connection...');
console.log('==================================');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   DIRECTUS_URL: ${process.env.DIRECTUS_URL || 'NOT SET'}`);
console.log(`   DIRECTUS_KEY: ${process.env.DIRECTUS_KEY ? `${process.env.DIRECTUS_KEY.slice(0, 8)}...` : 'NOT SET'}`);
console.log(`   DIRECTUS_SECRET: ${process.env.DIRECTUS_SECRET ? `${process.env.DIRECTUS_SECRET.slice(0, 8)}...` : 'NOT SET'}`);
console.log('');

if (!process.env.DIRECTUS_URL || !process.env.DIRECTUS_KEY || !process.env.DIRECTUS_SECRET) {
    console.error('❌ Missing required environment variables!');
    console.error('   Make sure DIRECTUS_URL, DIRECTUS_KEY, and DIRECTUS_SECRET are set');
    process.exit(1);
}

function formatError(error) {
    if (!error) return 'Unknown error (null/undefined)';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.toString) return error.toString();
    return JSON.stringify(error, null, 2);
}

async function testDirectusConnection() {
    console.log('🌐 Testing Directus URL accessibility...');
    
    try {
        // Test 1: Basic URL accessibility
        const response = await fetch(process.env.DIRECTUS_URL);
        console.log(`   ✅ Directus URL accessible: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.error(`   ❌ Cannot reach Directus URL: ${formatError(error)}`);
        return false;
    }

    console.log('');
    console.log('🔑 Testing Directus authentication methods...');
    
    // Test Method 1: Email/Password Login
    console.log('📧 Method 1: Email/Password Authentication');
    try {
        const client1 = createDirectus(process.env.DIRECTUS_URL)
            .with(rest())
            .with(authentication());

        console.log('   ✅ Client created for email/password auth');

        const authResult = await client1.login(
            process.env.DIRECTUS_KEY, 
            process.env.DIRECTUS_SECRET
        );
        
        if (authResult && authResult.access_token) {
            console.log('   ✅ Email/password authentication successful!');
            console.log(`   🎟️ Access token: ${authResult.access_token.slice(0, 20)}...`);
            
            // Test query
            const users = await client1.request({
                path: '/users/me',
                method: 'GET'
            });
            console.log(`   👤 Authenticated as: ${users.email || users.id || 'Unknown user'}`);
            return true;
        } else {
            console.log('   ❌ Email/password auth failed - no access token');
        }
    } catch (authError) {
        console.log('   ❌ Email/password authentication failed');
        console.log(`   📄 Error: ${formatError(authError)}`);
    }

    console.log('');
    // Test Method 2: Static Token (treat DIRECTUS_KEY as static token)
    console.log('🔑 Method 2: Static Token Authentication');
    try {
        const client2 = createDirectus(process.env.DIRECTUS_URL)
            .with(rest())
            .with(staticToken(process.env.DIRECTUS_KEY));

        console.log('   ✅ Client created for static token auth');

        // Test query with static token using proper SDK method
        const users = await client2.request(readUser('me'));
        
        console.log('   ✅ Static token authentication successful!');
        console.log(`   👤 Authenticated as: ${users.email || users.id || 'Unknown user'}`);
        return true;
        
    } catch (tokenError) {
        console.log('   ❌ Static token authentication failed');
        console.log(`   📄 Error: ${formatError(tokenError)}`);
    }

    console.log('');
    // Test Method 3: Direct API call
    console.log('🌐 Method 3: Direct API Authentication');
    try {
        // Try to authenticate via direct API call
        const authResponse = await fetch(`${process.env.DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: process.env.DIRECTUS_KEY,
                password: process.env.DIRECTUS_SECRET
            })
        });

        const authData = await authResponse.json();
        
        if (authResponse.ok && authData.data?.access_token) {
            console.log('   ✅ Direct API authentication successful!');
            console.log(`   🎟️ Access token: ${authData.data.access_token.slice(0, 20)}...`);
            
            // Test user info with token
            const userResponse = await fetch(`${process.env.DIRECTUS_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authData.data.access_token}`
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log(`   👤 Authenticated as: ${userData.data?.email || userData.data?.id || 'Unknown user'}`);
                return true;
            }
        } else {
            console.log('   ❌ Direct API authentication failed');
            console.log(`   📄 Response: ${JSON.stringify(authData, null, 2)}`);
        }
    } catch (apiError) {
        console.log('   ❌ Direct API authentication failed');
        console.log(`   📄 Error: ${formatError(apiError)}`);
    }

    console.log('');
    console.log('❌ All authentication methods failed!');
    console.log('');
    console.log('🔧 Troubleshooting Guide:');
    console.log('═══════════════════════════');
    console.log('');
    console.log('1. 📋 CHECK YOUR DIRECTUS CREDENTIALS:');
    console.log('   • Go to your Directus admin panel: https://directus-vibe-coding.looks-rare.at');
    console.log('   • Log in with your admin account');
    console.log('   • Check Settings > Project Settings > API');
    console.log('');
    console.log('2. 🔑 VERIFY AUTHENTICATION METHOD:');
    console.log('   • DIRECTUS_KEY could be:');
    console.log('     - Email address (for email/password auth)');
    console.log('     - Static token (for token auth)');
    console.log('   • DIRECTUS_SECRET could be:');
    console.log('     - Password (for email/password auth)');
    console.log('     - Not needed (for static token auth)');
    console.log('');
    console.log('3. 🎯 RECOMMENDED NEXT STEPS:');
    console.log('   • Create a static API token in Directus admin panel');
    console.log('   • Use the static token as DIRECTUS_KEY');
    console.log('   • Leave DIRECTUS_SECRET empty or remove it');
    console.log('   • Update your DirectusService to use staticToken() instead of login()');
    
    return false;
}

// Run the test
testDirectusConnection()
    .then(success => {
        if (success) {
            console.log('');
            console.log('🎉 SUCCESS! Directus connection is working.');
            console.log('   You can now update your DirectusService to use the working method.');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Unexpected error:', formatError(error));
        process.exit(1);
    }); 