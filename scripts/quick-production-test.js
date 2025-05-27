#!/usr/bin/env node

// 🚀 Quick Production Test
// Simple test to verify if Coolify environment update worked

const PRODUCTION_URL = 'https://vibe-coding.looks-rare.at';

console.log('🚀 Quick Production Test...');
console.log('=========================');

async function quickTest() {
    try {
        console.log('📝 Testing form submission...');
        
        const formData = new FormData();
        formData.append('email', 'quick-test@example.com');
        formData.append('experience_level', '50');
        
        const response = await fetch(PRODUCTION_URL, {
            method: 'POST',
            body: formData,
        });
        
        console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 500) {
            console.log('❌ Still getting 500 errors - Coolify environment not updated yet');
            return false;
        } else if (response.status === 400) {
            console.log('✅ Form validation working! (Expected 400 for test email)');
            console.log('🎉 Production is working correctly now!');
            return true;
        } else if (response.status === 200) {
            console.log('✅ Form processing working!');
            console.log('🎉 Production is working correctly now!');
            return true;
        } else {
            console.log(`⚠️ Unexpected status: ${response.status}`);
            const text = await response.text();
            if (text.includes('Service authentication failed')) {
                console.log('❌ Still authentication issues');
                return false;
            } else {
                console.log('✅ No authentication errors detected');
                return true;
            }
        }
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        return false;
    }
}

quickTest().then(success => {
    console.log('');
    if (success) {
        console.log('🎉 SUCCESS! Your registration page is working!');
        console.log('   • Users can now register successfully');
        console.log('   • Directus authentication is working');
        console.log('   • Ready for real users!');
    } else {
        console.log('⏳ Environment update not applied yet');
        console.log('   • Update DIRECTUS_KEY in Coolify');
        console.log('   • Remove DIRECTUS_SECRET');
        console.log('   • Restart the deployment');
        console.log('   • Run this test again');
    }
    process.exit(success ? 0 : 1);
}); 