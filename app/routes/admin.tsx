import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { directusService, type CommunityMember } from "~/services/directus.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Admin Dashboard - Vibe Coding Hamburg" },
    { name: "description", content: "Community management dashboard" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [membersResult, statsResult] = await Promise.all([
      directusService.getCommunityMembers(),
      directusService.getStats(),
    ]);

    if (!membersResult.success || !statsResult.success) {
      throw new Error("Failed to load data");
    }

    return json({
      members: membersResult.data || [],
      stats: statsResult.data,
      error: null,
    });
  } catch (error) {
    console.error("Admin loader error:", error);
    return json({ members: [], stats: null, error: "Failed to load data" });
  }
}

export default function AdminDashboard() {
  const { members, stats, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark p-6">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Dashboard</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold glow-text mb-4">Community Dashboard</h1>
          <p className="text-gray-300">Manage Vibe Coding Hamburg community members</p>
        </header>

        {/* Stats Overview */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card text-center">
              <div className="text-3xl font-bold text-vaporwave-cyan">{stats.total}</div>
              <div className="text-gray-400">Total Members</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">{stats.active}</div>
              <div className="text-gray-400">Active</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-gray-400">Pending</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-vaporwave-pink">{stats.experienceLevels.advanced}</div>
              <div className="text-gray-400">Advanced</div>
            </div>
          </div>
        )}

        {/* Experience Levels Breakdown */}
        {stats && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Experience Levels</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-vaporwave-card/50 p-4 rounded-lg">
                <div className="text-lg font-medium text-green-400">Beginner (0-25)</div>
                <div className="text-2xl font-bold">{stats.experienceLevels.beginner}</div>
              </div>
              <div className="bg-vaporwave-card/50 p-4 rounded-lg">
                <div className="text-lg font-medium text-yellow-400">Intermediate (26-75)</div>
                <div className="text-2xl font-bold">{stats.experienceLevels.intermediate}</div>
              </div>
              <div className="bg-vaporwave-card/50 p-4 rounded-lg">
                <div className="text-lg font-medium text-vaporwave-pink">Advanced (76-100)</div>
                <div className="text-2xl font-bold">{stats.experienceLevels.advanced}</div>
              </div>
            </div>
          </div>
        )}

        {/* Project Interests */}
        {stats && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-vaporwave-cyan mb-4">Project Interests</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(stats.projectInterests).map(([interest, count]) => (
                <div key={interest} className="bg-vaporwave-card/50 p-4 rounded-lg">
                  <div className="text-lg font-medium capitalize">{interest}</div>
                  <div className="text-2xl font-bold text-vaporwave-cyan">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="card">
          <h2 className="text-xl font-semibold text-vaporwave-cyan mb-6">Community Members</h2>
          
          {members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No members found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-vaporwave-cyan/20">
                    <th className="text-left py-3 px-4 text-vaporwave-cyan">Name</th>
                    <th className="text-left py-3 px-4 text-vaporwave-cyan">Email</th>
                    <th className="text-left py-3 px-4 text-vaporwave-cyan">Experience</th>
                    <th className="text-left py-3 px-4 text-vaporwave-cyan">Project Interest</th>
                    <th className="text-left py-3 px-4 text-vaporwave-cyan">Status</th>
                    <th className="text-left py-3 px-4 text-vaporwave-cyan">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.id} className="border-b border-vaporwave-cyan/10 hover:bg-vaporwave-card/30">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-white">{member.name}</div>
                          {member.github_username && (
                            <div className="text-sm text-gray-400">@{member.github_username}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{member.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-vaporwave-card rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-vaporwave-pink to-vaporwave-cyan h-2 rounded-full"
                              style={{ width: `${member.experience_level}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{member.experience_level}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize text-gray-300">{member.project_interest}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : member.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {member.date_created ? new Date(member.date_created).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 