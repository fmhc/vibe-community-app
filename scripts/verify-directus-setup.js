#!/usr/bin/env node

// 🧪 Verify Directus Setup
// Tests that collection exists and permissions are correct

import 'dotenv/config';

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const DIRECTUS_KEY = process.env.DIRECTUS_KEY;

console.log('🧪 Verifying Directus Setup...');
console.log('=============================');

async function verifySetup() {
    try {
        // Test 1: Collection exists and is readable
        console.log('📖 Testing collection read access...');
        const readResponse = await fetch(`${DIRECTUS_URL}/items/community_members?limit=1`, {
            headers: {
                'Authorization': `Bearer ${DIRECTUS_KEY}`
            }
        });

        if (!readResponse.ok) {
            const error = await readResponse.text();
            console.log('   ❌ Read access failed:', error);
            return false;
        }
        console.log('   ✅ Collection is readable');

        // Test 2: Can create test record
        console.log('📝 Testing record creation...');
        const testData = {
            email: `test-${Date.now()}@example.com`,
            name: 'Test User',
            experience_level: 50,
            status: 'pending'
        };

        const createResponse = await fetch(`${DIRECTUS_URL}/items/community_members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIRECTUS_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            console.log('   ❌ Create access failed:', error);
            return false;
        }

        const createdRecord = await createResponse.json();
        console.log('   ✅ Test record created successfully');

        // Test 3: Clean up test record
        if (createdRecord.data?.id) {
            console.log('🧹 Cleaning up test record...');
            const deleteResponse = await fetch(`${DIRECTUS_URL}/items/community_members/${createdRecord.data.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${DIRECTUS_KEY}`
                }
            });

            if (deleteResponse.ok) {
                console.log('   ✅ Test record cleaned up');
            } else {
                console.log('   ⚠️  Could not delete test record (not critical)');
            }
        }

        return true;

    } catch (error) {
        console.log(`   ❌ Verification failed: ${error.message}`);
        return false;
    }
}

async function main() {
    const isSetup = await verifySetup();
    
    console.log('');
    console.log('🎯 Verification Result:');
    console.log('=======================');
    
    if (isSetup) {
        console.log('🎉 SUCCESS! Directus is fully configured!');
        console.log('');
        console.log('✅ Collection exists');
        console.log('✅ Read permissions working');
        console.log('✅ Write permissions working');
        console.log('✅ Registration should now work!');
        console.log('');
        console.log('🧪 Test your registration now:');
        console.log('   npm run test:production:quick');
    } else {
        console.log('❌ Setup not complete');
        console.log('');
        console.log('📋 Still needed:');
        console.log('1. Add fields to community_members collection');
        console.log('2. Set permissions for your API user');
        console.log('3. Re-run: npm run verify:directus');
        console.log('');
        console.log('📖 See: DIRECTUS_QUICK_SETUP.md for instructions');
    }
}

main().catch(error => {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
}); 