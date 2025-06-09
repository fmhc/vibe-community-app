#!/usr/bin/env node

// 🔧 Automated Directus Collection Setup
// Creates the community_members collection with all required fields

import 'dotenv/config';

const DIRECTUS_URL = process.env.DIRECTUS_URL;
const DIRECTUS_KEY = process.env.DIRECTUS_KEY;

console.log('🔧 Setting up Directus Community Members Collection...');
console.log('================================================');

if (!DIRECTUS_URL || !DIRECTUS_KEY) {
    console.log('❌ Error: DIRECTUS_URL and DIRECTUS_KEY must be set');
    process.exit(1);
}

async function createCollection() {
    try {
        console.log('📁 Creating community_members collection...');
        
        const response = await fetch(`${DIRECTUS_URL}/collections`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIRECTUS_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                collection: 'community_members',
                meta: {
                    collection: 'community_members',
                    note: 'Community member registrations and profiles',
                    display_template: '{{name}} ({{email}})'
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            if (error.includes('already exists')) {
                console.log('   ℹ️  Collection already exists, continuing...');
            } else {
                throw new Error(`Failed to create collection: ${error}`);
            }
        } else {
            console.log('   ✅ Collection created successfully');
        }
        
        return true;
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    }
}

async function createField(fieldName, fieldConfig) {
    try {
        const response = await fetch(`${DIRECTUS_URL}/fields/community_members`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIRECTUS_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                field: fieldName,
                type: fieldConfig.type,
                meta: fieldConfig.meta || {},
                schema: fieldConfig.schema || {}
            })
        });

        if (!response.ok) {
            const error = await response.text();
            if (error.includes('already exists')) {
                console.log(`   ℹ️  Field ${fieldName} already exists`);
            } else {
                throw new Error(`Failed to create field ${fieldName}: ${error}`);
            }
        } else {
            console.log(`   ✅ Field ${fieldName} created`);
        }
    } catch (error) {
        console.log(`   ❌ Error creating ${fieldName}: ${error.message}`);
    }
}

async function setupFields() {
    console.log('🔧 Creating fields...');
    
    const fields = [
        // Basic required fields
        {
            name: 'email',
            config: {
                type: 'string',
                meta: {
                    required: true,
                    note: 'User email address',
                    interface: 'input',
                    validation: {
                        _and: [
                            { _regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' }
                        ]
                    }
                },
                schema: {
                    is_unique: true
                }
            }
        },
        {
            name: 'name',
            config: {
                type: 'string',
                meta: {
                    note: 'User display name',
                    interface: 'input'
                }
            }
        },
        {
            name: 'experience_level',
            config: {
                type: 'integer',
                meta: {
                    required: true,
                    note: 'Experience level (0-100)',
                    interface: 'slider',
                    options: {
                        min: 0,
                        max: 100,
                        step: 1
                    }
                }
            }
        },
        {
            name: 'status',
            config: {
                type: 'string',
                meta: {
                    required: true,
                    note: 'Member status',
                    interface: 'select-dropdown-m2o',
                    options: {
                        choices: [
                            { text: 'Pending', value: 'pending' },
                            { text: 'Active', value: 'active' },
                            { text: 'Inactive', value: 'inactive' }
                        ]
                    }
                },
                schema: {
                    default_value: 'pending'
                }
            }
        },
        // Project fields
        {
            name: 'project_interest',
            config: {
                type: 'string',
                meta: {
                    note: 'Type of project interested in',
                    interface: 'select-dropdown-m2o',
                    options: {
                        choices: [
                            { text: 'Web Development', value: 'web' },
                            { text: 'AI/Machine Learning', value: 'ai' },
                            { text: 'Mobile Development', value: 'mobile' },
                            { text: 'Other', value: 'other' }
                        ]
                    }
                }
            }
        },
        {
            name: 'project_details',
            config: {
                type: 'text',
                meta: {
                    note: 'Project details and interests',
                    interface: 'input-multiline'
                }
            }
        },
        // Social fields
        {
            name: 'github_username',
            config: {
                type: 'string',
                meta: {
                    note: 'GitHub username',
                    interface: 'input'
                }
            }
        },
        {
            name: 'linkedin_url',
            config: {
                type: 'string',
                meta: {
                    note: 'LinkedIn profile URL',
                    interface: 'input'
                }
            }
        },
        {
            name: 'discord_username',
            config: {
                type: 'string',
                meta: {
                    note: 'Discord username',
                    interface: 'input'
                }
            }
        },
        // Email management
        {
            name: 'email_verified',
            config: {
                type: 'boolean',
                meta: {
                    note: 'Email verification status',
                    interface: 'boolean'
                },
                schema: {
                    default_value: false
                }
            }
        },
        {
            name: 'email_verification_token',
            config: {
                type: 'string',
                meta: {
                    note: 'Email verification token',
                    interface: 'input',
                    hidden: true
                }
            }
        },
        {
            name: 'email_verification_sent_at',
            config: {
                type: 'timestamp',
                meta: {
                    note: 'When verification email was sent',
                    interface: 'datetime'
                }
            }
        },
        {
            name: 'email_verified_at',
            config: {
                type: 'timestamp',
                meta: {
                    note: 'When email was verified',
                    interface: 'datetime'
                }
            }
        },
        // Invitations
        {
            name: 'mattermost_invited',
            config: {
                type: 'boolean',
                meta: {
                    note: 'Invited to Mattermost',
                    interface: 'boolean'
                },
                schema: {
                    default_value: false
                }
            }
        },
        {
            name: 'discord_invited',
            config: {
                type: 'boolean',
                meta: {
                    note: 'Invited to Discord',
                    interface: 'boolean'
                },
                schema: {
                    default_value: false
                }
            }
        },
        // Email preferences
        {
            name: 'email_preferences',
            config: {
                type: 'json',
                meta: {
                    note: 'Email preferences settings',
                    interface: 'input-code',
                    options: {
                        language: 'json'
                    }
                }
            }
        }
    ];

    for (const field of fields) {
        await createField(field.name, field.config);
    }
}

async function testCollection() {
    console.log('🧪 Testing collection access...');
    
    try {
        const response = await fetch(`${DIRECTUS_URL}/items/community_members?limit=1`, {
            headers: {
                'Authorization': `Bearer ${DIRECTUS_KEY}`
            }
        });

        if (response.ok) {
            console.log('   ✅ Collection is accessible!');
            return true;
        } else {
            const error = await response.text();
            console.log(`   ❌ Collection test failed: ${error}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Collection test error: ${error.message}`);
        return false;
    }
}

async function main() {
    const collectionCreated = await createCollection();
    
    if (collectionCreated) {
        await setupFields();
        
        console.log('');
        const testPassed = await testCollection();
        
        console.log('');
        console.log('🎉 Setup Complete!');
        console.log('==================');
        
        if (testPassed) {
            console.log('✅ community_members collection is ready');
            console.log('✅ All fields have been created');
            console.log('✅ Registration should now work!');
            console.log('');
            console.log('🧪 Test your registration:');
            console.log('   npm run test:production:quick');
        } else {
            console.log('⚠️  Collection created but test failed');
            console.log('   Please check permissions in Directus admin panel');
        }
    } else {
        console.log('❌ Collection creation failed');
        console.log('   Please check your Directus connection and permissions');
    }
}

// Run the setup
main().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}); 