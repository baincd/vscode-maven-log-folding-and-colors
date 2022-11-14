import * as vscode from 'vscode';

export let downloadingLineRegEx: RegExp
export let downloadingProgressLineRegEx: RegExp
export let whitespaceLineRegEx: RegExp

export let debugLineStartRegEx: RegExp
export let debugLineRangeRegEx: RegExp

export let consoleLineRegEx: RegExp

export let topLevelStartRegEx: RegExp
export let secondLevelStartRegEx: RegExp
export let thirdLevelStartRegEx: RegExp
export let thirdLevelEndRegEx: RegExp


// [\w.-] => Maven identifier (repo id, group id, or artifact id)

const downloadingLinePattern = "(?:\\[INFO\\] )?Downloading from [\\w.-]*:"
const downloadingProgressLinePattern = "(?:\\[INFO\\] )?(?:Progress \\(\\d+\\): |Downloaded from [\\w.-]*:)"
const whitespaceLinePattern = "\\s*$"

const debugLineStartPattern = "(?:\\[DEBUG\\] )"
const debugLineRangePattern = "((?!\\[(?:INFO|WARNING|FATAL|ERROR)\\] )|\\[INFO\\] Error stacktraces are turned on.)"

const consoleLinePattern = "((?!\\[(?:INFO|WARNING|DEBUG|FATAL|ERROR)\\] )|\\[DEBUG\\]   )"


// Top Level Regions:
// [INFO] Reactor Build Order:
// [INFO] ---------------------< com.example:example-parent >---------------------
// [INFO] Reactor Summary for Example Parent 0.0.1-SNAPSHOT:
// [INFO] BUILD SUCCESS
const topLevelStartPattern = "\\[INFO\\] (?:Reactor Build Order:|-{2,}< [\\w.-]+:[\\w.-]+ >-{2,}|Reactor Summary(?: for.*|:)|BUILD (?:SUCCESS|FAILURE))$"

// Second Level Regions:
// [INFO] --- maven-clean-plugin:3.1.0:clean (default-clean) @ example-lib ---
const secondLevelStartPattern = "\\[INFO\\] --- [:\\w.-]+ \\([\\w.-]*\\) @ [\\w.-]+ ---$"

// Third level Regions:
// [INFO] Running com.example.exampleapp.ExampleAppApplicationTests
const thirdLevelStartPattern = "\\[INFO\\] Running [\\w.]*$"
// [INFO] Results:
const thirdLevelEndPattern =  "\\[INFO\\] Results:$"

function init() {
    const linePrefixPatternConfig = vscode.workspace.getConfiguration("maven-log-folding-and-colors").get("linePrefixPattern") as string;
    const linePrefixPattern = (linePrefixPatternConfig ? `^(?:${linePrefixPatternConfig})?` : "^")

    downloadingLineRegEx = new RegExp(linePrefixPattern + downloadingLinePattern)
    downloadingProgressLineRegEx = new RegExp(linePrefixPattern + downloadingProgressLinePattern)
    whitespaceLineRegEx = new RegExp(linePrefixPattern + whitespaceLinePattern)
    debugLineStartRegEx = new RegExp(linePrefixPattern + debugLineStartPattern)
    debugLineRangeRegEx = new RegExp(linePrefixPattern + debugLineRangePattern)
    consoleLineRegEx = new RegExp(linePrefixPattern + consoleLinePattern)
    topLevelStartRegEx = new RegExp(linePrefixPattern + topLevelStartPattern)
    secondLevelStartRegEx = new RegExp(linePrefixPattern + secondLevelStartPattern)
    thirdLevelStartRegEx = new RegExp(linePrefixPattern + thirdLevelStartPattern)
    thirdLevelEndRegEx = new RegExp(linePrefixPattern + thirdLevelEndPattern)
}

export function activate(context: vscode.ExtensionContext) {
    init()

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("maven-log-folding-and-colors.linePrefixPattern")) {
                init()
            }
        })
    )
}



