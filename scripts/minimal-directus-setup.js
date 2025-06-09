#!/usr/bin/env node

// 🔧 Minimal Directus Setup - Just Essential Fields
// Focuses on getting registration working with minimal required fields

import 'dotenv/config';

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const DIRECTUS_KEY = process.env.DIRECTUS_KEY;

console.log('🔧 Minimal Directus Setup...');
console.log('============================');

async function createEssentialFields() {
    const essentialFields = [
        {
            field: 'email',
            type: 'string',
            meta: {
                required: true,
                interface: 'input',
                note: 'User email address'
            },
            schema: {
                is_unique: true,
                is_nullable: false
            }
        },
        {
            field: 'name',
            type: 'string',
            meta: {
                interface: 'input',
                note: 'User display name'
            }
        },
        {
            field: 'experience_level',
            type: 'integer',
            meta: {
                required: true,
                interface: 'input',
                note: 'Experience level 0-100'
            },
            schema: {
                is_nullable: false,
                default_value: 50
            }
        },
        {
            field: 'status',
            type: 'string',
            meta: {
                required: true,
                interface: 'input',
                note: 'Member status'
            },
            schema: {
                is_nullable: false,
                default_value: 'pending'
            }
        }
    ];

    console.log('📝 Creating essential fields...');
    let successCount = 0;

    for (const fieldConfig of essentialFields) {
        try {
            const response = await fetch(`${DIRECTUS_URL}/fields/community_members`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${DIRECTUS_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fieldConfig)
            });

            if (response.ok) {
                console.log(`   ✅ ${fieldConfig.field} created`);
                successCount++;
            } else {
                const errorText = await response.text();
                if (errorText.includes('already exists')) {
                    console.log(`   ℹ️  ${fieldConfig.field} already exists`);
                    successCount++;
                } else {
                    console.log(`   ❌ ${fieldConfig.field} failed: ${errorText}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ ${fieldConfig.field} error: ${error.message}`);
        }
    }

    return successCount >= 3; // Need at least email, experience_level, status
}

async function testBasicAccess() {
    console.log('🧪 Testing basic access...');
    
    try {
        // Try to read collection
        const readResponse = await fetch(`${DIRECTUS_URL}/items/community_members?limit=1`, {
            headers: { 'Authorization': `Bearer ${DIRECTUS_KEY}` }
        });

        console.log(`   📖 Read test: ${readResponse.status} ${readResponse.statusText}`);

        // Try a simple create test
        const testData = {
            email: `test-minimal-${Date.now()}@example.com`,
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

        console.log(`   📝 Create test: ${createResponse.status} ${createResponse.statusText}`);

        if (createResponse.ok) {
            const created = await createResponse.json();
            console.log('   ✅ Minimal setup working!');
            
            // Clean up test record
            if (created.data?.id) {
                await fetch(`${DIRECTUS_URL}/items/community_members/${created.data.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${DIRECTUS_KEY}` }
                });
                console.log('   🧹 Test record cleaned up');
            }
            return true;
        } else {
            const error = await createResponse.text();
            console.log(`   ❌ Create failed: ${error}`);
            return false;
        }

    } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('📊 Current Status:');
    
    // Test current access first
    const hasAccess = await testBasicAccess();
    
    if (!hasAccess) {
        console.log('');
        console.log('🔧 Attempting to create essential fields...');
        const fieldsCreated = await createEssentialFields();
        
        console.log('');
        console.log('🧪 Re-testing after field creation...');
        const finalTest = await testBasicAccess();
        
        console.log('');
        console.log('🎯 Final Result:');
        console.log('================');
        
        if (finalTest) {
            console.log('🎉 SUCCESS! Registration should work now!');
            console.log('');
            console.log('🧪 Test your registration:');
            console.log('   npm run test:production:quick');
        } else {
            console.log('❌ Still having permission issues');
            console.log('');
            console.log('📋 Manual steps needed:');
            console.log('1. Go to: https://directus-vibe-coding.looks-rare.at/admin');
            console.log('2. Settings → Roles & Permissions');
            console.log('3. Find your API user role');
            console.log('4. Enable ALL permissions for community_members collection');
        }
    } else {
        console.log('');
        console.log('🎉 Already working! Registration should be functional!');
        console.log('');
        console.log('🧪 Test your registration:');
        console.log('   npm run test:production:quick');
    }
}

main().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}); 