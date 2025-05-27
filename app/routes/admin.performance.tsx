import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getCacheStats } from "~/lib/cache.server";
import { getDatabaseStats, generateDatabaseReport } from "~/lib/database-optimizer.server";
import { getEmailQueueStats, generateEmailQueueReport } from "~/lib/email-queue.server";
import { getBackupStatus, generateBackupReport } from "~/lib/backup-recovery.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Gather performance metrics from all systems
    const [cacheStats, databaseStats, emailQueueStats, backupStats] = await Promise.all([
      getCacheStats(),
      getDatabaseStats(),
      getEmailQueueStats(),
      getBackupStatus()
    ]);

    return json({
      cacheStats,
      databaseStats,
      emailQueueStats,
      backupStats,
      reports: {
        database: generateDatabaseReport(),
        emailQueue: generateEmailQueueReport(),
        backup: generateBackupReport()
      }
    });
  } catch (error) {
    return json({
      error: 'Failed to load performance data',
      cacheStats: {},
      databaseStats: {},
      emailQueueStats: {},
      backupStats: {},
      reports: {}
    });
  }
}

export default function AdminPerformance() {
  const data = useLoaderData<typeof loader>();
  
  // Handle error case
  if ('error' in data && data.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold glow-text mb-4">Performance Dashboard</h1>
            <p className="text-red-400">
              {data.error}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const { cacheStats, databaseStats, emailQueueStats, backupStats, reports } = data;
  
  // Provide defaults for potentially empty objects
  const dbStats = {
    totalQueries: 0,
    averageDuration: 0,
    slowQueries: 0,
    errorRate: 0,
    topSlowQueries: [],
    ...databaseStats
  };
  
  const queueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    retrying: 0,
    throughput: 0,
    ...emailQueueStats
  };
  
  const bkpStats = {
    totalBackups: 0,
    successfulBackups: 0,
    failedBackups: 0,
    totalSize: 0,
    oldestBackup: undefined,
    newestBackup: undefined,
    averageSize: 0,
    successRate: 0,
    ...backupStats
  };

  const reportData = {
    database: '',
    emailQueue: '',
    backup: '',
    ...reports
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaporwave-dark via-purple-900/20 to-vaporwave-dark p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold glow-text mb-4">Performance Dashboard</h1>
          <p className="text-gray-400">
            Real-time performance monitoring and optimization insights
          </p>
        </div>

        {/* Performance Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Cache Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4 flex items-center">
              🚀 Cache Performance
            </h3>
            <div className="space-y-3">
              {Object.entries(cacheStats).map(([name, stats]: [string, any]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{name}</span>
                    <span className="text-xs text-gray-400">{stats.size} items</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-400">Hits: {stats.hits}</span>
                    <span className="text-red-400">Misses: {stats.misses}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-vaporwave-cyan to-vaporwave-pink h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round(stats.hitRate * 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-center text-gray-400">
                    {(stats.hitRate * 100).toFixed(1)}% hit rate
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Database Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4 flex items-center">
              🗃️ Database Performance
            </h3>
            <div className="space-y-3">
               <div className="flex justify-between">
                 <span className="text-gray-400">Total Queries</span>
                 <span className="text-white font-medium">{dbStats.totalQueries}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Avg Duration</span>
                 <span className="text-white font-medium">{dbStats.averageDuration}ms</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Slow Queries</span>
                 <span className={dbStats.slowQueries > 0 ? "text-red-400" : "text-green-400"}>
                   {dbStats.slowQueries}
                 </span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Error Rate</span>
                 <span className={dbStats.errorRate > 0.05 ? "text-red-400" : "text-green-400"}>
                   {(dbStats.errorRate * 100).toFixed(2)}%
                 </span>
               </div>
               <div className="w-full bg-gray-700 rounded-full h-2">
                 <div 
                   className="bg-gradient-to-r from-green-400 to-yellow-400 h-2 rounded-full transition-all duration-300"
                   style={{ width: `${Math.max(0, 100 - dbStats.averageDuration / 10)}%` }}
                 ></div>
               </div>
            </div>
          </div>

          {/* Email Queue Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4 flex items-center">
              📧 Email Queue
            </h3>
            <div className="space-y-3">
               <div className="flex justify-between">
                 <span className="text-gray-400">Pending</span>
                 <span className="text-yellow-400 font-medium">{queueStats.pending}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Processing</span>
                 <span className="text-blue-400 font-medium">{queueStats.processing}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Completed</span>
                 <span className="text-green-400 font-medium">{queueStats.completed}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Failed</span>
                 <span className="text-red-400 font-medium">{queueStats.failed}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">Throughput</span>
                 <span className="text-vaporwave-cyan font-medium">{queueStats.throughput}/min</span>
               </div>
            </div>
          </div>

          {/* Backup Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-vaporwave-cyan mb-4 flex items-center">
              💾 Backup Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Backups</span>
                <span className="text-white font-medium">{bkpStats.totalBackups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Successful</span>
                <span className="text-green-400 font-medium">{bkpStats.successfulBackups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400 font-medium">{bkpStats.failedBackups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate</span>
                <span className="text-vaporwave-cyan font-medium">
                  {(bkpStats.successRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Size</span>
                <span className="text-white font-medium">
                  {(bkpStats.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Database Report */}
          <div className="card">
            <h3 className="text-xl font-semibold text-vaporwave-cyan mb-4">Database Performance Report</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {reportData.database}
              </pre>
            </div>
          </div>

          {/* Email Queue Report */}
          <div className="card">
            <h3 className="text-xl font-semibold text-vaporwave-cyan mb-4">Email Queue Report</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {reportData.emailQueue}
              </pre>
            </div>
          </div>
        </div>

        {/* Backup Report */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-xl font-semibold text-vaporwave-cyan mb-4">Backup & Recovery Report</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {reportData.backup}
              </pre>
            </div>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl mb-2">
              {dbStats.errorRate < 0.01 ? '🟢' : dbStats.errorRate < 0.05 ? '🟡' : '🔴'}
            </div>
            <h4 className="text-lg font-semibold text-vaporwave-cyan mb-2">Database Health</h4>
            <p className="text-gray-400 text-sm">
              {dbStats.errorRate < 0.01 ? 'Excellent' : 
               dbStats.errorRate < 0.05 ? 'Good' : 'Needs Attention'}
            </p>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-2">
              {queueStats.failed < 5 ? '🟢' : queueStats.failed < 20 ? '🟡' : '🔴'}
            </div>
            <h4 className="text-lg font-semibold text-vaporwave-cyan mb-2">Email System</h4>
            <p className="text-gray-400 text-sm">
              {queueStats.failed < 5 ? 'Operating Normally' : 
               queueStats.failed < 20 ? 'Minor Issues' : 'Attention Required'}
            </p>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-2">
              {bkpStats.successRate > 0.9 ? '🟢' : bkpStats.successRate > 0.7 ? '🟡' : '🔴'}
            </div>
            <h4 className="text-lg font-semibold text-vaporwave-cyan mb-2">Backup System</h4>
            <p className="text-gray-400 text-sm">
              {bkpStats.successRate > 0.9 ? 'Reliable' : 
               bkpStats.successRate > 0.7 ? 'Mostly Reliable' : 'Needs Improvement'}
            </p>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mt-8">
          <div className="card">
            <h3 className="text-xl font-semibold text-vaporwave-cyan mb-4">Performance Optimization Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-vaporwave-pink mb-3">🔧 Active Optimizations</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>✅ Multi-tier memory caching system</li>
                  <li>✅ Database query performance monitoring</li>
                  <li>✅ Email queue with priority handling</li>
                  <li>✅ Automated backup scheduling</li>
                  <li>✅ Connection pooling and retry logic</li>
                  <li>✅ Rate limiting and security headers</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-vaporwave-pink mb-3">💡 Recommendations</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>🔍 Monitor slow queries and optimize indexes</li>
                  <li>📊 Set up alerts for high error rates</li>
                  <li>💾 Regularly test backup restoration</li>
                  <li>🚀 Consider CDN for static assets</li>
                  <li>📧 Monitor email deliverability rates</li>
                  <li>⚡ Optimize bundle size and lazy loading</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 