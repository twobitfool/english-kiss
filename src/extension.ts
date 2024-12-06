// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let verboseLogging = false;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Set the logging level based on whether the extension is in development mode
	verboseLogging = context.extensionMode === vscode.ExtensionMode.Development;

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	debug('Congratulations, your extension "english-kiss" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('english-kiss.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from english-kiss!');
	});

	context.subscriptions.push(disposable);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document.languageId !== 'plaintext') {
			return;
		}

		debug('onDidChangeTextDocument fired');
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}



function debug(...args: any[]) {
	if (verboseLogging) {
		console.log('DEBUG', new Date().valueOf(), args.join('\t'));
	}
}