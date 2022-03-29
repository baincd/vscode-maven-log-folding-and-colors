import * as vscode from 'vscode';

const ansiEscapeCodeRegEx = /\x1b\[[0-9;]*m/g

// [\w\-\.] => Maven identifier (repo id, group id, artifact id)

const downloadingLinesRegEx = /^(\[INFO\] )?Download(ing|ed) from [\w\-\.]*:/
const downloadingProgressLineRegEx = /^Progress \(\d+\): /
const whitespaceLineRegEx = /^\s*$/

// Top Level Regions:
// [INFO] Reactor Build Order:
// [INFO] ---------------------< com.example:example-parent >---------------------
// [INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:
// [INFO] BUILD SUCCESS
const topLevelStartRegEx = /^\[INFO\] (Reactor Build Order:|-{2,}< [\w\-\.]+:[\w\-\.]+ >-{2,}|Reactor Summary for.*|BUILD (SUCCESS|FAILURE))$/

// Second Level Regions:
// [INFO] --- maven-clean-plugin:3.1.0:clean (default-clean) @ example-lib ---
const secondLevelStartRegEx = /^\[INFO\] --- [\w\-\.:]+ \([\w\-\.]*\) @ [\w\-\.]+ ---$/

// Third level Regions:
// [INFO] Running com.example.exampleapp.ExampleAppApplicationTests
const thirdLevelStartRegEx = /^\[INFO\] Running [\w\.]*$/
// [INFO] Results:
const thirdLevelEndRegEx =  /^\[INFO\] Results:$/

class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
    
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        const linePrefixRegEx = getLinePrefixRegEx();

        let foldingRanges: vscode.ProviderResult<vscode.FoldingRange[]> = [];

        let downloadingLinesStartIdx: (number | undefined) = undefined
        let downloadingProgressLinesStartIdx: (number | undefined) = undefined
        let topLevelStartIdx: (number | undefined) = undefined
        let secondLevelStartIdx: (number | undefined) = undefined
        let thirdLevelStartIdx: (number | undefined) = undefined

        for (let lineIdx = 0; lineIdx < document.lineCount && !token.isCancellationRequested; lineIdx++) {
            const lineText = document.lineAt(lineIdx).text.replace(linePrefixRegEx, '').replace(ansiEscapeCodeRegEx, '');

            if (topLevelStartRegEx.test(lineText)) {
                if (topLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(topLevelStartIdx,lineIdx-1));
                }
                if (secondLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(secondLevelStartIdx,lineIdx-1));
                }
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                topLevelStartIdx = lineIdx;
                secondLevelStartIdx = undefined;
                thirdLevelStartIdx = undefined;
            } else if (secondLevelStartRegEx.test(lineText)) {
                if (secondLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(secondLevelStartIdx,lineIdx-1));
                }
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                secondLevelStartIdx = lineIdx;
                thirdLevelStartIdx = undefined;
            } else if (thirdLevelStartRegEx.test(lineText)) {
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                thirdLevelStartIdx = lineIdx;
            } else if (thirdLevelEndRegEx.test(lineText)) {
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                thirdLevelStartIdx = undefined;
            }

            if (downloadingLinesStartIdx === undefined && downloadingLinesRegEx.test(lineText)) {
                downloadingLinesStartIdx = lineIdx
            } else if (downloadingLinesStartIdx !== undefined && !downloadingLinesRegEx.test(lineText) && !downloadingProgressLineRegEx.test(lineText) && !whitespaceLineRegEx.test(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingLinesStartIdx,lineIdx));
                downloadingLinesStartIdx = undefined;
            }

            if (downloadingProgressLinesStartIdx === undefined && downloadingProgressLineRegEx.test(lineText)) {
                downloadingProgressLinesStartIdx = lineIdx
            } else if (downloadingProgressLinesStartIdx !== undefined && !downloadingProgressLineRegEx.test(lineText) && !whitespaceLineRegEx.test(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingProgressLinesStartIdx,lineIdx-1));
                downloadingProgressLinesStartIdx = undefined;
            }

        }

        if (topLevelStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(topLevelStartIdx,document.lineCount-1));
        }
        if (secondLevelStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(secondLevelStartIdx,document.lineCount-1));
        }
        if (thirdLevelStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,document.lineCount-1));
        }
        if (downloadingLinesStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(downloadingLinesStartIdx,document.lineCount-1));
        }
        if (downloadingProgressLinesStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(downloadingProgressLinesStartIdx,document.lineCount-1));
        }

        return foldingRanges;
    }

}

function getLinePrefixRegEx(): RegExp {
    const linePrefixPattern = "^" + vscode.workspace.getConfiguration("maven-log-folding-and-colors").get("linePrefixPattern") as string;
    return new RegExp(linePrefixPattern);
}

export function activate(context: vscode.ExtensionContext) {
    const filePatterns = vscode.workspace.getConfiguration("maven-log-folding-and-colors").get("filePatterns") as string[]

    filePatterns.forEach(p => 
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider(
                {pattern: p}, new MavenLogFoldingRangeProvider()))
    );
}
