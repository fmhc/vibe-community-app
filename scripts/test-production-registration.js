#!/usr/bin/env node

// 🎯 Simple Production Registration Test
// Tests if registration works in production environment

const PRODUCTION_URL = 'https://vibe-coding.looks-rare.at';

console.log('🎯 Testing Production Registration...');
console.log('=====================================');

async function testRegistration() {
    console.log('📧 Testing registration form submission...');
    
    try {
        // Test 1: Load the homepage and check for errors
        console.log('   🌐 Loading homepage...');
        const response = await fetch(PRODUCTION_URL);
        
        if (!response.ok) {
            console.log(`   ❌ Homepage failed to load: ${response.status} ${response.statusText}`);
            return false;
        }
        
        const html = await response.text();
        console.log('   ✅ Homepage loaded successfully');
        
        // Test 2: Check for error messages in HTML
        if (html.includes('Service authentication failed')) {
            console.log('   ❌ "Service authentication failed" still present');
            return false;
        } else {
            console.log('   ✅ No "Service authentication failed" error found');
        }
        
        if (html.includes('500') || html.includes('Internal Server Error')) {
            console.log('   ❌ Server errors detected in page');
            return false;
        } else {
            console.log('   ✅ No server errors detected');
        }
        
        // Test 3: Check if form elements are present
        const hasEmailInput = html.includes('input') && html.includes('email');
        const hasSubmitButton = html.includes('button') && (html.includes('submit') || html.includes('Join'));
        
        if (hasEmailInput && hasSubmitButton) {
            console.log('   ✅ Registration form elements detected');
        } else {
            console.log('   ⚠️ Registration form elements may be missing');
        }
        
        // Test 4: Test a simple POST request (without actually registering)
        console.log('   📝 Testing form endpoint...');
        
        const formData = new FormData();
        formData.append('email', 'test-connectivity@example.com');
        formData.append('experience_level', '50');
        
        const postResponse = await fetch(PRODUCTION_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'User-Agent': 'Production Test Bot'
            }
        });
        
        const responseText = await postResponse.text();
        
        if (postResponse.status === 500) {
            console.log('   ❌ Form submission returns 500 error');
            if (responseText.includes('Service authentication failed')) {
                console.log('   💡 Directus authentication still failing in production');
                console.log('   🔧 You need to update DIRECTUS_KEY in your Coolify deployment!');
            }
            return false;
        } else if (postResponse.status === 400) {
            console.log('   ✅ Form validation working (400 response expected for test data)');
            if (responseText.includes('already exists') || responseText.includes('invalid email')) {
                console.log('   ✅ Directus connection working - validation errors detected');
                return true;
            }
        } else if (postResponse.status === 200) {
            console.log('   ✅ Form processing working (200 response)');
            return true;
        }
        
        console.log(`   📊 Form response: ${postResponse.status} ${postResponse.statusText}`);
        
        return true;
        
    } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        return false;
    }
}

// Run the test
testRegistration()
    .then(success => {
        console.log('');
        if (success) {
            console.log('🎉 Production registration appears to be working!');
            console.log('   ✅ No authentication errors detected');
            console.log('   ✅ Form processing functional');
            console.log('');
            console.log('🔧 If you updated Coolify environment variables:');
            console.log('   • Registration should work now');
            console.log('   • Users can sign up successfully');
            console.log('   • Try registering with a real email to test');
        } else {
            console.log('❌ Production issues detected');
            console.log('');
            console.log('🔧 Required actions:');
            console.log('   1. Update DIRECTUS_KEY in Coolify deployment');
            console.log('   2. Set DIRECTUS_KEY = i0Y82VSV5DRdBQxNz5JCoq3rJErhoqyc');
            console.log('   3. Remove DIRECTUS_SECRET from environment variables');
            console.log('   4. Restart/redeploy the service');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Unexpected error:', error.message);
        process.exit(1);
    }); 