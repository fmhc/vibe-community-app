import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { directusService } from "~/services/directus.server";
import { emailService } from "~/services/email.server";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Email Campaigns - Vibe Coding Hamburg Admin" },
    { name: "description", content: "Manage email campaigns for the Vibe Coding Hamburg community." },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

interface EmailCampaign {
  id?: string;
  name: string;
  subject: string;
  content: string;
  template_type: 'newsletter' | 'event' | 'project' | 'announcement';
  target_audience: 'all' | 'verified' | 'active' | 'beginners' | 'advanced';
  schedule_type: 'immediate' | 'scheduled';
  scheduled_for?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  created_by: string;
  created_at?: string;
  sent_at?: string;
  recipients_count?: number;
  open_rate?: number;
  click_rate?: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if user is authenticated
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  // Basic admin check (in production, you'd have proper role checking)
  if (!session.user.email?.includes('@vibe-coding.hamburg')) {
    return redirect("/dashboard");
  }

  // Get community stats for campaign planning
  const statsResult = await directusService.getStats();
  
  const t = await i18next.getFixedT(request);
  return json({ 
    title: t('admin.campaigns.title'),
    user: session.user,
    stats: statsResult.success ? statsResult.data : null,
    // Mock campaign data (in production, you'd fetch from database)
    campaigns: [
      {
        id: '1',
        name: 'Welcome Series - Week 1',
        subject: '🌊 Welcome to Vibe Coding Hamburg!',
        template_type: 'newsletter',
        target_audience: 'verified',
        status: 'sent',
        created_at: '2024-01-10',
        sent_at: '2024-01-15',
        recipients_count: 156,
        open_rate: 42.3,
        click_rate: 8.7
      },
      {
        id: '2',
        name: 'January Meetup Invitation',
        subject: '📅 Join our January AI Coding Meetup',
        template_type: 'event',
        target_audience: 'active',
        status: 'scheduled',
        created_at: '2024-01-12',
        scheduled_for: '2024-01-20',
        recipients_count: 89,
      },
      {
        id: '3',
        name: 'Project Collaboration Weekly',
        subject: '💡 New Projects This Week',
        template_type: 'project',
        target_audience: 'all',
        status: 'draft',
        created_at: '2024-01-14',
      }
    ]
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await directusService.getSession(request);
  if (!session?.user) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  try {
    switch (action) {
      case "create_campaign": {
        const campaignData: Partial<EmailCampaign> = {
          name: formData.get("name") as string,
          subject: formData.get("subject") as string,
          content: formData.get("content") as string,
          template_type: formData.get("template_type") as EmailCampaign['template_type'],
          target_audience: formData.get("target_audience") as EmailCampaign['target_audience'],
          schedule_type: formData.get("schedule_type") as EmailCampaign['schedule_type'],
          scheduled_for: formData.get("scheduled_for") as string || undefined,
          status: formData.get("schedule_type") === "immediate" ? "sent" : "scheduled",
          created_by: session.user.id,
        };

        // Validate required fields
        if (!campaignData.name || !campaignData.subject || !campaignData.content) {
          return json({ error: "Name, subject, and content are required" }, { status: 400 });
        }

        // Get target audience
        const audienceFilter = getAudienceFilter(campaignData.target_audience!);
        const membersResult = await directusService.getCommunityMembers(audienceFilter);
        
        if (!membersResult.success) {
          return json({ error: "Failed to fetch recipients" }, { status: 500 });
        }

        const recipients = membersResult.data!.filter(member => 
          member.email_verified && member.email_preferences?.newsletter !== false
        );

        if (campaignData.schedule_type === "immediate") {
          // Send immediately
          let successCount = 0;
          let errorCount = 0;

          for (const member of recipients) {
            try {
              await emailService.sendCampaignEmail({
                to: member.email,
                name: member.name || 'Member',
                subject: campaignData.subject!,
                content: campaignData.content!,
                templateType: campaignData.template_type!,
                unsubscribeToken: member.unsubscribe_token
              });
              successCount++;
            } catch (error) {
              console.error(`Failed to send to ${member.email}:`, error);
              errorCount++;
            }
          }

          return json({ 
            success: true, 
            message: `Campaign sent successfully! ${successCount} emails sent, ${errorCount} failed.`,
            sentCount: successCount,
            errorCount
          });
        } else {
          // Schedule for later
          // In production, you'd save this to a campaigns table and use a job queue
          return json({ 
            success: true, 
            message: `Campaign scheduled for ${campaignData.scheduled_for}. ${recipients.length} recipients will receive this email.`,
            recipientCount: recipients.length
          });
        }
      }

      case "send_test_email": {
        const subject = formData.get("subject") as string;
        const content = formData.get("content") as string;
        const templateType = formData.get("template_type") as EmailCampaign['template_type'];
        const testEmail = session.user.email;

        if (!testEmail) {
          return json({ error: "No test email available" }, { status: 400 });
        }

        await emailService.sendCampaignEmail({
          to: testEmail,
          name: session.user.first_name || 'Admin',
          subject: subject + " [TEST]",
          content: content,
          templateType: templateType,
        });

        return json({ 
          success: true, 
          message: `Test email sent to ${testEmail}` 
        });
      }

      case "cancel_campaign": {
        const campaignId = formData.get("campaign_id") as string;
        // In production, you'd update the campaign status in the database
        return json({ 
          success: true, 
          message: `Campaign ${campaignId} has been cancelled.` 
        });
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Campaign action error:", error);
    return json({ 
      error: "An error occurred while processing your request." 
    }, { status: 500 });
  }
}

function getAudienceFilter(audience: string) {
  switch (audience) {
    case 'verified':
      return { email_verified: { _eq: true } };
    case 'active':
      return { 
        email_verified: { _eq: true },
        status: { _eq: 'active' }
      };
    case 'beginners':
      return { 
        email_verified: { _eq: true },
        experience_level: { _lte: 30 }
      };
    case 'advanced':
      return { 
        email_verified: { _eq: true },
        experience_level: { _gte: 70 }
      };
    default:
      return { email_verified: { _eq: true } };
  }
}

export default function AdminCampaigns() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl"></div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Action Results */}
          {actionData && 'success' in actionData && actionData.success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6 mb-8">
              <h3 className="text-green-200 font-semibold mb-2">✅ Success</h3>
              <p className="text-green-100">{'message' in actionData ? actionData.message : ''}</p>
            </div>
          )}

          {actionData && 'error' in actionData && actionData.error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 mb-8">
              <h3 className="text-red-200 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-100">{actionData.error}</p>
            </div>
          )}

          {/* Stats Overview */}
          {data.stats && (
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6">
                <h3 className="text-vaporwave-cyan font-semibold mb-2">Total Members</h3>
                <p className="text-2xl font-bold text-white">{data.stats.total}</p>
              </div>
              <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6">
                <h3 className="text-vaporwave-cyan font-semibold mb-2">Verified</h3>
                <p className="text-2xl font-bold text-white">{data.stats.verified}</p>
              </div>
              <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6">
                <h3 className="text-vaporwave-cyan font-semibold mb-2">Newsletter Subscribers</h3>
                <p className="text-2xl font-bold text-white">{data.stats.emailPreferences.newsletter}</p>
              </div>
              <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6">
                <h3 className="text-vaporwave-cyan font-semibold mb-2">Event Subscribers</h3>
                <p className="text-2xl font-bold text-white">{data.stats.emailPreferences.eventInvitations}</p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Campaign Creation Form */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-vaporwave-cyan mb-6">Create New Campaign</h2>
              
              <Form method="post" className="space-y-6">
                <input type="hidden" name="action" value="create_campaign" />
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                    placeholder="e.g., February Newsletter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                    placeholder="e.g., 🌊 Monthly Community Update"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Template Type
                    </label>
                    <select
                      name="template_type"
                      required
                      className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                    >
                      <option value="newsletter">📰 Newsletter</option>
                      <option value="event">📅 Event</option>
                      <option value="project">💡 Project</option>
                      <option value="announcement">📢 Announcement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Target Audience
                    </label>
                    <select
                      name="target_audience"
                      required
                      className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                    >
                      <option value="all">👥 All Members</option>
                      <option value="verified">✅ Verified Only</option>
                      <option value="active">🔥 Active Members</option>
                      <option value="beginners">🌱 Beginners (≤30%)</option>
                      <option value="advanced">🚀 Advanced (≥70%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Content
                  </label>
                  <textarea
                    name="content"
                    required
                    rows={8}
                    className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                    placeholder="Write your email content here... You can use HTML or plain text."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Schedule Type
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="schedule_type"
                        value="immediate"
                        defaultChecked
                        className="w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 focus:ring-vaporwave-cyan/50"
                      />
                      <span className="ml-2 text-gray-300">Send immediately</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="schedule_type"
                        value="scheduled"
                        className="w-4 h-4 text-vaporwave-cyan bg-vaporwave-card border-vaporwave-cyan/30 focus:ring-vaporwave-cyan/50"
                      />
                      <span className="ml-2 text-gray-300">Schedule for later</span>
                    </label>
                  </div>
                </div>

                <div id="schedule-datetime" className="hidden">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Schedule Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduled_for"
                    className="w-full px-4 py-2 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-vaporwave-cyan/50"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-3 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "📨 Create Campaign"}
                  </button>
                  
                  <button
                    type="submit"
                    name="action"
                    value="send_test_email"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-vaporwave-dark/50 border border-vaporwave-cyan/30 text-white font-semibold rounded-lg hover:border-vaporwave-cyan/50 transition-all disabled:opacity-50"
                  >
                    🧪 Test
                  </button>
                </div>
              </Form>
            </div>

            {/* Campaign List */}
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-vaporwave-cyan mb-6">Recent Campaigns</h2>
              
              <div className="space-y-4">
                {data.campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-vaporwave-dark/30 rounded-lg p-4 border border-vaporwave-cyan/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white">{campaign.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        campaign.status === 'sent' ? 'bg-green-500/20 text-green-300' :
                        campaign.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-300' :
                        campaign.status === 'draft' ? 'bg-gray-500/20 text-gray-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-2">{campaign.subject}</p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{campaign.template_type} • {campaign.target_audience}</span>
                      {'recipients_count' in campaign && campaign.recipients_count !== undefined && (
                        <span>{campaign.recipients_count} recipients</span>
                      )}
                    </div>

                    {campaign.status === 'sent' && 'open_rate' in campaign && campaign.open_rate !== undefined && (
                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400">Open Rate:</span>
                          <span className="text-vaporwave-cyan font-semibold ml-2">{campaign.open_rate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Click Rate:</span>
                          <span className="text-vaporwave-pink font-semibold ml-2">{'click_rate' in campaign ? campaign.click_rate : 0}%</span>
                        </div>
                      </div>
                    )}

                    {campaign.status === 'scheduled' && 'scheduled_for' in campaign && campaign.scheduled_for && (
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-xs text-gray-400">
                          Scheduled: {campaign.scheduled_for}
                        </span>
                        <Form method="post" className="inline">
                          <input type="hidden" name="action" value="cancel_campaign" />
                          <input type="hidden" name="campaign_id" value={campaign.id} />
                          <button
                            type="submit"
                            className="text-red-400 hover:text-red-300 text-xs underline"
                          >
                            Cancel
                          </button>
                        </Form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Schedule Toggle Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const scheduleRadios = document.querySelectorAll('input[name="schedule_type"]');
            const scheduleDiv = document.getElementById('schedule-datetime');
            
            scheduleRadios.forEach(radio => {
              radio.addEventListener('change', function() {
                if (this.value === 'scheduled') {
                  scheduleDiv.classList.remove('hidden');
                } else {
                  scheduleDiv.classList.add('hidden');
                }
              });
            });
          });
        `
      }} />
    </div>
  );
} 