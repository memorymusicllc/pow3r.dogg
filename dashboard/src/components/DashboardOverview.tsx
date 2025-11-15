export default function DashboardOverview() {
  return (
    <div>
      <h2 className="font-header text-3xl mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder cards */}
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">Active Attackers</h3>
          <p className="text-4xl font-bold">0</p>
        </div>
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">Threat Score</h3>
          <p className="text-4xl font-bold">0.0</p>
        </div>
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6">
          <h3 className="font-header text-xl mb-2">Evidence Items</h3>
          <p className="text-4xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}

