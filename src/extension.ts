import * as vscode from 'vscode';

import * as matchers from './matchers'

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
            const lineText = document.lineAt(lineIdx).text.replace(linePrefixRegEx, '');

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

            if (downloadingLinesStartIdx === undefined && matchers.downloadingLinesRegEx.test(lineText)) {
                downloadingLinesStartIdx = lineIdx
            } else if (downloadingLinesStartIdx !== undefined && !matchers.downloadingLinesRegEx.test(lineText) && !matchers.downloadingProgressLineRegEx.test(lineText) && !matchers.whitespaceLineRegEx.test(lineText)) {
                foldingRanges.push(new vscode.FoldingRange(downloadingLinesStartIdx,lineIdx));
                downloadingLinesStartIdx = undefined;
            }

            if (downloadingProgressLinesStartIdx === undefined && matchers.downloadingProgressLineRegEx.test(lineText)) {
                downloadingProgressLinesStartIdx = lineIdx
            } else if (downloadingProgressLinesStartIdx !== undefined && !matchers.downloadingProgressLineRegEx.test(lineText) && !matchers.whitespaceLineRegEx.test(lineText)) {
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
