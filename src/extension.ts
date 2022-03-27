import * as vscode from 'vscode';


class MavenLogFoldingRangeProvider implements vscode.FoldingRangeProvider {
    onDidChangeFoldingRanges?: vscode.Event<void> | undefined;


    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {

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
