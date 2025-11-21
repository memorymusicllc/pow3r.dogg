import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class OrganizeAction {
  public static async execute(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    const rootPath = workspaceFolder.uri.fsPath;
    
    // Read rules.md if it exists
    const rulesPath = path.join(rootPath, '.cursor', 'rules.md');
    let rules: string[] = [];
    if (fs.existsSync(rulesPath)) {
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      // Extract file patterns to remove from rules
      const summaryPatterns = [
        /COMPLETE[_\w]*\.md/gi,
        /[\w_]*_SUMMARY\.md/gi,
        /[\w_]*_STATUS\.md/gi,
        /[\w_]*_COMPLETE\.md/gi
      ];
      rules = rulesContent.split('\n').filter(line => 
        line.includes('summary') || line.includes('complete') || line.includes('status')
      );
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Organizing Repository...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Scanning files...' });

      // Find and remove summary files
      const filesToRemove: string[] = [];
      const summaryPatterns = [
        /^.*_COMPLETE\.md$/i,
        /^.*_SUMMARY\.md$/i,
        /^.*_STATUS\.md$/i,
        /^COMPLETE.*\.md$/i
      ];

      function scanDirectory(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip node_modules, .git, etc.
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          if (entry.isDirectory()) {
            scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            // Check if file matches summary patterns
            if (summaryPatterns.some(pattern => pattern.test(entry.name))) {
              filesToRemove.push(fullPath);
            }
          }
        }
      }

      scanDirectory(rootPath);
      progress.report({ increment: 30, message: `Found ${filesToRemove.length} files to remove` });

      // Remove files
      for (const file of filesToRemove) {
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.warn(`Failed to remove ${file}:`, error);
        }
      }
      progress.report({ increment: 50, message: 'Files removed' });

      // Update README.md
      const readmePath = path.join(rootPath, 'README.md');
      if (fs.existsSync(readmePath)) {
        // Generate updated README structure
        const structure = this.generateProjectStructure(rootPath);
        const readmeContent = this.updateReadme(readmePath, structure);
        fs.writeFileSync(readmePath, readmeContent, 'utf-8');
      }
      progress.report({ increment: 80, message: 'README updated' });

      // Clean up documentation
      const docsPath = path.join(rootPath, 'docs');
      if (fs.existsSync(docsPath)) {
        // Remove outdated docs (this is a simple implementation)
        // In a real scenario, you'd analyze doc timestamps and relevance
      }
      progress.report({ increment: 100, message: 'Repository organized' });

      const message = `Repository organized: Removed ${filesToRemove.length} summary files, updated README.md`;
      vscode.window.showInformationMessage(message);
    });
  }

  private static generateProjectStructure(rootPath: string): string {
    const structure: string[] = [];
    
    function scanDir(dir: string, prefix: string, depth: number = 0): void {
      if (depth > 3) return; // Limit depth
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
          .filter(entry => {
            // Skip hidden files and common ignore patterns
            return !entry.name.startsWith('.') && 
                   entry.name !== 'node_modules' &&
                   entry.name !== 'dist' &&
                   entry.name !== 'build';
          })
          .sort((a, b) => {
            // Directories first
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          });

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const isLast = i === entries.length - 1;
          const currentPrefix = isLast ? '└── ' : '├── ';
          const nextPrefix = isLast ? '    ' : '│   ';
          
          structure.push(`${prefix}${currentPrefix}${entry.name}`);
          
          if (entry.isDirectory()) {
            scanDir(path.join(dir, entry.name), prefix + nextPrefix, depth + 1);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }

    scanDir(rootPath, '', 0);
    return structure.join('\n');
  }

  private static updateReadme(readmePath: string, structure: string): string {
    let content = fs.readFileSync(readmePath, 'utf-8');
    
    // Find or create Project Structure section
    const structureHeader = '## Project Structure';
    const structureRegex = /## Project Structure[\s\S]*?(?=## |$)/;
    
    const newStructureSection = `${structureHeader}\n\n\`\`\`\n${structure}\n\`\`\`\n`;
    
    if (structureRegex.test(content)) {
      content = content.replace(structureRegex, newStructureSection);
    } else {
      // Append to end
      content += `\n\n${newStructureSection}`;
    }
    
    return content;
  }
}


