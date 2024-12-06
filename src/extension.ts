// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Define a type for the text blocks that we will be working with
interface TextBlock {
	text:    string;
	start:   vscode.Position;
	end:     vscode.Position;
}

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

	// This event fires very frequently, so we throttle to be a better citizen
	vscode.workspace.onDidChangeTextDocument(
		throttle(onDocumentChange, 100)
	);
}



// This function is called whenever the text in a document changes
function onDocumentChange(event: vscode.TextDocumentChangeEvent) {
	if (event.document.languageId !== 'plaintext') {
		return;
	}

	const textBlocks = extractSentences(event.document);
	debug('Text blocks:', textBlocks.length);
	debug('First block:', textBlocks[0]);
	debug('Last block:', textBlocks[textBlocks.length - 1]);
}



// This method is called when your extension is deactivated
export function deactivate() {}



function debug(...args: any[]) {
	if (verboseLogging) {
		const expandedArgs = args.map(arg => {
			if (typeof arg === 'object') {
				return JSON.stringify(arg);
			}
			return arg;
		});
		const time = new Date();
		console.log('\n🐝 DEBUG', time.toLocaleTimeString(), `(${time.getMilliseconds()})` );
		console.log('  ', expandedArgs.join(' '));
	}
}


function extractSentences(document: vscode.TextDocument): TextBlock[] {
	// Get the full text of the document
	const text = document.getText();

	// Regex to match sentences, including a line at the end of the file
	const sentenceRegex = /[^.!?\n]+[.!?\n]*|[^.!?\n]+$/g;

	const sentences: TextBlock[] = [];

	let match;
	while ((match = sentenceRegex.exec(text)) !== null) {
		const text = match[0].trim();

		// Skip empty sentences
		if (text.length === 0) {
			continue;
		}

		// Find the start and end position of the sentence
		const startPosition = document.positionAt(match.index);
		const endPosition = document.positionAt(match.index + match[0].length);

		sentences.push({
			text,
			start: startPosition,
			end:   endPosition,
		});
	}

	return sentences;
}


// Run a function no more than once every `delay` milliseconds
function throttle(fn: Function, delay: number) {
	let timeout: NodeJS.Timeout | null = null;
	let lastArgs: any[] | null = null;

	const invoke = () => {
		if (lastArgs) {
			fn(...lastArgs);
			lastArgs = null;
			timeout = setTimeout(invoke, delay);
		} else {
			timeout = null;
		}
	};

	return (...args: any[]) => {
		lastArgs = args;
		if (!timeout) {
			invoke();
		}
	};
}
