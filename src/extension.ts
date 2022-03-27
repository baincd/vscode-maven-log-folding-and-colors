import * as vscode from 'vscode';

const downloadingLinesRegEx = /^(\[INFO\] )?Download(ing|ed) from \w*:/
const downloadingProgressLineRegEx = /^Progress \(\d+\): /
const whitespaceLineRegEx = /^\s*$/

// Top Level Regions:
// [INFO] Reactor Build Order:
// [INFO] ---------------------< com.example:example-parent >---------------------
// [INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:
// [INFO] BUILD SUCCESS
const topLevelStartRegEx = /\[INFO\] (Reactor Build Order:|-{2,}< [\w\.:-]+ >-{2,}|Reactor Summary for.*|BUILD (SUCCESS|FAILURE))$/

class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;
    
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
        let foldingRanges: vscode.ProviderResult<vscode.FoldingRange[]> = [];

        let downloadingLinesStartIdx: (number | undefined) = undefined
        let downloadingProgressLinesStartIdx: (number | undefined) = undefined
        let topLevelStartIdx: (number | undefined) = undefined

        for (let lineIdx = 0; lineIdx < document.lineCount; lineIdx++) {
            const lineText = document.lineAt(lineIdx).text;

            if (topLevelStartRegEx.test(lineText)) {
                if (topLevelStartIdx !== undefined) {
                    foldingRanges.push(new vscode.FoldingRange(topLevelStartIdx,lineIdx-1));
                }
                topLevelStartIdx = lineIdx;
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
