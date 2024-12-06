// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// @ts-ignore
import rs from 'text-readability';

// Define a type for the text blocks that we will be working with
interface TextBlock {
  text: string;
  complex: boolean;
  start: vscode.Position;
  end: vscode.Position;
}

// Flag for whether to log debug messages (will be enabled automatically)
let verboseLogging = false;

// Create a decoration to "highlight" the overly complex text
let complexTextDecoration: vscode.TextEditorDecorationType;



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Set the logging level based on whether the extension is in development mode
  verboseLogging = context.extensionMode === vscode.ExtensionMode.Development;


  complexTextDecoration = vscode.window.createTextEditorDecorationType({

    textDecoration: [
      'underline wavy orange;', // Squiggly underline to encourage hover
      'filter: blur(1px);',     // Make it (literally) harder to read ;)
    ].join(' '),

    // Make "complex" text brighter to counter the blur effect
    // color: 'rgba(255,255,255,0.9)',

    // Add another style change to make the "complex" text stand out even more
    // fontStyle: 'italic',

    // Add a background color to the "complex" text
    backgroundColor: 'rgba(255,0,0,0.1)' // Highlight color
  });


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

  // Apply the highlighting to the currently active editor (after activation)
  if (vscode.window.activeTextEditor) {
    highlightComplexText(vscode.window.activeTextEditor);
  }
}



// This function is called whenever the text in a document changes
function onDocumentChange(event: vscode.TextDocumentChangeEvent) {
  if (event.document.languageId !== 'plaintext') {
    return;
  }

  highlightComplexText(vscode.window.activeTextEditor!);
}




function highlightComplexText(editor: vscode.TextEditor): void {
  if (editor.document.languageId !== 'plaintext') {
    return;
  }

  debug('highlightComplexText');

  // Identify the hard-to-read text
  const document = editor.document;
  const textBlocks = extractSentences(document);
  const badBlocks = textBlocks.filter(block => block.complex);


  textBlocks.forEach(block => {
    debug([block.complex, block.text.substring(0, 120)]);
  });


  const decorations = badBlocks.map(block => {
    return {
      range: new vscode.Range(block.start, block.end),
      hoverMessage: `This is hard to read (overly complex). \n\nTry smaller words and shorter sentences.`,
    };
  });

  editor.setDecorations(complexTextDecoration, decorations);
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
      complex: isComplex(text),
      start: startPosition,
      end:   endPosition,
    });
  }

  return sentences;
}


// Determine if a string is complex enough to be highlighted
function isComplex(text: string): boolean {
  const words = text.split(/\s+/);
  const wordCount = words.length;

  // The `text-readability` library scores can get wonky with shorter text
  if (wordCount < 5) {
    return false;
  }

  // TODO: Make this configurable by the user (but put it behind a UI that hides
  // the messy details about grade levels and readability scores)
  const MAX_GRADE_LEVEL = 14;
  const RETURN_GRADE_LEVEL = true;

  //----------------------------------------------------------------------------
  // NOTE: The `textStandard` function is supposed to use a blend of readability
  // scores to determine the grade level of the text. However, it seems to be
  // less than great (in my quick tests).
  //----------------------------------------------------------------------------

  // TODO: Find a more accurate way to determine the grade level of the text
  const gradeLevel = rs.textStandard(text, RETURN_GRADE_LEVEL);
  return gradeLevel > MAX_GRADE_LEVEL;
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
