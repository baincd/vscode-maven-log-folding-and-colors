import * as vscode from 'vscode';

import * as matchers from './matchers'
import * as foldingProvider from './foldingProvider'

export function activate(context: vscode.ExtensionContext) {
    const filePatterns = vscode.workspace.getConfiguration("maven-log-folding-and-colors").get("filePatterns") as string[]
    const docSelectors = filePatterns.map<vscode.DocumentSelector>(p => {return {pattern: p}})

    matchers.activate(context)
    foldingProvider.activate(context, docSelectors)
}
