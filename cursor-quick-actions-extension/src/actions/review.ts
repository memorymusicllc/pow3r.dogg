import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { insertPromptIntoCursor } from '../utils/cursor-integration';

const execAsync = promisify(exec);

export class ReviewAction {
  public static async execute(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    const rootPath = workspaceFolder.uri.fsPath;

    // Check if git is available
    try {
      await execAsync('git --version', { cwd: rootPath });
    } catch {
      vscode.window.showErrorMessage('Git is not available. Code review requires git.');
      return;
    }

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating Code Review...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Collecting changed files...' });

      // Get git diff
      let diff = '';
      try {
        const { stdout } = await execAsync('git diff HEAD', { cwd: rootPath });
        diff = stdout;
      } catch (error) {
        // Try staged changes
        try {
          const { stdout } = await execAsync('git diff --cached', { cwd: rootPath });
          diff = stdout;
        } catch {
          // Try all files if no changes
          diff = 'No uncommitted changes found. Reviewing all files.';
        }
      }

      progress.report({ increment: 30, message: 'Analyzing code...' });

      // Get list of changed files
      let changedFiles: string[] = [];
      try {
        const { stdout } = await execAsync('git diff --name-only HEAD', { cwd: rootPath });
        changedFiles = stdout.split('\n').filter(f => f.trim());
      } catch {
        // Fallback: get all tracked files
        try {
          const { stdout } = await execAsync('git ls-files', { cwd: rootPath });
          changedFiles = stdout.split('\n').filter(f => f.trim()).slice(0, 20); // Limit to 20 files
        } catch {
          changedFiles = [];
        }
      }

      progress.report({ increment: 60, message: 'Generating review prompt...' });

      // Generate comprehensive review prompt
      const reviewPrompt = this.generateReviewPrompt(changedFiles, diff);

      progress.report({ increment: 90, message: 'Inserting into Cursor chat...' });

      // Insert into Cursor chat
      await insertPromptIntoCursor(reviewPrompt);

      progress.report({ increment: 100, message: 'Code review prompt ready' });

      vscode.window.showInformationMessage(
        `Code review prompt generated for ${changedFiles.length} files. Check Cursor chat.`,
        'Open Chat'
      );
    });
  }

  private static generateReviewPrompt(files: string[], diff: string): string {
    const fileList = files.length > 0 
      ? files.map(f => `- ${f}`).join('\n')
      : 'All project files';

    return `Please perform a detailed code review of the following changes:

## Files Changed (${files.length}):
${fileList}

## Code Changes:
\`\`\`diff
${diff.substring(0, 5000)}${diff.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

## Review Criteria:
1. **Code Quality**: Check for bugs, logic errors, edge cases
2. **Best Practices**: Verify adherence to language/framework best practices
3. **Performance**: Identify potential performance issues
4. **Security**: Check for security vulnerabilities
5. **Maintainability**: Assess code readability and maintainability
6. **Testing**: Verify test coverage and test quality
7. **Documentation**: Check if code is properly documented
8. **Compliance**: Verify compliance with project rules and standards

Please provide:
- A summary of findings
- Critical issues (if any)
- Suggestions for improvement
- Code examples for fixes (where applicable)
- Overall assessment and recommendations`;
  }
}


