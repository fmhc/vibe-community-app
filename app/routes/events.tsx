import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import i18next from "~/i18n.server";
import LanguageSwitcher from "~/components/LanguageSwitcher";

export const meta: MetaFunction = () => {
  return [
    { title: "Community Events - Vibe Coding Hamburg" },
    { name: "description", content: "Join exciting AI coding events, meetups, and workshops in Hamburg. Connect with fellow developers and learn together." },
    { name: "keywords", content: "Hamburg coding events, AI meetups, developer community, workshops, hackathons" },
    { property: "og:title", content: "Community Events - Vibe Coding Hamburg" },
    { property: "og:description", content: "Join exciting AI coding events and meetups in Hamburg" },
    { property: "og:type", content: "website" },
  ];
};

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'meetup' | 'workshop' | 'hackathon' | 'talk' | 'networking';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  max_attendees?: number;
  current_attendees: number;
  organizer: string;
  tags: string[];
  is_online: boolean;
  is_free: boolean;
  price?: number;
  rsvp_required: boolean;
  rsvp_deadline?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(request);
  
  // Mock events data (in production, fetch from Directus)
  const events: CommunityEvent[] = [
    {
      id: '1',
      title: 'AI-Powered Code Review Workshop',
      description: 'Learn how to use AI tools like GitHub Copilot and ChatGPT to improve your code review process. We\'ll cover best practices, real-world examples, and hands-on exercises.',
      date: '2024-02-15',
      time: '18:30',
      location: 'Betahaus Hamburg, Eifflerstraße 43',
      type: 'workshop',
      difficulty: 'intermediate',
      max_attendees: 25,
      current_attendees: 18,
      organizer: 'Sarah Chen',
      tags: ['AI', 'Code Review', 'GitHub Copilot', 'Best Practices'],
      is_online: false,
      is_free: true,
      rsvp_required: true,
      rsvp_deadline: '2024-02-13'
    },
    {
      id: '2',
      title: 'Monthly Coding Meetup: Building with Claude API',
      description: 'Join us for our monthly meetup where we explore the latest in AI development. This month: Building applications with Anthropic\'s Claude API.',
      date: '2024-02-22',
      time: '19:00',
      location: 'Online (Zoom)',
      type: 'meetup',
      difficulty: 'all',
      current_attendees: 45,
      organizer: 'Marcus Weber',
      tags: ['Claude API', 'Anthropic', 'AI Development', 'Meetup'],
      is_online: true,
      is_free: true,
      rsvp_required: true,
      rsvp_deadline: '2024-02-21'
    },
    {
      id: '3',
      title: 'Weekend Hackathon: AI for Sustainability',
      description: 'Join us for a 48-hour hackathon focused on creating AI solutions for environmental challenges. Teams of 2-5 people, great prizes!',
      date: '2024-03-08',
      time: '09:00',
      location: 'HAW Hamburg, Berliner Tor 7',
      type: 'hackathon',
      difficulty: 'intermediate',
      max_attendees: 60,
      current_attendees: 32,
      organizer: 'Vibe Coding Team',
      tags: ['Hackathon', 'Sustainability', 'AI', 'Team Competition'],
      is_online: false,
      is_free: true,
      rsvp_required: true,
      rsvp_deadline: '2024-03-05'
    }
  ];

  return json({
    title: t('events.title'),
    events: events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  });
}

