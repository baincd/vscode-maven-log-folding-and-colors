import * as vscode from 'vscode';

const downloadingLinesRegEx = /^(\[INFO\] )?Download(ing|ed) from \w*:/
const downloadingProgressLineRegEx = /^Progress \(\d+\): /
const whitespaceLineRegEx = /^\s*$/

class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
    
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        let foldingRanges: vscode.ProviderResult<vscode.FoldingRange[]> = [];

        let downloadingLinesStartIdx: (number | undefined) = undefined
        let downloadingProgressLinesStartIdx: (number | undefined) = undefined

        for (let lineIdx = 0; lineIdx < document.lineCount; lineIdx++) {
            const lineText = document.lineAt(lineIdx).text;

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

        return foldingRanges;
    }

}

export function activate(context: vscode.ExtensionContext) {
    const filenamePatterns = vscode.workspace.getConfiguration("maven-log-lang").get("filenamePatterns") as string[]

    filenamePatterns.forEach(p => 
        context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider(
                {pattern: p}, new MavenLogFoldingRangeProvider()))
    );
}
