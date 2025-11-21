import * as vscode from 'vscode';

/**
 * Insert prompt into Cursor chat input
 * Uses multiple fallback methods to ensure compatibility
 */
export async function insertPromptIntoCursor(prompt: string): Promise<void> {
  // Method 1: Try to find and focus Cursor chat input
  // This is a best-effort approach since Cursor's API may not be directly accessible
  
  // Method 2: Copy to clipboard and show notification
  await vscode.env.clipboard.writeText(prompt);
  
  // Method 3: Try to insert into active editor (if chat is in editor)
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const position = activeEditor.selection.active;
    activeEditor.edit(editBuilder => {
      editBuilder.insert(position, prompt);
    });
    vscode.window.showInformationMessage('Prompt inserted into editor. If using Cursor chat, paste from clipboard.');
    return;
  }

  // Method 4: Show notification with instructions
  vscode.window.showInformationMessage(
    'Prompt copied to clipboard. Paste it into Cursor chat input.',
    'OK'
  );
}


