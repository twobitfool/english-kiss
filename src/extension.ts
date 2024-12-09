// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// @ts-ignore
import rs from 'text-readability';

// Define a type for the text blocks that we will be working with
interface TextBlock {
  text: string;
  grade: number;
  start: vscode.Position;
  end: vscode.Position;
}

// Flag for whether to log debug messages (will be enabled automatically)
let verboseLogging = false;

// Array of TextEditorDecorationType objects applied to the text
let decorationTypes: vscode.TextEditorDecorationType[] = [];

// The minimum and maximum grade levels to highlight (as difficult to read)
const minGrade = 9;
const maxGrade = 16; // and anything above

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Set the logging level based on whether the extension is in development mode
  verboseLogging = context.extensionMode === vscode.ExtensionMode.Development;

  initializeDecorationTypes();

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

  const document = editor.document;
  const textBlocks = extractSentences(document);

  textBlocks.forEach(block => {
    debug(`Grade ${block.grade}: ${block.text}`);
  });

  decorationTypes.forEach(d => {
    // Find the blocks that match the grade level of the decoration
    const grade = decorationTypes.indexOf(d) + minGrade;
    const blocks = textBlocks.filter(block => block.grade === grade);

    // Apply the decoration to the text blocks
    const decorations = blocks.map(block => {
      return {
        range: new vscode.Range(block.start, block.end),
        hoverMessage: `This text is hard to read -- grade level: ${block.grade}. \n\nTry smaller words and shorter sentences.\n\n(english-kiss extension)`,
      };
    });

    editor.setDecorations(d, decorations);
  });

}


// Pre-generate decoration types for each grade level, so we can quickly apply
// the correct decoration to the text without recalculating the styles each
// time. This also helps to avoid flicker when updating the document, because
// we the old decorations are removed and the new ones are added in one step.
function initializeDecorationTypes() {
  const useBlur = true;
  const useBackground = true;

  for(let grade = minGrade; grade <= maxGrade; grade++) {
    const percent = (grade - minGrade) / (maxGrade - minGrade);
    const blur = pickValueFromRange(percent, 0.5, 1.5);
    const blurInPixels = `${Math.round(blur * 10) / 10}px`;
    const backgroundOpacity = pickValueFromRange(percent, 0.1, 0.4);


    const style = {
      textDecoration: '',
      backgroundColor: '',
    };

    if (useBlur) {
      // NOTE: The blur filter won't work unless prefixed with a semicolon :P
      style['textDecoration'] = `;filter:blur(${blurInPixels});`;
    }

    if (useBackground) {
      style['backgroundColor'] = `rgba(255,0,0,${backgroundOpacity})`;
    }

    const decorationType = vscode.window.createTextEditorDecorationType(style);

    decorationTypes.push(decorationType);
  }
}


function pickValueFromRange(percent: number, min: number, max: number): number {
  const value = min + percent * (max - min);
  return Math.min(max, Math.max(min, value));
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
      grade: gradeLevel(text),
      start: startPosition,
      end:   endPosition,
    });
  }

  return sentences;
}


// Determine if a string is complex enough to be highlighted
function gradeLevel(text: string): number {
  const words = text.split(/\s+/);
  const wordCount = words.length;

  // The `text-readability` library scores can get wonky with shorter text
  if (wordCount < 5) {
    return 1;
  }

  //----------------------------------------------------------------------------
  // NOTE: The `textStandard` function is supposed to use a blend of readability
  // scores to determine the grade level of the text. However, it seems to be
  // less than great (in my quick tests).
  //
  // TODO: Find a more accurate way to determine the grade level of the text
  //----------------------------------------------------------------------------

  const RETURN_GRADE_LEVEL = true;

  const grade = Math.floor(rs.textStandard(text, RETURN_GRADE_LEVEL));
  const cappedGrade = Math.min(maxGrade, grade);
  return cappedGrade;
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
