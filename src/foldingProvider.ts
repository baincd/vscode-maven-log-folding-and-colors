import * as vscode from 'vscode';

import * as matchers from './matchers'

class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
    
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        let foldingRanges: vscode.ProviderResult<vscode.FoldingRange[]> = [];

        let downloadingSectionStartIdx: (number | undefined) = undefined
        let downloadingProgressLinesStartIdx: (number | undefined) = undefined
        let debugLinesStartIdx: (number | undefined) = undefined
        let consoleLinesStartIdx: (number | undefined) = undefined
        let errorLinesStartIdx: (number | undefined) = undefined

        let topLevelStartIdx: (number | undefined) = undefined
        let secondLevelStartIdx: (number | undefined) = undefined
        let thirdLevelStartIdx: (number | undefined) = undefined

        for (let lineIdx = 0; lineIdx < document.lineCount && !token.isCancellationRequested; lineIdx++) {
            const lineText = document.lineAt(lineIdx).text;

            if (matchers.topLevelStartRegEx.test(lineText)) {
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
            } else if (matchers.secondLevelStartRegEx.test(lineText)) {
                if (secondLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(secondLevelStartIdx,lineIdx-1));
                }
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                secondLevelStartIdx = lineIdx;
                thirdLevelStartIdx = undefined;
            } else if (matchers.thirdLevelStartRegEx.test(lineText)) {
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                thirdLevelStartIdx = lineIdx;
            } else if (matchers.thirdLevelEndRegEx.test(lineText)) {
                if (thirdLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(thirdLevelStartIdx,lineIdx-1));
                }
                thirdLevelStartIdx = undefined;
            }


            if (downloadingSectionStartIdx === undefined && isDownloadingSectionStart(lineText)) {
                downloadingSectionStartIdx = lineIdx
            } else if (downloadingSectionStartIdx !== undefined && !isDownloadingSectionLine(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingSectionStartIdx,lineIdx-1));
                downloadingSectionStartIdx = undefined;
            }

            if (downloadingProgressLinesStartIdx === undefined && isDownloadingArtifactSectionStart(lineText)) {
                // The first downloadingProgress section within an outer downloading section must start on the second line so it does not interfere with the outer downloading section
                downloadingProgressLinesStartIdx = Math.max(lineIdx, (downloadingSectionStartIdx || -1)+1);
            } else if (downloadingProgressLinesStartIdx !== undefined && !isDownloadingArtifactSectionLine(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingProgressLinesStartIdx,lineIdx-1));
                downloadingProgressLinesStartIdx = matchers.downloadingLineRegEx.test(lineText) ? lineIdx : undefined
            }

            if (debugLinesStartIdx === undefined && isDebugSectionStart(lineText)) {
                debugLinesStartIdx = lineIdx;
            } else if (debugLinesStartIdx !== undefined && !isDebugSectionLine(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(debugLinesStartIdx,lineIdx-1));
                debugLinesStartIdx = undefined
            }

            if (consoleLinesStartIdx === undefined && isConsoleLine(lineText)) {
                consoleLinesStartIdx = lineIdx;
            } else if (consoleLinesStartIdx !== undefined && !isConsoleLine(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(consoleLinesStartIdx,lineIdx-1));
                consoleLinesStartIdx = undefined
            }

            if (errorLinesStartIdx === undefined && isErrorLine(lineText)) {
                errorLinesStartIdx = lineIdx;
            } else if (errorLinesStartIdx !== undefined && !isErrorLine(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(errorLinesStartIdx,lineIdx-1));
                errorLinesStartIdx = undefined
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
        if (downloadingSectionStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(downloadingSectionStartIdx,document.lineCount-1));
        }
        if (downloadingProgressLinesStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(downloadingProgressLinesStartIdx,document.lineCount-1));
        }
        if (debugLinesStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(debugLinesStartIdx,document.lineCount-1));
        }
        if (consoleLinesStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(consoleLinesStartIdx,document.lineCount-1));
        }
        if (errorLinesStartIdx !== undefined) {
            foldingRanges.push(new vscode.FoldingRange(errorLinesStartIdx,document.lineCount-1));
        }

        return foldingRanges;
    }

}

function isDownloadingSectionStart(lineText: string) {
    return matchers.downloadingLineRegEx.test(lineText);
}

function isDownloadingSectionLine(lineText: string) {
    return isDownloadingSectionStart(lineText)
        || isDownloadingArtifactSectionLine(lineText);
}

function isDownloadingArtifactSectionStart(lineText: string) {
    return matchers.downloadingLineRegEx.test(lineText);
}

function isDownloadingArtifactSectionLine(lineText: string) {
    return matchers.downloadingProgressLineRegEx.test(lineText)
        || matchers.whitespaceLineRegEx.test(lineText)
        || isDebugSectionLine(lineText);
}

function isDebugSectionStart(lineText: string) {
    return matchers.debugLineStartRegEx.test(lineText);
}

function isDebugSectionLine(lineText: string) {
    return matchers.debugLineRangeRegEx.test(lineText) // Regex implicitly includes debugSectionStart lines, whitespace lines
        && !matchers.downloadingLineRegEx.test(lineText) 
        && !matchers.downloadingProgressLineRegEx.test(lineText);
}

function isConsoleLine(lineText: string) {
    return matchers.consoleLineRegEx.test(lineText)
        && !matchers.downloadingLineRegEx.test(lineText)
        && !matchers.downloadingProgressLineRegEx.test(lineText)
}

function isErrorLine(lineText: string) {
    return matchers.errorLineRegEx.test(lineText)
        || isConsoleLine(lineText)
}

export function activate(context: vscode.ExtensionContext, selectors: vscode.DocumentSelector[]) {
    selectors.forEach(selector => 
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider(
                selector, new MavenLogFoldingRangeProvider()))
    );
}

