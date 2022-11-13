import * as vscode from 'vscode';

import * as matchers from './matchers'

class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
    
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        let foldingRanges: vscode.ProviderResult<vscode.FoldingRange[]> = [];

        let downloadingSectionStartIdx: (number | undefined) = undefined
        let downloadingProgressLinesStartIdx: (number | undefined) = undefined
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

            if (downloadingSectionStartIdx === undefined && matchers.downloadingLineRegEx.test(lineText)) {
                downloadingSectionStartIdx = lineIdx
            } else if (downloadingSectionStartIdx !== undefined && !matchers.downloadingLineRegEx.test(lineText) && !matchers.downloadingProgressLineRegEx.test(lineText) && !matchers.whitespaceLineRegEx.test(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingSectionStartIdx,lineIdx-1));
                downloadingSectionStartIdx = undefined;
            }

            if (downloadingProgressLinesStartIdx === undefined && matchers.downloadingLineRegEx.test(lineText)) {
                // The first downloadingProgress section within an outer downloading section must start on the second line so it does not interfere with the outer downloading section
                downloadingProgressLinesStartIdx = Math.max(lineIdx, (downloadingSectionStartIdx || -1)+1);
            } else if (downloadingProgressLinesStartIdx !== undefined && !matchers.downloadingProgressLineRegEx.test(lineText) && !matchers.whitespaceLineRegEx.test(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingProgressLinesStartIdx,lineIdx-1));
                downloadingProgressLinesStartIdx = matchers.downloadingLineRegEx.test(lineText) ? lineIdx : undefined
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

        return foldingRanges;
    }

}

export function activate(context: vscode.ExtensionContext, selectors: vscode.DocumentSelector[]) {
    selectors.forEach(selector => 
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider(
                selector, new MavenLogFoldingRangeProvider()))
    );
}
