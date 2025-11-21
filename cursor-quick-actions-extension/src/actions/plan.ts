import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { MCPClient } from '../mcp/client';

export interface XMAPNode {
  id: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number; z?: number };
}

export interface XMAPEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface XMAPBlueprint {
  version: string;
  repository: string;
  nodes: XMAPNode[];
  edges: XMAPEdge[];
  metadata: {
    generated: string;
    plan: string;
  };
}

export class PlanAction {
  public static async execute(workspaceFolder: vscode.WorkspaceFolder, mcpClient: MCPClient): Promise<void> {
    const rootPath = workspaceFolder.uri.fsPath;
    const repoName = path.basename(rootPath);

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating XMAP Blueprint...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Analyzing repository structure...' });

      // Analyze repository structure
      const structure = this.analyzeRepository(rootPath);
      progress.report({ increment: 30, message: 'Generating nodes and edges...' });

      // Generate nodes and edges
      const { nodes, edges } = this.generateXMAPStructure(structure, rootPath);
      progress.report({ increment: 60, message: 'Creating implementation plan...' });

      // Generate AI plan (simplified - in production would use AI)
      const plan = this.generatePlan(structure);
      progress.report({ increment: 90, message: 'Writing XMAP.json...' });

      // Create XMAP blueprint
      const blueprint: XMAPBlueprint = {
        version: '1.0',
        repository: repoName,
        nodes,
        edges,
        metadata: {
          generated: new Date().toISOString(),
          plan
        }
      };

      // Write to file
      const xmapPath = path.join(rootPath, 'XMAP.json');
      fs.writeFileSync(xmapPath, JSON.stringify(blueprint, null, 2), 'utf-8');

      progress.report({ increment: 100, message: 'XMAP.json created' });

      // Notify via MCP if available
      try {
        await mcpClient.notify('xmap_generated', {
          repository: repoName,
          nodeCount: nodes.length,
          edgeCount: edges.length
        });
      } catch (error) {
        console.warn('Failed to notify MCP:', error);
      }

      vscode.window.showInformationMessage(
        `XMAP.json blueprint created with ${nodes.length} nodes and ${edges.length} edges`,
        'Open File'
      ).then(selection => {
        if (selection === 'Open File') {
          vscode.window.showTextDocument(vscode.Uri.file(xmapPath));
        }
      });
    });
  }

  private static analyzeRepository(rootPath: string): Map<string, string[]> {
    const structure = new Map<string, string[]>();
    
    function scanDir(dir: string, relativePath: string = ''): void {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
          .filter(entry => {
            return !entry.name.startsWith('.') && 
                   entry.name !== 'node_modules' &&
                   entry.name !== 'dist' &&
                   entry.name !== 'build' &&
                   entry.name !== 'out';
          });

        const files: string[] = [];
        const dirs: string[] = [];

        for (const entry of entries) {
          if (entry.isDirectory()) {
            dirs.push(entry.name);
            scanDir(path.join(dir, entry.name), path.join(relativePath, entry.name));
          } else {
            files.push(entry.name);
          }
        }

        if (files.length > 0 || dirs.length > 0) {
          structure.set(relativePath || '.', [...dirs, ...files]);
        }
      } catch (error) {
        // Ignore permission errors
      }
    }

    scanDir(rootPath);
    return structure;
  }

  private static generateXMAPStructure(
    structure: Map<string, string[]>,
    rootPath: string
  ): { nodes: XMAPNode[]; edges: XMAPEdge[] } {
    const nodes: XMAPNode[] = [];
    const edges: XMAPEdge[] = [];
    const nodeMap = new Map<string, string>();

    let nodeId = 0;
    let x = 0;
    let y = 0;
    const spacing = 200;

    // Create root node
    const rootId = `node-${nodeId++}`;
    nodes.push({
      id: rootId,
      type: 'root',
      label: path.basename(rootPath),
      metadata: { path: '.' },
      position: { x: 0, y: 0 }
    });
    nodeMap.set('.', rootId);

    // Create nodes for directories and important files
    for (const [dirPath, entries] of structure.entries()) {
      const parentId = nodeMap.get(dirPath) || rootId;
      x += spacing;
      y = 0;

      for (const entry of entries) {
        const entryPath = dirPath === '.' ? entry : path.join(dirPath, entry);
        const entryId = `node-${nodeId++}`;
        
        // Determine type
        let type = 'file';
        if (fs.existsSync(path.join(rootPath, entryPath))) {
          const stat = fs.statSync(path.join(rootPath, entryPath));
          type = stat.isDirectory() ? 'directory' : this.getFileType(entry);
        }

        nodes.push({
          id: entryId,
          type,
          label: entry,
          metadata: { path: entryPath },
          position: { x, y }
        });

        // Create edge from parent
        edges.push({
          id: `edge-${edges.length}`,
          source: parentId,
          target: entryId,
          type: 'contains'
        });

        if (type === 'directory') {
          nodeMap.set(entryPath, entryId);
        }

        y += spacing;
      }
    }

    return { nodes, edges };
  }

  private static getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const typeMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'react-component',
      '.jsx': 'react-component',
      '.json': 'config',
      '.md': 'documentation',
      '.yaml': 'config',
      '.yml': 'config',
      '.html': 'markup',
      '.css': 'stylesheet'
    };
    return typeMap[ext] || 'file';
  }

  private static generatePlan(structure: Map<string, string[]>): string {
    const components: string[] = [];
    const services: string[] = [];
    const configs: string[] = [];

    for (const [path, entries] of structure.entries()) {
      for (const entry of entries) {
        const fullPath = path === '.' ? entry : `${path}/${entry}`;
        if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          if (path.includes('component') || path.includes('ui')) {
            components.push(fullPath);
          } else if (path.includes('service') || path.includes('api')) {
            services.push(fullPath);
          }
        } else if (entry.endsWith('.json') || entry.endsWith('.yaml') || entry.endsWith('.yml')) {
          configs.push(fullPath);
        }
      }
    }

    return `# Implementation Plan

## Overview
This repository contains ${structure.size} directories with various components, services, and configuration files.

## Components (${components.length})
${components.map(c => `- ${c}`).join('\n') || 'None identified'}

## Services (${services.length})
${services.map(s => `- ${s}`).join('\n') || 'None identified'}

## Configuration Files (${configs.length})
${configs.map(c => `- ${c}`).join('\n') || 'None identified'}

## Recommended Actions
1. Review component architecture and identify dependencies
2. Analyze service interactions and API contracts
3. Verify configuration management and environment setup
4. Check test coverage and add tests where needed
5. Update documentation to reflect current structure
6. Implement CI/CD pipeline if not present
7. Set up monitoring and logging
8. Review security practices and dependencies`;
  }
}


