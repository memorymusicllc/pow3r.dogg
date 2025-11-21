/**
 * Team Member Database Management
 * 
 * CRUD operations for team members
 */

import type { Env } from '../types';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  permissions: string[];
  lastActive?: number;
  createdAt: number;
}

export interface TeamMemberQuery {
  email?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'pending';
  limit?: number;
  offset?: number;
}

export class TeamMemberDatabase {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Query team members with filters
   */
  async queryMembers(query: TeamMemberQuery): Promise<TeamMember[]> {
    try {
      // Try D1 first
      if (this.env.DEFENDER_DB) {
        let sql = 'SELECT * FROM team_members WHERE 1=1';
        const bindings: unknown[] = [];

        if (query.email) {
          sql += ' AND email = ?';
          bindings.push(query.email);
        }
        if (query.role) {
          sql += ' AND role = ?';
          bindings.push(query.role);
        }
        if (query.status) {
          sql += ' AND status = ?';
          bindings.push(query.status);
        }

        sql += ' ORDER BY created_at DESC';
        if (query.limit) {
          sql += ' LIMIT ?';
          bindings.push(query.limit);
        }
        if (query.offset) {
          sql += ' OFFSET ?';
          bindings.push(query.offset);
        }

        const result = await this.env.DEFENDER_DB.prepare(sql).bind(...bindings).all();
        return (result.results || []).map((row: any) => this.mapRowToMember(row));
      }
    } catch (error) {
      console.warn('D1 query failed, using KV fallback:', error);
    }

    // KV fallback - scan all team member keys
    const members: TeamMember[] = [];
    const kv = this.env.DEFENDER_FORGE;
    const prefix = 'team_member:';
    let cursor: string | undefined;

    do {
      const list = await kv.list({ prefix, cursor });
      for (const key of list.keys) {
        try {
          const value = await kv.get(key.name);
          if (value) {
            const member = JSON.parse(value) as TeamMember;
            // Apply filters
            if (query.email && member.email !== query.email) continue;
            if (query.role && member.role !== query.role) continue;
            if (query.status && member.status !== query.status) continue;
            members.push(member);
          }
        } catch (err) {
          console.warn(`Failed to parse team member ${key.name}:`, err);
        }
      }
      cursor = list.list_complete ? undefined : (list as { cursor?: string }).cursor;
    } while (cursor);

    // Sort and limit
    members.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (query.limit) {
      return members.slice(query.offset || 0, (query.offset || 0) + query.limit);
    }
    if (query.offset) {
      return members.slice(query.offset);
    }
    return members;
  }

  /**
   * Get team member by ID
   */
  async getMember(id: string): Promise<TeamMember | null> {
    try {
      // Try D1 first
      if (this.env.DEFENDER_DB) {
        const result = await this.env.DEFENDER_DB.prepare(
          'SELECT * FROM team_members WHERE id = ?'
        )
          .bind(id)
          .first();

        if (result) {
          return this.mapRowToMember(result as any);
        }
      }
    } catch (error) {
      console.warn('D1 get failed, using KV fallback:', error);
    }

    // KV fallback
    const kv = this.env.DEFENDER_FORGE;
    const value = await kv.get(`team_member:${id}`);
    if (value) {
      return JSON.parse(value) as TeamMember;
    }
    return null;
  }

  /**
   * Create team member
   */
  async createMember(member: Omit<TeamMember, 'id' | 'createdAt'>): Promise<TeamMember> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newMember: TeamMember = {
      ...member,
      id,
      createdAt: now,
    };

    // Store in KV
    await this.env.DEFENDER_FORGE.put(
      `team_member:${id}`,
      JSON.stringify(newMember)
    );

    // Try D1
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB.prepare(
          'INSERT INTO team_members (id, name, email, phone, role, status, permissions, last_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            newMember.id,
            newMember.name,
            newMember.email,
            newMember.phone || null,
            newMember.role,
            newMember.status,
            JSON.stringify(newMember.permissions),
            newMember.lastActive || null,
            newMember.createdAt
          )
          .run();
      }
    } catch (error) {
      console.warn('D1 team member insert failed, using KV only:', error);
    }

    return newMember;
  }

  /**
   * Update team member
   */
  async updateMember(id: string, updates: Partial<Omit<TeamMember, 'id' | 'createdAt'>>): Promise<TeamMember | null> {
    const existing = await this.getMember(id);
    if (!existing) {
      return null;
    }

    const updated: TeamMember = {
      ...existing,
      ...updates,
    };

    // Update in KV
    await this.env.DEFENDER_FORGE.put(
      `team_member:${id}`,
      JSON.stringify(updated)
    );

    // Try D1
    try {
      if (this.env.DEFENDER_DB) {
        const setParts: string[] = [];
        const bindings: unknown[] = [];

        if (updates.name !== undefined) {
          setParts.push('name = ?');
          bindings.push(updates.name);
        }
        if (updates.email !== undefined) {
          setParts.push('email = ?');
          bindings.push(updates.email);
        }
        if (updates.phone !== undefined) {
          setParts.push('phone = ?');
          bindings.push(updates.phone || null);
        }
        if (updates.role !== undefined) {
          setParts.push('role = ?');
          bindings.push(updates.role);
        }
        if (updates.status !== undefined) {
          setParts.push('status = ?');
          bindings.push(updates.status);
        }
        if (updates.permissions !== undefined) {
          setParts.push('permissions = ?');
          bindings.push(JSON.stringify(updates.permissions));
        }
        if (updates.lastActive !== undefined) {
          setParts.push('last_active = ?');
          bindings.push(updates.lastActive || null);
        }

        if (setParts.length > 0) {
          bindings.push(id);
          await this.env.DEFENDER_DB.prepare(
            `UPDATE team_members SET ${setParts.join(', ')} WHERE id = ?`
          )
            .bind(...bindings)
            .run();
        }
      }
    } catch (error) {
      console.warn('D1 team member update failed, using KV only:', error);
    }

    return updated;
  }

  /**
   * Delete team member
   */
  async deleteMember(id: string): Promise<boolean> {
    // Delete from KV
    await this.env.DEFENDER_FORGE.delete(`team_member:${id}`);

    // Try D1
    try {
      if (this.env.DEFENDER_DB) {
        await this.env.DEFENDER_DB.prepare('DELETE FROM team_members WHERE id = ?')
          .bind(id)
          .run();
      }
    } catch (error) {
      console.warn('D1 team member delete failed, using KV only:', error);
    }

    return true;
  }

  /**
   * Map database row to TeamMember
   */
  private mapRowToMember(row: any): TeamMember {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      role: row.role,
      status: row.status as 'active' | 'inactive' | 'pending',
      permissions: row.permissions ? JSON.parse(row.permissions) : [],
      lastActive: row.last_active || undefined,
      createdAt: row.created_at || 0,
    };
  }
}