export default function Events() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  const getEventTypeColor = (type: CommunityEvent['type']) => {
    switch (type) {
      case 'workshop': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'meetup': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'hackathon': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'talk': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'networking': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getDifficultyColor = (difficulty: CommunityEvent['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-300';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-300';
      case 'advanced': return 'bg-red-500/20 text-red-300';
      case 'all': return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isEventSoon = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  const isEventFull = (event: CommunityEvent) => {
    return event.max_attendees && event.current_attendees >= event.max_attendees;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vaporwave-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-vaporwave-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-vaporwave-card/50 backdrop-blur-sm border-b border-vaporwave-cyan/20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link to="/" className="inline-flex items-center space-x-2 text-vaporwave-cyan hover:text-vaporwave-pink transition-colors mb-6">
            <span className="text-xl">🌊</span>
            <span className="font-semibold">Vibe Coding Hamburg</span>
          </Link>
          <h1 className="text-4xl font-bold glow-text mb-4">Community Events</h1>
          <p className="text-xl text-gray-300 mb-6">
            Join exciting AI coding events, workshops, and meetups in Hamburg
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="flex items-center space-x-2">
              <span>📅</span>
              <span>Regular meetups every month</span>
            </span>
            <span className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Hands-on workshops</span>
            </span>
            <span className="flex items-center space-x-2">
              <span>🚀</span>
              <span>Exciting hackathons</span>
            </span>
          </div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-vaporwave-cyan mb-2">{data.events.length}</div>
              <div className="text-gray-300">Upcoming Events</div>
            </div>
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-vaporwave-pink mb-2">
                {data.events.reduce((sum, event) => sum + event.current_attendees, 0)}
              </div>
              <div className="text-gray-300">Total RSVPs</div>
            </div>
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-vaporwave-cyan mb-2">
                {data.events.filter(e => e.is_free).length}
              </div>
              <div className="text-gray-300">Free Events</div>
            </div>
            <div className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-vaporwave-pink mb-2">
                {data.events.filter(e => isEventSoon(e.date)).length}
              </div>
              <div className="text-gray-300">This Week</div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {data.events.map((event) => (
              <div key={event.id} className="bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-6 shadow-2xl hover:border-vaporwave-cyan/40 transition-all duration-300">
                
                {/* Event Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getEventTypeColor(event.type)}`}>
                      {event.type.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(event.difficulty)}`}>
                      {event.difficulty.toUpperCase()}
                    </span>
                  </div>
                  {isEventSoon(event.date) && (
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs font-medium animate-pulse">
                      SOON
                    </span>
                  )}
                </div>

                {/* Event Title & Description */}
                <h3 className="text-xl font-semibold text-white mb-3">{event.title}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-3">{event.description}</p>

                {/* Event Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <span>📅</span>
                    <span>{formatDate(event.date)} at {event.time}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <span>{event.is_online ? '💻' : '📍'}</span>
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <span>👥</span>
                    <span>
                      {event.current_attendees} attending
                      {event.max_attendees && ` (${event.max_attendees} max)`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <span>👤</span>
                    <span>Organized by {event.organizer}</span>
                  </div>
                </div>

                {/* Event Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {event.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="bg-vaporwave-dark/30 text-vaporwave-cyan px-2 py-1 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                  {event.tags.length > 3 && (
                    <span className="text-gray-400 text-xs">+{event.tags.length - 3} more</span>
                  )}
                </div>

                {/* RSVP Section */}
                <div className="border-t border-vaporwave-cyan/20 pt-4">
                  {isEventFull(event) ? (
                    <div className="text-center">
                      <span className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm font-medium">
                        🚫 Event Full
                      </span>
                    </div>
                  ) : event.rsvp_required ? (
                    <div className="text-center">
                      <Link
                        to={`/login`}
                        className="inline-block bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-2 px-6 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 transform hover:scale-105"
                      >
                        📝 RSVP Now
                      </Link>
                      {event.rsvp_deadline && (
                        <p className="text-xs text-gray-400 mt-2">
                          RSVP by {formatDate(event.rsvp_deadline)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm font-medium">
                        ✅ No RSVP Required
                      </span>
                    </div>
                  )}
                </div>

                {/* Price Info */}
                {!event.is_free && event.price && (
                  <div className="mt-3 text-center">
                    <span className="text-vaporwave-pink font-semibold">€{event.price}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center bg-vaporwave-card/80 backdrop-blur-sm border border-vaporwave-cyan/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold glow-text mb-4">Want to Organize an Event?</h2>
            <p className="text-gray-300 mb-6">
              Have an idea for a workshop, talk, or meetup? We'd love to help you organize it!
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Link
                to="/login"
                className="inline-block bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink text-white font-semibold py-3 px-8 rounded-lg hover:from-vaporwave-pink hover:to-vaporwave-cyan transition-all duration-300 transform hover:scale-105"
              >
                💡 Propose an Event
              </Link>
              <a
                href="mailto:events@vibe-coding.hamburg"
                className="inline-block bg-vaporwave-dark/50 border border-vaporwave-cyan/30 text-white font-semibold py-3 px-8 rounded-lg hover:border-vaporwave-cyan/50 transition-all duration-300"
              >
                📧 Contact Us
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
} 