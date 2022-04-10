import * as vscode from 'vscode';

import * as foldingProvider from './foldingProvider'

export function activate(context: vscode.ExtensionContext) {
    const filePatterns = vscode.workspace.getConfiguration("maven-log-folding-and-colors").get("filePatterns") as string[]
    const docSelectors = filePatterns.map<vscode.DocumentSelector>(p => {return {pattern: p}})

    foldingProvider.activate(context, docSelectors)
}
