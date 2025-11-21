import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { emitComponentEvent } from '../utils/observability';
import {
  UserGroupIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  permissions: string[];
  lastActive?: string;
  createdAt: string;
}

const COMPONENT_ID = 'team-member-mi';

export default function TeamMemberMI() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    const startTime = Date.now();
    emitComponentEvent(COMPONENT_ID, 'data_load_start', {});
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; members: TeamMember[] }>(
        '/admin/team-members'
      );
      
      if (response.success && response.members) {
        setMembers(response.members);
        emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
          count: response.members.length,
          duration: Date.now() - startTime,
        });
      } else {
        setMembers([]);
        emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
          count: 0,
          duration: Date.now() - startTime,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      (member.phone && member.phone.includes(query))
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'text-red-400';
      case 'investigator':
        return 'text-blue-400';
      case 'viewer':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="w-full max-w-[520px] mx-auto">
      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <UserGroupIcon className="w-6 h-6 text-true-black-accent theme-light:text-light-accent theme-glass:text-glass-accent" />
          <h2 className="text-xl sm:text-2xl font-header font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
            Team Members
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg px-4 py-2 text-true-black-text theme-light:text-light-text theme-glass:text-glass-text placeholder:text-true-black-text-muted theme-light:placeholder:text-light-text-muted theme-glass:placeholder:text-glass-text-muted focus:outline-none focus:ring-2 focus:ring-true-black-accent theme-light:focus:ring-light-accent theme-glass:focus:ring-glass-accent"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
            Loading team members...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            Error loading team members: {error}
          </div>
        )}

        {/* Members List */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                No team members found
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-4 space-y-3"
                >
                  {/* Member Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text truncate">
                          {member.name}
                        </h3>
                        <p className={`text-sm font-medium ${getRoleColor(member.role)}`}>
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </div>

                  {/* Member Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                      <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                        <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                      <IdentificationIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">ID: {member.id}</span>
                    </div>
                    {member.lastActive && (
                      <div className="flex items-center gap-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                        <ShieldCheckIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs">
                          Last active: {new Date(member.lastActive).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Permissions */}
                  {member.permissions && member.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-true-black-border theme-light:border-light-border theme-glass:border-glass-border">
                      {member.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 bg-true-black-accent/20 theme-light:bg-light-accent/20 theme-glass:bg-glass-accent/20 text-true-black-accent theme-light:text-light-accent theme-glass:text-glass-accent rounded text-xs font-medium"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Stats */}
        {!loading && !error && filteredMembers.length > 0 && (
          <div className="pt-4 border-t border-true-black-border theme-light:border-light-border theme-glass:border-glass-border">
            <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
              Showing {filteredMembers.length} of {members.length} team member
              {members.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

